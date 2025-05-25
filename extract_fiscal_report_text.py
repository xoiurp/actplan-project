import argparse
import subprocess
import sys
import os
import re
import json
from io import StringIO
from datetime import datetime

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

def extract_text_from_pdf(pdf_path):
    # Test mode: If TEST_MODE_INPUT_FILE is set, read from it directly.
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

    # Original PDF processing logic
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}", file=sys.stderr)
        # Download logic (kept for completeness, though API usually provides the file)
        print("Attempting to download the PDF file...", file=sys.stderr)
        url = "https://github.com/xoiurp/actplan-project/blob/main/RelatorioSituacaoFiscal-03367118000140-20250416.pdf?raw=true"
        try:
            subprocess.check_call(["curl", "-L", "-o", pdf_path, url], timeout=30)
            print(f"PDF file downloaded successfully to {pdf_path}", file=sys.stderr)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            print(f"Error downloading PDF file using curl: {e}", file=sys.stderr)
            print("Attempting download with wget...", file=sys.stderr)
            try:
                subprocess.check_call(["wget", "-O", pdf_path, url], timeout=30)
                print(f"PDF file downloaded successfully to {pdf_path} using wget.", file=sys.stderr)
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e_wget:
                print(f"Error downloading PDF file using wget: {e_wget}", file=sys.stderr)
                sys.exit(1)
        if not os.path.exists(pdf_path):
             print(f"Error: PDF file still not found at {pdf_path} after attempting download.", file=sys.stderr)
             sys.exit(1)

    output_string = StringIO()
    try:
        with open(pdf_path, 'rb') as fin:
            extract_text_to_fp(fin, output_string, laparams=LAParams(), output_type='text', codec="")
    except Exception as e:
        print(f"Error during PDF text extraction: {e}", file=sys.stderr)
        sys.exit(1)
    return output_string.getvalue()

def parse_taxpayer_info(text):
    taxpayer_id = None
    taxpayer_name = None
    
    # CNPJ: XX.XXX.XXX/XXXX-XX or CPF: XXX.XXX.XXX-XX
    cnpj_match = re.search(r'CNPJ:\s*(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})', text)
    if cnpj_match:
        taxpayer_id = cnpj_match.group(1)
    else:
        cpf_match = re.search(r'CPF:\s*(\d{3}\.\d{3}\.\d{3}-\d{2})', text)
        if cpf_match:
            taxpayer_id = cpf_match.group(1)

    # Try to find name after CNPJ or "Nome:" or "Razão Social:"
    # Example: CNPJ: 03.367.118/0001-40 - CONSTRUTORA SINARCO LTDA
    if taxpayer_id:
        name_match = re.search(rf'{re.escape(taxpayer_id)}\s*-\s*(.+?)\n', text)
        if name_match:
            taxpayer_name = name_match.group(1).strip()
    if not taxpayer_name:
        name_match_razao = re.search(r'(?:Razão Social|Nome Empresarial):\s*(.+?)\n', text, re.IGNORECASE)
        if name_match_razao:
            taxpayer_name = name_match_razao.group(1).strip()
    
    return taxpayer_id, taxpayer_name

def parse_assessment_period(text):
    # Example: "Período de Apuração: DD/MM/AAAA a DD/MM/AAAA" or specific date "PA DD/MM/AAAA"
    pa_match = re.search(r'Período de Apuração:\s*(\d{2}/\d{2}/\d{4}(?:\s*a\s*\d{2}/\d{2}/\d{4})?)', text, re.IGNORECASE)
    if pa_match:
        return pa_match.group(1)
    
    pa_match_short = re.search(r'PA\s*(\d{2}/\d{4})', text, re.IGNORECASE) # e.g. PA 03/2025
    if pa_match_short:
        return pa_match_short.group(1)
    return None

def safe_float(value_str):
    if value_str is None:
        return None
    try:
        # Normalize Brazilian currency format (e.g., "1.234,56" to "1234.56")
        return float(value_str.replace('.', '').replace(',', '.'))
    except (ValueError, AttributeError):
        return None

def format_date(date_str):
    if not date_str: return None
    try:
        # Assuming input like "DD/MM/YYYY" or "DDMMAAAA" from regex
        date_str_cleaned = date_str.replace('/', '')
        if len(date_str_cleaned) == 8:
            return f"{date_str_cleaned[0:2]}/{date_str_cleaned[2:4]}/{date_str_cleaned[4:8]}"
    except:
        pass # Fallback to original if formatting fails
    return date_str # Return original if not in expected format

