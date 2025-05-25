import os
import subprocess
import uuid
import json # Added
from datetime import datetime # Added
from flask import Flask, request, jsonify

# Initialize Flask app
app = Flask(__name__)

# Define the directory for temporary uploads
UPLOADS_DIR = "./uploads/"
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

# Global lists to store extracted data (in-memory store)
fiscal_reports_data = [] # Will store list of dicts from extract_fiscal_report_text.py
payment_invoices_data = [] # Will store list of dicts (each list from extract_invoice_text.py contains one dict)

# Helper function to run extraction scripts
def run_extraction_script(script_path, pdf_path):
    """
    Runs an extraction script and captures its JSON output.
    Returns the raw JSON string from stdout or an error message.
    """
    try:
        # Ensure the script is executable
        subprocess.run(['chmod', '+x', script_path], check=True, timeout=10)
        
        process = subprocess.run(
            [sys.executable, script_path, pdf_path],
            capture_output=True,
            text=True, # Ensure output is text
            check=True, # Will raise CalledProcessError if script exits with non-zero
            timeout=60 
        )
        # Scripts now output JSON directly to stdout.
        # stderr is used for logging by the scripts.
        # We assume the last non-empty line of stdout is the JSON output.
        # A more robust way is to ensure script only prints JSON to stdout.
        # For now, let's take the full stdout.
        
        # The scripts are expected to print ONLY the JSON to stdout.
        # Diagnostic messages go to stderr.
        return process.stdout.strip() 
    
    except subprocess.CalledProcessError as e:
        # Capture stderr for more detailed error messages
        error_message = f"Script execution failed with exit code {e.returncode}. Error: {e.stderr.strip() if e.stderr else 'No stderr output.'}"
        print(error_message, file=sys.stderr) # Log to app's stderr
        return None # Indicate failure
    except subprocess.TimeoutExpired:
        error_message = "Script execution timed out."
        print(error_message, file=sys.stderr)
        return None # Indicate failure
    except Exception as e:
        error_message = f"An unexpected error occurred while running script: {str(e)}"
        print(error_message, file=sys.stderr)
        return None # Indicate failure

def _generate_linkage_key(item_dict):
    """
    Generates a consistent linkage key from an item dictionary (fiscal or payment).
    Key components: taxpayer_id, tax_type_code/tax_type_description, assessment_period.
    """
    taxpayer_id = str(item_dict.get("taxpayer_id", "N/A")).strip()
    
    # For fiscal items, tax_type_code might not exist; use tax_type_description as fallback.
    # For payment items (DARF), tax_type_code is primary.
    tax_code = str(item_dict.get("tax_type_code") or item_dict.get("tax_type_description", "N/A")).strip()
    
    assessment_period = str(item_dict.get("assessment_period", "N/A")).strip()
    
    # Normalize parts of the key, e.g., remove spaces, convert to uppercase for consistency
    taxpayer_id = taxpayer_id.upper()
    tax_code = tax_code.upper().replace(" ", "") # Remove spaces from tax code/description for robustness
    assessment_period = assessment_period.upper().replace(" ", "")

    return f"{taxpayer_id}|{tax_code}|{assessment_period}"

def _parse_date(date_str, fmt="%d/%m/%Y"):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, fmt)
    except (ValueError, TypeError):
        # Try other common formats or return None
        for try_fmt in ["%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"]:
            try:
                return datetime.strptime(date_str, try_fmt)
            except (ValueError, TypeError):
                continue
        return None


@app.route('/api/upload/fiscal_report', methods=['POST'])
def upload_fiscal_report():
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
            script_path = './extract_fiscal_report_text.py'
            json_output_str = run_extraction_script(script_path, temp_pdf_path)

            if json_output_str is None: # Script execution failed
                return jsonify({"error": "Failed to execute fiscal report extraction script or script returned error."}), 500

            try:
                # The script outputs a JSON list of fiscal items
                parsed_data_list = json.loads(json_output_str)
                if not isinstance(parsed_data_list, list):
                    raise ValueError("Parsed JSON is not a list as expected from fiscal report script.")
            except json.JSONDecodeError as e:
                print(f"JSONDecodeError from fiscal_report script: {e}. Output: '{json_output_str}'", file=sys.stderr)
                return jsonify({"error": f"Invalid JSON output from fiscal report script: {e}"}), 500
            except ValueError as e:
                print(f"ValueError: {e}. Output: '{json_output_str}'", file=sys.stderr)
                return jsonify({"error": str(e)}), 500


            # Add source_file to each item if not already present by the script
            # (assuming script already adds it as per previous task)
            # for item in parsed_data_list:
            #    item['source_file'] = original_filename 
            
            fiscal_reports_data.extend(parsed_data_list)
            
            return jsonify({
                "message": "Fiscal report processed and structured data stored.",
                "filename": original_filename,
                "items_extracted": len(parsed_data_list)
            }), 200
        except Exception as e:
            print(f"Error processing fiscal report: {e}", file=sys.stderr)
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
            script_path = './extract_invoice_text.py'
            json_output_str = run_extraction_script(script_path, temp_pdf_path)

            if json_output_str is None: # Script execution failed
                return jsonify({"error": "Failed to execute payment invoice extraction script or script returned error."}), 500

            try:
                # The script outputs a JSON list containing a single payment data dictionary
                parsed_data_list = json.loads(json_output_str)
                if not isinstance(parsed_data_list, list) or not parsed_data_list:
                    # Handle case where list is empty or not a list
                    parsed_payment_data = {} # Default to empty dict
                    print(f"Warning: Payment invoice script output was not a list with one item. Output: '{json_output_str}'", file=sys.stderr)
                else:
                    parsed_payment_data = parsed_data_list[0]
                    if not isinstance(parsed_payment_data, dict):
                         raise ValueError("Parsed JSON's first item is not a dictionary as expected from payment invoice script.")

            except json.JSONDecodeError as e:
                print(f"JSONDecodeError from payment_invoice script: {e}. Output: '{json_output_str}'", file=sys.stderr)
                return jsonify({"error": f"Invalid JSON output from payment invoice script: {e}"}), 500
            except ValueError as e:
                print(f"ValueError: {e}. Output: '{json_output_str}'", file=sys.stderr)
                return jsonify({"error": str(e)}), 500
            
            # Ensure source_file is present (script should already add it)
            # parsed_payment_data['source_file'] = original_filename
            
            payment_invoices_data.append(parsed_payment_data)
            
            return jsonify({
                "message": "Payment invoice processed and structured data stored.",
                "filename": original_filename,
                "data_preview": {k: v for k, v in parsed_payment_data.items() if k in ["taxpayer_id", "tax_type_code", "payment_total_amount"]}
            }), 200
        except Exception as e:
            print(f"Error processing payment invoice: {e}", file=sys.stderr)
            return jsonify({"error": f"Processing failed: {str(e)}"}), 500
        finally:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
    else:
        return jsonify({"error": "Invalid file type, please upload a PDF"}), 400

