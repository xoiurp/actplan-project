import unittest
from unittest.mock import patch, MagicMock
import json
import os
import sys
from io import BytesIO

# Add app's directory to sys.path, assuming app.py is in the root or a known location
# For this environment, scripts are in the root.
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# Import Flask app instance.
# This requires app.py to have `app = Flask(__name__)` at the global level.
# And to prevent app.run() when importing, guard it with `if __name__ == '__main__':`
from app import app 

class TestApp(unittest.TestCase):

    def setUp(self):
        # Configure the app for testing
        app.config['TESTING'] = True
        app.config['DEBUG'] = False
        # Create a test client
        self.client = app.test_client()
        
        # Reset data stores before each test (if app has such a function, or do it manually)
        # For this app, global lists are used. We can reset them directly or use the /reset endpoint.
        with self.client.delete('/api/reset_data'): # or GET based on app's implementation
            pass 

        # Create dummy upload directory if it doesn't exist (app.py should do this too)
        if not os.path.exists("./uploads/"):
            os.makedirs("./uploads/")

    def tearDown(self):
        # Clean up any files created in uploads_dir if necessary
        # For this app, files are deleted after processing, so this might not be needed
        # unless a test fails mid-way.
        upload_dir = "./uploads/"
        for f in os.listdir(upload_dir):
            os.remove(os.path.join(upload_dir, f))
        pass

    @patch('app.run_extraction_script') # Patching the helper function in app.py
    def test_upload_fiscal_report_success(self, mock_run_extraction):
        # Mock the helper function to return a successful extraction preview
        mock_run_extraction.return_value = "Fiscal text preview 1000 chars..."
        
        data = {'pdf': (BytesIO(b"dummy fiscal pdf content"), 'fiscal_report.pdf')}
        response = self.client.post('/api/upload/fiscal_report', content_type='multipart/form-data', data=data)
        
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(json_data['message'], "Fiscal report processed")
        self.assertEqual(json_data['filename'], "fiscal_report.pdf")
        self.assertEqual(json_data['preview'], "Fiscal text preview 1000 chars...")
        
        # Check if data was added to the global list (requires access or another endpoint)
        data_response = self.client.get('/api/unified_data')
        unified_data = data_response.get_json()
        self.assertEqual(len(unified_data['fiscal_reports']), 1)
        self.assertEqual(unified_data['fiscal_reports'][0]['filename'], "fiscal_report.pdf")
        self.assertEqual(unified_data['fiscal_reports'][0]['extracted_text_preview'], "Fiscal text preview 1000 chars...")

    @patch('app.run_extraction_script')
    def test_upload_payment_invoice_success(self, mock_run_extraction):
        mock_run_extraction.return_value = "Invoice text preview 1000 chars..."
        
        data = {'pdf': (BytesIO(b"dummy invoice pdf content"), 'invoice.pdf')}
        response = self.client.post('/api/upload/payment_invoice', content_type='multipart/form-data', data=data)
        
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(json_data['message'], "Payment invoice processed")
        self.assertEqual(json_data['filename'], "invoice.pdf")
        self.assertEqual(json_data['preview'], "Invoice text preview 1000 chars...")

        data_response = self.client.get('/api/unified_data')
        unified_data = data_response.get_json()
        self.assertEqual(len(unified_data['payment_invoices']), 1)
        self.assertEqual(unified_data['payment_invoices'][0]['filename'], "invoice.pdf")

    @patch('app.run_extraction_script')
    def test_upload_script_failure(self, mock_run_extraction):
        # Simulate script execution failure
        mock_run_extraction.return_value = "Script execution failed: some error"
        
        data = {'pdf': (BytesIO(b"bad pdf content"), 'error_doc.pdf')}
        response = self.client.post('/api/upload/fiscal_report', content_type='multipart/form-data', data=data)
        
        self.assertEqual(response.status_code, 200) # The API itself might return 200 but indicate failure in preview
        json_data = response.get_json()
        self.assertIn("Script execution failed", json_data['preview'])

        # Verify data is still added, but with error message
        data_response = self.client.get('/api/unified_data')
        unified_data = data_response.get_json()
        self.assertEqual(len(unified_data['fiscal_reports']), 1)
        self.assertIn("Script execution failed", unified_data['fiscal_reports'][0]['extracted_text_preview'])


    def test_upload_no_file(self):
        response = self.client.post('/api/upload/fiscal_report', data={})
        self.assertEqual(response.status_code, 400)
        json_data = response.get_json()
        self.assertEqual(json_data['error'], "No PDF file provided")

    def test_upload_invalid_file_type(self):
        data = {'pdf': (BytesIO(b"this is a text file"), 'dopey.txt')}
        response = self.client.post('/api/upload/fiscal_report', content_type='multipart/form-data', data=data)
        self.assertEqual(response.status_code, 400)
        json_data = response.get_json()
        self.assertEqual(json_data['error'], "Invalid file type, please upload a PDF")

    def test_unified_data_empty(self):
        response = self.client.get('/api/unified_data')
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(json_data['fiscal_reports'], [])
        self.assertEqual(json_data['payment_invoices'], [])

    @patch('app.run_extraction_script')
    def test_unified_data_with_data(self, mock_run_extraction):
        # Upload one of each type
        mock_run_extraction.return_value = "Fiscal preview"
        self.client.post('/api/upload/fiscal_report', data={'pdf': (BytesIO(b"f"), 'f.pdf')}, content_type='multipart/form-data')
        
        mock_run_extraction.return_value = "Invoice preview"
        self.client.post('/api/upload/payment_invoice', data={'pdf': (BytesIO(b"i"), 'i.pdf')}, content_type='multipart/form-data')

        response = self.client.get('/api/unified_data')
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(len(json_data['fiscal_reports']), 1)
        self.assertEqual(json_data['fiscal_reports'][0]['filename'], 'f.pdf')
        self.assertEqual(len(json_data['payment_invoices']), 1)
        self.assertEqual(json_data['payment_invoices'][0]['filename'], 'i.pdf')

    def test_reset_data(self):
        # Add some data first (mocking not needed for this part of reset test)
        with patch('app.run_extraction_script', return_value="dummy preview"):
            self.client.post('/api/upload/fiscal_report', data={'pdf': (BytesIO(b"f"), 'f.pdf')}, content_type='multipart/form-data')
        
        response_before_reset = self.client.get('/api/unified_data')
        self.assertNotEqual(response_before_reset.get_json()['fiscal_reports'], [])

        reset_response = self.client.delete('/api/reset_data') # Assuming DELETE, could be GET
        self.assertEqual(reset_response.status_code, 200)
        json_data = reset_response.get_json()
        self.assertEqual(json_data['message'], "Data reset successfully")

        response_after_reset = self.client.get('/api/unified_data')
        self.assertEqual(response_after_reset.get_json()['fiscal_reports'], [])
        self.assertEqual(response_after_reset.get_json()['payment_invoices'], [])

    # Testing the helper function run_extraction_script directly (if it were refactored for easier testing)
    # For now, it's tested indirectly via the upload endpoints.
    # If run_extraction_script was in, e.g. `helpers.py`:
    # @patch('subprocess.run')
    # def test_run_extraction_script_helper_success(self, mock_subprocess_run):
    #     from app import run_extraction_script # Assuming it's importable
    #     mock_process = MagicMock()
    #     mock_process.stdout = "Some output\nFirst 1000 characters of extracted text:\nActual preview here"
    #     mock_process.stderr = ""
    #     mock_process.returncode = 0
    #     mock_subprocess_run.return_value = mock_process
        
    #     preview = run_extraction_script("dummy_script.py", "dummy.pdf")
    #     self.assertEqual(preview, "Actual preview here")
    #     mock_subprocess_run.assert_called_once_with(
    #         [sys.executable, "dummy_script.py", "dummy.pdf"],
    #         capture_output=True, text=True, check=True, timeout=60
    #     )

    # @patch('subprocess.run', side_effect=subprocess.TimeoutExpired(cmd="cmd", timeout=10))
    # def test_run_extraction_script_helper_timeout(self, mock_subprocess_run):
    #     from app import run_extraction_script
    #     preview = run_extraction_script("dummy_script.py", "dummy.pdf")
    #     self.assertEqual(preview, "Script execution timed out.")

    # @patch('subprocess.run', side_effect=subprocess.CalledProcessError(returncode=1, cmd="cmd", stderr="Error!"))
    # def test_run_extraction_script_helper_called_process_error(self, mock_subprocess_run):
    #     from app import run_extraction_script
    #     preview = run_extraction_script("dummy_script.py", "dummy.pdf")
    #     self.assertEqual(preview, "Script execution failed: Error!")

if __name__ == '__main__':
    # Before running tests, ensure Flask is installed.
    # This is usually handled by a requirements.txt or CI setup.
    # For this environment, we might need to ensure it.
    try:
        import flask
    except ImportError:
        print("Flask not installed. Attempting to install...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Flask"])

    unittest.main()