def parse_tax_obligations(text, taxpayer_id, taxpayer_name, assessment_period, source_file):
    obligations = []
    
    # Regex patterns need to be carefully crafted based on actual PDF text structure.
    # This is a generic starting point.
    # Example section header: "Débitos na Natureza Tributária"
    # Example table row: (Código) (Descrição) (Período) (Vencimento) (Principal) (Multa) (Juros) (Total)
    # This will be very document specific.
    # Let's try to find blocks of text that represent individual tax entries.
    # A common pattern might be a code (like 8109), a description, a period, a due date, and values.
    
    # Simplified Regex: Look for lines with possible amounts and a date that could be a due date.
    # Pattern: (Tax Description) (Optional PA) (Due Date DD/MM/YYYY) (Value)
    # This needs significant refinement based on the actual PDF content.
    # Example: "8109 PIS - FATURAMENTO PA 03/2025 Vencimento 25/04/2025 Principal 179.012,84"
    # The RelatorioSituacaoFiscal is complex. It has sections like:
    # - "Relação de Débitos Apurados em Auto de Infração e Imposição de Multa"
    # - "Débitos Encaminhados para Inscrição em Dívida Ativa da União"
    # - "Débitos Parcelados"
    # - "Débitos Lançados de Ofício Pendentes de Inscrição em Dívida Ativa da União"
    # - "Débitos Declarados Pendentes de Inscrição em Dívida Ativa da União"
    
    # For now, let's make a generic attempt; this will need debugging with actual PDF text.
    # Focus on lines that have a clear "Vencimento" and "Principal" or "Valor"
    # Regex for a line that might contain tax info:
    # (\w+\s*-?\s*[\w\s-]+) # Tax Type Description (very broad)
    # \s*(?:PA\s*\d{2}/\d{4})? # Optional Assessment Period like PA 03/2025
    # \s*(?:Vencimento\s*(\d{2}/\d{2}/\d{4}))? # Due Date
    # \s*(?:Principal|Valor)\s*([\d.,]+) # Tax Amount
    
    # A more robust approach would be to identify sections and then parse lines within them.
    # Let's use a simpler line-by-line approach for now and refine.
    
    lines = text.split('\n')
    current_tax_type = None
    current_pa = assessment_period # Default to overall PA

    # Look for common tax names and associated values/dates
    # This is highly heuristic and will need refinement with actual PDF text
    # Common tax names: IRPJ, CSLL, PIS, COFINS, IPI, ICMS, ISS, INSS
    # Keywords for values: "Principal", "Valor do Débito", "Valor Original"
    # Keywords for due dates: "Vencimento", "Data Venc."

    # Example from a DARF (simpler structure, but for ideas):
    # 8109 PIS - FATURAMENTO PA 03/2025 Vencimento 25/04/2025 Principal 179.012,84 ... Total 192.027,06
    # This type of line is easier to parse. The "Relatório de Situação Fiscal" is often more narrative or has complex tables.

    # Let's assume a section "Débitos Declarados Pendentes de Inscrição em Dívida Ativa da União"
    # And lines like:
    # Tributo: IRPJ
    # PA: 31/12/2022
    # Vencimento: 30/04/2023
    # Saldo Devedor Originário: 1.234,56
    
    # Trying a block-based approach for sections like "Débitos Declarados Pendentes..."
    # This is very speculative without the actual PDF text structure in front of me.
    # For now, this function will likely return an empty list or partially parsed data.
    # The actual PDF's text structure is key.

    # Let's assume lines with "Tributo:", "PA:", "Vencimento:", "Saldo Devedor Originário:"
    # This is a common pattern in some detailed reports.
    
    potential_blocks = text.split("Tributo:") # Split by a common field indicator
    for block in potential_blocks[1:]: # Skip first part before any "Tributo:"
        tax_type_match = re.search(r'^\s*(.+?)\s*\n', block) # Tax type is the first line after "Tributo:"
        pa_match = re.search(r'PA:\s*(\d{2}/\d{2}/\d{4}|\d{2}/\d{4})', block)
        due_date_match = re.search(r'(?:Vencimento|Vcto):\s*(\d{2}/\d{2}/\d{4})', block)
        # Amount can be "Saldo Devedor Originário", "Valor Original", "Principal"
        amount_match = re.search(r'(?:Saldo Devedor Originário|Valor Original|Principal):\s*([\d.,]+)', block)
        base_value_match = re.search(r'(?:Valor Base de Cálculo|Base de Cálculo):\s*([\d.,]+)', block)

        if tax_type_match and due_date_match and amount_match:
            tax_type = tax_type_match.group(1).strip()
            # If PA specific to this tax is found, use it, else use overall assessment_period
            specific_pa = pa_match.group(1) if pa_match else assessment_period
            
            obligation = {
                "taxpayer_id": taxpayer_id,
                "taxpayer_name": taxpayer_name,
                "assessment_period": specific_pa,
                "tax_type_description": tax_type,
                "fiscal_due_date": format_date(due_date_match.group(1)),
                "fiscal_calculated_tax_amount": safe_float(amount_match.group(1)),
                "fiscal_base_value": safe_float(base_value_match.group(1)) if base_value_match else None,
                "source_file": source_file
            }
            obligations.append(obligation)
            
    # If no obligations found with the block strategy, return empty or try another strategy.
    # The above is highly dependent on a specific structure.

    return obligations

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract structured data from a Fiscal Report PDF.")
    parser.add_argument("pdf_path", help="Path to the PDF file (or test .txt file in test mode).")
    args = parser.parse_args()

    source_filename = os.path.basename(args.pdf_path)

    # In test mode, pdf_path argument will be the path to TEST_MODE_INPUT_FILE
    test_mode_input_env = os.environ.get('TEST_MODE_INPUT_FILE')
    input_path_for_extraction = test_mode_input_env if test_mode_input_env and args.pdf_path == test_mode_input_env else args.pdf_path
    
    # All print statements intended for script output (JSON) should go to stdout.
    # All diagnostic/logging prints should go to stderr.
    print(f"Processing file: {input_path_for_extraction}", file=sys.stderr)

    full_text = extract_text_from_pdf(input_path_for_extraction)

    if not full_text:
        print(json.dumps([])) # Output empty JSON list if no text
        sys.exit(0)

    taxpayer_id, taxpayer_name = parse_taxpayer_info(full_text)
    assessment_period = parse_assessment_period(full_text)
    
    # If taxpayer_id is not found, it might not be the expected type of document.
    if not taxpayer_id:
        print(f"Warning: Taxpayer ID (CNPJ/CPF) not found in {source_filename}. Outputting empty data.", file=sys.stderr)
        print(json.dumps([]))
        sys.exit(0)

    structured_data = parse_tax_obligations(
        full_text, 
        taxpayer_id, 
        taxpayer_name, 
        assessment_period, 
        source_filename
    )
    
    # Output the structured data as a JSON string to stdout
    print(json.dumps(structured_data, indent=2, ensure_ascii=False))
