import argparse
import subprocess
import sys
import os
from io import StringIO
import requests # For downloading the PDF from URL

# Attempt to import pdfminer.six and install if not found
try:
    from pdfminer.high_level import extract_text_to_fp
    from pdfminer.layout import LAParams
except ImportError:
    print("pdfminer.six not found. Attempting to install...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfminer.six"])
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

def download_pdf_from_url(pdf_url, local_pdf_path="temp_darf.pdf"):
    """Downloads a PDF from a given URL.

    Args:
        pdf_url (str): The URL of the PDF file.
        local_pdf_path (str): The local path to save the downloaded PDF.

    Returns:
        str: The local path to the downloaded PDF file, or None if download fails.
    """
    print(f"Attempting to download PDF from {pdf_url}...")
    try:
        response = requests.get(pdf_url, stream=True, timeout=30) # Added timeout
        response.raise_for_status()  # Raise an exception for bad status codes
        with open(local_pdf_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"PDF downloaded successfully to {local_pdf_path}")
        return local_pdf_path
    except requests.exceptions.RequestException as e:
        print(f"Error downloading PDF from URL: {e}")
        return None

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file.

    Args:
        pdf_path (str): The path to the PDF file.

    Returns:
        str: The extracted text from the PDF, or None if extraction fails.
    """
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
                sys.exit(1) # Critical error in test mode
        else:
            print(f"TEST MODE Error: {test_mode_file} not found.")
            sys.exit(1) # Critical error in test mode

    # Original PDF processing logic (if not in test mode or test file not applicable)
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path} (and not in test mode for this path).")
        return None # Return None if file not found and not overridden by test mode

    output_string = StringIO()
    try:
        # This part uses pdfminer.six, which we avoid in test mode by returning earlier
        with open(pdf_path, 'rb') as fin:
            extract_text_to_fp(fin, output_string, laparams=LAParams(), output_type='text', codec="")
    except Exception as e:
        print(f"Error during PDF text extraction: {e}")
        return None
    return output_string.getvalue()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract text from a PDF from a URL or local path.")
    parser.add_argument("pdf_input", help="URL or local path of the PDF file to process (or test .txt file in test mode).")
    args = parser.parse_args()

    local_pdf_file = None
    file_downloaded_by_script = False # Flag to track if the script downloaded the file
    
    test_mode_input_env = os.environ.get('TEST_MODE_INPUT_FILE')

    if test_mode_input_env:
        print(f"MAIN: TEST MODE active. Using TEST_MODE_INPUT_FILE ('{test_mode_input_env}') as input_path_for_extraction.")
        # In test mode, the argument `args.pdf_input` is expected to be the path to the test .txt file
        # So, `local_pdf_file` should be this path. Download logic is skipped.
        if os.path.exists(args.pdf_input):
            local_pdf_file = args.pdf_input
        else:
            print(f"MAIN: TEST MODE Error: Specified test input file '{args.pdf_input}' not found.")
            sys.exit(1)
    elif args.pdf_input.startswith('http://') or args.pdf_input.startswith('https://'):
        print(f"MAIN: Input recognized as URL: {args.pdf_input}")
        temp_downloaded_pdf_path = "temp_invoice_" + str(uuid.uuid4()) + ".pdf"
        local_pdf_file = download_pdf_from_url(args.pdf_input, temp_downloaded_pdf_path)
        if local_pdf_file:
            file_downloaded_by_script = True
    else:
        print(f"MAIN: Input recognized as local file path: {args.pdf_input}")
        if os.path.exists(args.pdf_input):
            local_pdf_file = args.pdf_input
        else:
            print(f"MAIN: Error: Local PDF file not found at {args.pdf_input}")
            # local_pdf_file remains None

    if local_pdf_file:
        # Pass the determined local_pdf_file to extract_text_from_pdf
        # If in test mode, this will be test_mode_input_env (if logic above sets it) or args.pdf_input
        # if the test_mode_file is passed as argument.
        # The extract_text_from_pdf function itself also checks TEST_MODE_INPUT_FILE.
        # For clarity, ensuring the path passed to extract_text_from_pdf IS the test file path when in test mode.
        path_for_extraction = test_mode_input_env if test_mode_input_env and local_pdf_file == test_mode_input_env else local_pdf_file
        extracted_text = extract_text_from_pdf(path_for_extraction)
        if extracted_text:
            # Ensure this marker is present for the API to parse output correctly
            print("\nFirst 1000 characters of extracted text:") 
            print(extracted_text[:1000])
        else:
            print("Failed to extract text from the PDF.")
        
        # Only remove the file if the script itself downloaded it
        if file_downloaded_by_script: 
            try:
                os.remove(local_pdf_file)
                print(f"Cleaned up downloaded file: {local_pdf_file}")
            except OSError as e:
                print(f"Error deleting temporary downloaded file {local_pdf_file}: {e}")
    else:
        # Specific error messages based on input type
        if args.pdf_input.startswith('http://') or args.pdf_input.startswith('https://'):
            print("Failed to download the PDF, or PDF processing failed after download.")
        else:
            print("Invalid local file path provided, file not found, or PDF processing failed.")

# Need to import uuid if it's used in the main block, ensure it's at the top level
import uuid