@app.route('/api/unified_data', methods=['GET'])
def get_unified_data():
    unified_records = []
    remaining_payments = list(payment_invoices_data) # Create a mutable copy

    for fiscal_item in fiscal_reports_data:
        unified_record = fiscal_item.copy() # Start with fiscal item data
        
        # Initialize payment-related fields
        unified_record.update({
            "payment_status": "Unpaid",
            "payment_date": None,
            "payment_principal_amount": 0.0,
            "payment_penalty_amount": 0.0,
            "payment_interest_amount": 0.0,
            "payment_total_amount": 0.0,
            "payment_authentication": None,
            "payment_source_file": None, # To store which payment file matched
            "discrepancy_notes": [] 
        })

        fiscal_key = _generate_linkage_key(fiscal_item)
        
        matched_payment_index = -1
        for i, payment_item in enumerate(remaining_payments):
            payment_key = _generate_linkage_key(payment_item)
            if fiscal_key == payment_key:
                # Merge payment data
                for p_key, p_value in payment_item.items():
                    # Prefix payment-specific fields if names clash, or map them carefully
                    # For now, direct merge, assuming field names from DARF are distinct enough
                    # or are prefixed like "payment_..."
                    unified_record[p_key] = p_value # Overwrites if fiscal_item had same key (e.g. taxpayer_id)
                
                unified_record["payment_status"] = "Paid"
                unified_record["payment_source_file"] = payment_item.get("source_file", "N/A")

                # Basic discrepancy check for amounts (example)
                fiscal_amount = fiscal_item.get("fiscal_calculated_tax_amount", 0.0) or 0.0
                payment_amount = payment_item.get("payment_principal_amount", 0.0) or 0.0 # Or payment_total_amount
                if fiscal_amount > 0 and payment_amount > 0 and abs(fiscal_amount - payment_amount) > 0.01: # Tolerance for float comparison
                     unified_record["discrepancy_notes"].append(f"Amount mismatch: Fiscal {fiscal_amount}, Paid {payment_amount}.")

                # Date discrepancy check
                payment_date_str = payment_item.get("payment_date")
                fiscal_due_date_str = fiscal_item.get("fiscal_due_date")
                
                payment_date_obj = _parse_date(payment_date_str)
                fiscal_due_date_obj = _parse_date(fiscal_due_date_str)

                if payment_date_obj and fiscal_due_date_obj and payment_date_obj > fiscal_due_date_obj:
                    unified_record["discrepancy_notes"].append("Paid late.")
                
                matched_payment_index = i
                break # Found a match, stop searching for this fiscal_item
        
        if matched_payment_index != -1:
            del remaining_payments[matched_payment_index] # Remove matched payment

        unified_records.append(unified_record)

    # Add any remaining payments that didn't match a fiscal record
    for payment_item in remaining_payments:
        unmatched_payment_record = {
            # Populate with common fields, default others
            "taxpayer_id": payment_item.get("taxpayer_id"),
            "taxpayer_name": payment_item.get("taxpayer_name"),
            "assessment_period": payment_item.get("assessment_period"),
            "tax_type_code": payment_item.get("tax_type_code"), 
            "tax_type_description": None, # No fiscal item to get this from
            "fiscal_due_date": None,
            "fiscal_calculated_tax_amount": 0.0,
            "fiscal_base_value": 0.0,
            "source_file": None, # No original fiscal report source file
            "payment_status": "Payment without matching fiscal record",
            "discrepancy_notes": []
        }
        # Merge all fields from the payment_item
        unmatched_payment_record.update(payment_item)
        unmatched_payment_record["payment_source_file"] = payment_item.get("source_file", "N/A")
        unified_records.append(unmatched_payment_record)
        
    return jsonify(unified_records), 200


@app.route('/api/reset_data', methods=['DELETE', 'GET']) 
def reset_data():
    global fiscal_reports_data, payment_invoices_data
    fiscal_reports_data = []
    payment_invoices_data = []
    return jsonify({"message": "Data reset successfully"}), 200

# It's important to import sys for sys.executable in run_extraction_script
import sys 

if __name__ == '__main__':
    # Flask installation check is not robust here, better handled by deployment environment
    # try:
    #     subprocess.check_call([sys.executable, "-m", "pip", "install", "Flask"])
    # except subprocess.CalledProcessError as e:
    #     print(f"Failed to install Flask: {e}", file=sys.stderr)
    #     sys.exit(1)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
