import argparse
import subprocess
import sys
import os
from io import StringIO

# Attempt to import pdfminer.six and install if not found
try:
    from pdfminer.high_level import extract_text_to_fp
    from pdfminer.layout import LAParams
except ImportError:
    print("pdfminer.six not found. Attempting to install...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfminer.six"])
        # Try importing again after installation
        print("Installation complete. Attempting to import pdfminer.six again.")
        from pdfminer.high_level import extract_text_to_fp
        from pdfminer.layout import LAParams
    except subprocess.CalledProcessError as e:
        print(f"Error installing pdfminer.six: {e}")
        print("Please ensure pip is configured correctly and you have internet access.")
        sys.exit(1)
    except ImportError:
        print("Failed to import pdfminer.six after installation.")
        print("Please ensure pdfminer.six is correctly installed and accessible in your Python environment.")
        sys.exit(1)

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file.

    Args:
        pdf_path (str): The path to the PDF file.

    Returns:
        str: The extracted text from the PDF.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        print("Attempting to download the PDF file...")
        url = "https://github.com/xoiurp/actplan-project/blob/main/RelatorioSituacaoFiscal-03367118000140-20250416.pdf?raw=true"
        try:
            # Using curl for potentially better compatibility in various environments
            subprocess.check_call(["curl", "-L", "-o", pdf_path, url])
            print(f"PDF file downloaded successfully to {pdf_path}")
        except subprocess.CalledProcessError as e:
            print(f"Error downloading PDF file using curl: {e}")
            # Fallback to wget if curl fails or is not available
            print("Attempting download with wget...")
            try:
                subprocess.check_call(["wget", "-O", pdf_path, url])
                print(f"PDF file downloaded successfully to {pdf_path} using wget.")
            except subprocess.CalledProcessError as e_wget:
                print(f"Error downloading PDF file using wget: {e_wget}")
                sys.exit(1)
        
        if not os.path.exists(pdf_path):
             print(f"Error: PDF file still not found at {pdf_path} after attempting download.")
             sys.exit(1)

    # Test mode: If TEST_MODE_INPUT_FILE is set, read from it directly.
    test_mode_file = os.environ.get('TEST_MODE_INPUT_FILE')
    if test_mode_file and pdf_path == test_mode_file: # Ensure we are using the test file path
        print(f"TEST MODE: Reading from {test_mode_file}")
        if os.path.exists(test_mode_file):
            try:
                with open(test_mode_file, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                print(f"TEST MODE Error: Could not read {test_mode_file}: {e}")
                sys.exit(1)
        else:
            print(f"TEST MODE Error: {test_mode_file} not found.")
            sys.exit(1)

    # Original PDF processing logic
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        print("Attempting to download the PDF file...")
        url = "https://github.com/xoiurp/actplan-project/blob/main/RelatorioSituacaoFiscal-03367118000140-20250416.pdf?raw=true"
        try:
            # Using curl for potentially better compatibility in various environments
            subprocess.check_call(["curl", "-L", "-o", pdf_path, url], timeout=30) # Added timeout
            print(f"PDF file downloaded successfully to {pdf_path}")
        except subprocess.CalledProcessError as e:
            print(f"Error downloading PDF file using curl: {e}")
            # Fallback to wget if curl fails or is not available
            print("Attempting download with wget...")
            try:
                subprocess.check_call(["wget", "-O", pdf_path, url], timeout=30) # Added timeout
                print(f"PDF file downloaded successfully to {pdf_path} using wget.")
            except subprocess.CalledProcessError as e_wget:
                print(f"Error downloading PDF file using wget: {e_wget}")
                sys.exit(1)
        except subprocess.TimeoutExpired:
            print("Download timed out.")
            sys.exit(1)
        
        if not os.path.exists(pdf_path):
             print(f"Error: PDF file still not found at {pdf_path} after attempting download.")
             sys.exit(1)

    output_string = StringIO()
    try:
        with open(pdf_path, 'rb') as fin:
            extract_text_to_fp(fin, output_string, laparams=LAParams(), output_type='text', codec="")
    except Exception as e:
        print(f"Error during PDF text extraction: {e}")
        sys.exit(1)
    return output_string.getvalue()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract text from a PDF file.")
    parser.add_argument("pdf_path", help="Path to the PDF file (or test .txt file in test mode).")
    args = parser.parse_args()
    
    # In test mode, pdf_path argument will be the path to TEST_MODE_INPUT_FILE
    test_mode_input_env = os.environ.get('TEST_MODE_INPUT_FILE')
    input_path_for_extraction = test_mode_input_env if test_mode_input_env else args.pdf_path

    extracted_text = extract_text_from_pdf(input_path_for_extraction)
    
    # The marker helps app.py parse the output.
    print("\nFirst 1000 characters of extracted text:")
    print(extracted_text[:1000])
