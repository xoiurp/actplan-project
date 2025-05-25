import argparse
import subprocess
import sys
import os
import re
import json
from io import StringIO
import requests # For downloading the PDF from URL
import uuid # Moved from the bottom of the script

# Attempt to import pdfminer.six and install if not found
try:
    from pdfminer.high_level import extract_text_to_fp
    from pdfminer.layout import LAParams
except ImportError:
    print("pdfminer.six not found. Attempting to install...", file=sys.stderr)
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfminer.six"])
        print("Installation complete. Attempting to import pdfminer.six again.", file=sys.stderr)
        from pdfminer.high_level import extract_text_to_fp
        from pdfminer.layout import LAParams
    except subprocess.CalledProcessError as e:
        print(f"Error installing pdfminer.six: {e}", file=sys.stderr)
        sys.exit(1)
    except ImportError:
        print("Failed to import pdfminer.six after installation.", file=sys.stderr)
        sys.exit(1)

def download_pdf_from_url(pdf_url, local_pdf_path="temp_darf.pdf"):
    print(f"Attempting to download PDF from {pdf_url}...", file=sys.stderr)
    try:
        response = requests.get(pdf_url, stream=True, timeout=30)
        response.raise_for_status()
        with open(local_pdf_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"PDF downloaded successfully to {local_pdf_path}", file=sys.stderr)
        return local_pdf_path
    except requests.exceptions.RequestException as e:
        print(f"Error downloading PDF from URL: {e}", file=sys.stderr)
        return None

