import os
import subprocess
import uuid
from flask import Flask, request, jsonify

# Initialize Flask app
app = Flask(__name__)

# Define the directory for temporary uploads
UPLOADS_DIR = "./uploads/"
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

# Global lists to store extracted data (in-memory store)
fiscal_reports_data = []
payment_invoices_data = []

# Helper function to run extraction scripts
def run_extraction_script(script_path, pdf_path):
    """
    Runs an extraction script and captures its output.
    Returns the first 1000 characters of stdout or an error message.
    """
    try:
        # Ensure the script is executable
        subprocess.run(['chmod', '+x', script_path], check=True)
        
        # Run the script
        process = subprocess.run(
            [sys.executable, script_path, pdf_path],
            capture_output=True,
            text=True,
            check=True,
            timeout=60 # Add a timeout to prevent hanging
        )
        # The actual text is usually printed after "First 1000 characters of extracted text:\n"
        output_lines = process.stdout.splitlines()
        text_preview_marker = "First 1000 characters of extracted text:"
        for i, line in enumerate(output_lines):
            if text_preview_marker in line and i + 1 < len(output_lines):
                # Join the lines that form the preview
                return "\n".join(output_lines[i+1:])[:1000]
        return process.stdout[:1000] # Fallback if marker not found
    except subprocess.CalledProcessError as e:
        error_message = f"Script execution failed: {e.stderr}"
        print(error_message)
        return error_message
    except subprocess.TimeoutExpired:
        error_message = "Script execution timed out."
        print(error_message)
        return error_message
    except Exception as e:
        error_message = f"An unexpected error occurred: {str(e)}"
        print(error_message)
        return error_message

@app.route('/api/upload/fiscal_report', methods=['POST'])
def upload_fiscal_report():
    if 'pdf' not in request.files:
        return jsonify({"error": "No PDF file provided"}), 400
    
    file = request.files['pdf']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and file.filename.endswith('.pdf'):
        original_filename = file.filename
        # Generate a unique filename to avoid conflicts
        temp_filename = str(uuid.uuid4()) + ".pdf"
        temp_pdf_path = os.path.join(UPLOADS_DIR, temp_filename)
        
        try:
            file.save(temp_pdf_path)
            
            # Execute the existing extract_fiscal_report_text.py script
            # This script expects a file path
            script_path = './extract_fiscal_report_text.py'
            extracted_text_preview = run_extraction_script(script_path, temp_pdf_path)
            
            report_data = {
                "filename": original_filename,
                "status": "processed",
                "extracted_text_preview": extracted_text_preview
            }
            fiscal_reports_data.append(report_data)
            
            return jsonify({
                "message": "Fiscal report processed",
                "filename": original_filename,
                "preview": extracted_text_preview
            }), 200
        except Exception as e:
            return jsonify({"error": f"Processing failed: {str(e)}"}), 500
        finally:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
    else:
        return jsonify({"error": "Invalid file type, please upload a PDF"}), 400

@app.route('/api/upload/payment_invoice', methods=['POST'])
def upload_payment_invoice():
    if 'pdf' not in request.files:
        return jsonify({"error": "No PDF file provided"}), 400
    
    file = request.files['pdf']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and file.filename.endswith('.pdf'):
        original_filename = file.filename
        temp_filename = str(uuid.uuid4()) + ".pdf"
        temp_pdf_path = os.path.join(UPLOADS_DIR, temp_filename)
        
        try:
            file.save(temp_pdf_path)
            
            # Execute the existing extract_invoice_text.py script
            # This script needs to be adapted or called differently if it only takes URLs.
            # For now, we assume it's adapted to take a file path.
            script_path = './extract_invoice_text.py'
            
            # The script `extract_invoice_text.py` currently expects a URL.
            # To make it work with a local file path directly without modifying the script now,
            # we can simulate the "download" by providing a file:// URL.
            # However, the script uses `requests` which might not handle file:// well.
            # A better quick adaptation for the API is to pass the local path
            # and modify `extract_invoice_text.py` to handle it.
            # If `extract_invoice_text.py` is not modified, this call will likely fail
            # or the script would need to be clever enough to detect a local path.
            # For this iteration, we will assume we will modify `extract_invoice_text.py`
            # in the next step to accept local file paths.
            extracted_text_preview = run_extraction_script(script_path, temp_pdf_path)
            
            invoice_data = {
                "filename": original_filename,
                "status": "processed",
                "extracted_text_preview": extracted_text_preview
            }
            payment_invoices_data.append(invoice_data)
            
            return jsonify({
                "message": "Payment invoice processed",
                "filename": original_filename,
                "preview": extracted_text_preview
            }), 200
        except Exception as e:
            # Log the exception e for debugging
            print(f"Error in payment_invoice upload: {e}")
            return jsonify({"error": f"Processing failed: {str(e)}"}), 500
        finally:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
    else:
        return jsonify({"error": "Invalid file type, please upload a PDF"}), 400

@app.route('/api/unified_data', methods=['GET'])
def get_unified_data():
    return jsonify({
        "fiscal_reports": fiscal_reports_data,
        "payment_invoices": payment_invoices_data
    }), 200

@app.route('/api/reset_data', methods=['DELETE', 'GET']) # Allow GET for easier browser testing
def reset_data():
    global fiscal_reports_data, payment_invoices_data
    fiscal_reports_data = []
    payment_invoices_data = []
    return jsonify({"message": "Data reset successfully"}), 200

# It's important to import sys for sys.executable in run_extraction_script
import sys 

if __name__ == '__main__':
    # Ensure Flask is installed before trying to run the app
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Flask"])
    except subprocess.CalledProcessError as e:
        print(f"Failed to install Flask: {e}")
        sys.exit(1)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