def extract_text_from_pdf(pdf_path):
    test_mode_file = os.environ.get('TEST_MODE_INPUT_FILE')
    if test_mode_file and pdf_path == test_mode_file:
        print(f"TEST MODE: Reading from {test_mode_file}", file=sys.stderr)
        if os.path.exists(test_mode_file):
            try:
                with open(test_mode_file, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                print(f"TEST MODE Error: Could not read {test_mode_file}: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            print(f"TEST MODE Error: {test_mode_file} not found.", file=sys.stderr)
            sys.exit(1)

    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}", file=sys.stderr)
        return None

    output_string = StringIO()
    try:
        with open(pdf_path, 'rb') as fin:
            extract_text_to_fp(fin, output_string, laparams=LAParams(), output_type='text', codec="")
    except Exception as e:
        print(f"Error during PDF text extraction: {e}", file=sys.stderr)
        return None
    return output_string.getvalue()

def safe_float(value_str):
    if value_str is None: return 0.0
    try:
        return float(value_str.replace('.', '').replace(',', '.'))
    except (ValueError, AttributeError):
        return 0.0

def format_date_darf(date_str):
    if not date_str: return None
    # Try to match DD/MM/AAAA or DDMMYYYY
    match = re.match(r'(\d{2})[/\.]?(\d{2})[/\.]?(\d{4})', date_str)
    if match:
        return f"{match.group(1)}/{match.group(2)}/{match.group(3)}"
    match_nodiv = re.match(r'(\d{2})(\d{2})(\d{4})', date_str)
    if match_nodiv:
        return f"{match_nodiv.group(1)}/{match_nodiv.group(2)}/{match_nodiv.group(3)}"
    return date_str # Return original if no common format matches

def get_field_value(text, field_number, field_name_regex):
    # Regex to capture the value after the field number and name.
    # It looks for the field number (e.g., "02"), then any characters (field name),
    # then captures the rest of the line or until the next numbered field.
    # This is tricky because field values can be multi-line or layout can vary.
    # A simpler approach for now: capture text after field name on the same line.
    pattern = re.compile(rf"{field_number}\s*-\s*{field_name_regex}\s*(.+?)(?=\n\d{{2}}\s*-|\n\n|$)", re.IGNORECASE | re.DOTALL)
    match = pattern.search(text)
    if match:
        return match.group(1).replace('\n', ' ').strip()
    
    # Fallback for simpler cases where value is just after "field_name:"
    pattern_simple = re.compile(rf"{field_name_regex}\s*:\s*(.+)", re.IGNORECASE)
    match_simple = pattern_simple.search(text)
    if match_simple:
        return match_simple.group(1).strip()

    # Fallback for values that might be on the line immediately following the label
    # e.g. 01 - NOME / TELEFONE
    #      JOHN DOE
    pattern_next_line = re.compile(rf"{field_number}\s*-\s*{field_name_regex}(?:\s*\n|\s+)([^\n]+)", re.IGNORECASE)
    match_next_line = pattern_next_line.search(text)
    if match_next_line:
        return match_next_line.group(1).strip()
        
    return None

def parse_darf_data(text, source_file):
    data = {
        "taxpayer_id": None,
        "taxpayer_name": None,
        "assessment_period": None,
        "tax_type_code": None,
        "reference_number": None,
        "payment_due_date": None,
        "payment_date": None,
        "payment_principal_amount": 0.0,
        "payment_penalty_amount": 0.0,
        "payment_interest_amount": 0.0,
        "payment_total_amount": 0.0,
        "payment_authentication": None,
        "source_file": source_file
    }

    if not text:
        return data

    # 01 - Nome / Telefone (Extract Name primarily)
    # The regex for field_name should be flexible for variations.
    data["taxpayer_name"] = get_field_value(text, "01", r"Nome\s*(?:/\s*Telefone)?")
    
    # 02 - Período de Apuração
    assessment_period_str = get_field_value(text, "02", r"Período\s*de\s*Apuração")
    data["assessment_period"] = format_date_darf(assessment_period_str)

    # 03 - Número do CPF ou CNPJ
    data["taxpayer_id"] = get_field_value(text, "03", r"Número\s*do\s*CPF\s*ou\s*CNPJ")

    # 04 - Código da Receita
    data["tax_type_code"] = get_field_value(text, "04", r"Código\s*da\s*Receita")

    # 05 - Número de Referência
    data["reference_number"] = get_field_value(text, "05", r"Número\s*de\s*Referência")

    # 06 - Data de Vencimento
    due_date_str = get_field_value(text, "06", r"Data\s*de\s*Vencimento")
    data["payment_due_date"] = format_date_darf(due_date_str)

    # 07 - Valor Principal
    principal_str = get_field_value(text, "07", r"Valor\s*(?:do\s*Principal|Principal)")
    data["payment_principal_amount"] = safe_float(principal_str)
    
    # 08 - Valor da Multa
    penalty_str = get_field_value(text, "08", r"Valor\s*da\s*Multa")
    data["payment_penalty_amount"] = safe_float(penalty_str)

    # 09 - Valor dos Juros / Encargos
    interest_str = get_field_value(text, "09", r"Valor\s*dos\s*Juros\s*(?:/\s*Encargos)?")
    data["payment_interest_amount"] = safe_float(interest_str)

    # 10 - Valor Total
    total_str = get_field_value(text, "10", r"Valor\s*Total")
    data["payment_total_amount"] = safe_float(total_str)

    # 11 - Data de Pagamento (Harder, often in authentication string or not explicitly labeled)
    # Look for dates near "Autenticação Bancária" or common payment date patterns.
    # This is a very basic attempt.
    auth_block_match = re.search(r"Autenticação\s*Bancária\s*[:\n\s]*(.+)", text, re.IGNORECASE | re.DOTALL)
    auth_text = ""
    if auth_block_match:
        auth_text = auth_block_match.group(1).split('\n')[0].strip() # Get first line of auth
        data["payment_authentication"] = auth_text
        
        # Try to find a date within the authentication or nearby
        date_in_auth_match = re.search(r'(\d{2}/\d{2}/\d{4})', auth_text)
        if date_in_auth_match:
            data["payment_date"] = format_date_darf(date_in_auth_match.group(1))
    
    # If payment date is still None, try a broader search for potential payment dates
    if data["payment_date"] is None:
        # Look for dates that are not the due date or assessment period date.
        # This is highly heuristic.
        all_dates = re.findall(r'\d{2}/\d{2}/\d{4}', text)
        potential_payment_dates = [d for d in all_dates if d != data["payment_due_date"] and d != data["assessment_period"]]
        if potential_payment_dates: # Could pick the latest or first, or based on position.
            # This is too unreliable without more context. For now, leave it if not in auth.
            pass


    # If total is zero but principal is not, sometimes total is sum of all fields
    if data["payment_total_amount"] == 0.0 and data["payment_principal_amount"] > 0.0:
        data["payment_total_amount"] = round(data["payment_principal_amount"] + \
                                        data["payment_penalty_amount"] + \
                                        data["payment_interest_amount"], 2)
    
    return data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract structured data from a DARF PDF.")
    parser.add_argument("pdf_input", help="URL or local path of the PDF file (or test .txt file in test mode).")
    args = parser.parse_args()

    source_filename = os.path.basename(args.pdf_input) # Get filename for source_file field

    test_mode_input_env = os.environ.get('TEST_MODE_INPUT_FILE')
    input_path_for_extraction = args.pdf_input
    
    if test_mode_input_env:
        print(f"MAIN: TEST MODE active. Using TEST_MODE_INPUT_FILE ('{test_mode_input_env}') as input.", file=sys.stderr)
        # In test mode, pdf_input argument IS the path to the test file.
        input_path_for_extraction = test_mode_input_env 
        # Make sure the script is called with the test file path as pdf_input for consistency
        if args.pdf_input != test_mode_input_env:
             print(f"Warning: pdf_input arg '{args.pdf_input}' differs from TEST_MODE_INPUT_FILE '{test_mode_input_env}'. Using env var.", file=sys.stderr)
    elif args.pdf_input.startswith('http://') or args.pdf_input.startswith('https://'):
        print(f"MAIN: Input recognized as URL: {args.pdf_input}", file=sys.stderr)
        temp_downloaded_pdf_path = "temp_invoice_" + str(uuid.uuid4()) + ".pdf"
        input_path_for_extraction = download_pdf_from_url(args.pdf_input, temp_downloaded_pdf_path)
        if not input_path_for_extraction: # Download failed
            print(json.dumps([parse_darf_data(None, source_filename)])) # Output empty JSON
            sys.exit(1) # Exit after outputting JSON
        # file_downloaded_by_script = True # This var is not used later for cleanup in this script version
    else: # Local file path
        print(f"MAIN: Input recognized as local file path: {args.pdf_input}", file=sys.stderr)
        if not os.path.exists(args.pdf_input):
            print(f"MAIN: Error: Local PDF file not found at {args.pdf_input}", file=sys.stderr)
            print(json.dumps([parse_darf_data(None, source_filename)]))
            sys.exit(1)
    
    print(f"Processing file: {input_path_for_extraction}", file=sys.stderr)
    full_text = extract_text_from_pdf(input_path_for_extraction)

    if not full_text:
        print("No text extracted from PDF.", file=sys.stderr)
        parsed_data = parse_darf_data(None, source_filename) # Get default structure
    else:
        parsed_data = parse_darf_data(full_text, source_filename)

    # Output the structured data as a JSON list containing a single dictionary
    print(json.dumps([parsed_data], indent=2, ensure_ascii=False))

    # Clean up downloaded file if it was a URL
    if 'temp_downloaded_pdf_path' in locals() and os.path.exists(temp_downloaded_pdf_path):
        try:
            os.remove(temp_downloaded_pdf_path)
            print(f"Cleaned up downloaded file: {temp_downloaded_pdf_path}", file=sys.stderr)
        except OSError as e:
            print(f"Error deleting temporary downloaded file {temp_downloaded_pdf_path}: {e}", file=sys.stderr)
