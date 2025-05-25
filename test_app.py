import unittest
from unittest.mock import patch, MagicMock
import json
import os
import sys
from io import BytesIO
from datetime import datetime

# Add app's directory to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import app, _generate_linkage_key, _parse_date # Import helpers for direct testing

class TestApp(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        app.config['DEBUG'] = False
        self.client = app.test_client()
        
        # Reset data stores by directly clearing the global lists in the app module
        app.fiscal_reports_data = []
        app.payment_invoices_data = []

        uploads_dir = "./uploads/"
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
        # Clean up any files from previous test runs in uploads_dir
        for f in os.listdir(uploads_dir):
            try:
                os.remove(os.path.join(uploads_dir, f))
            except OSError: # pragma: no cover
                pass # Ignore if file is already gone or locked

    def tearDown(self):
        # Clean up global lists after each test
        app.fiscal_reports_data = []
        app.payment_invoices_data = []
        # Clean up uploads directory
        uploads_dir = "./uploads/"
        for f in os.listdir(uploads_dir):
            try:
                os.remove(os.path.join(uploads_dir, f))
            except OSError: # pragma: no cover
                pass


    @patch('app.run_extraction_script')
    def test_upload_fiscal_report_success_structured_data(self, mock_run_extraction):
        mock_fiscal_data = [{"taxpayer_id": "001", "tax_type_description": "IRPJ", "assessment_period": "01/2023", "source_file": "fiscal.pdf"}]
        mock_run_extraction.return_value = json.dumps(mock_fiscal_data)
        
        data = {'pdf': (BytesIO(b"dummy pdf"), 'fiscal.pdf')}
        response = self.client.post('/api/upload/fiscal_report', content_type='multipart/form-data', data=data)
        
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(json_data['message'], "Fiscal report processed and structured data stored.")
        self.assertEqual(json_data['filename'], "fiscal.pdf")
        self.assertEqual(json_data['items_extracted'], 1)
        
        self.assertEqual(len(app.fiscal_reports_data), 1)
        self.assertEqual(app.fiscal_reports_data[0]['taxpayer_id'], "001")

    @patch('app.run_extraction_script')
    def test_upload_payment_invoice_success_structured_data(self, mock_run_extraction):
        mock_invoice_data = [{"taxpayer_id": "002", "tax_type_code": "DARF123", "payment_total_amount": 100.50, "source_file": "invoice.pdf"}]
        mock_run_extraction.return_value = json.dumps(mock_invoice_data)
        
        data = {'pdf': (BytesIO(b"dummy pdf"), 'invoice.pdf')}
        response = self.client.post('/api/upload/payment_invoice', content_type='multipart/form-data', data=data)
        
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(json_data['message'], "Payment invoice processed and structured data stored.")
        self.assertEqual(json_data['filename'], "invoice.pdf")
        self.assertEqual(json_data['data_preview']['taxpayer_id'], "002")
        
        self.assertEqual(len(app.payment_invoices_data), 1)
        self.assertEqual(app.payment_invoices_data[0]['taxpayer_id'], "002")

    @patch('app.run_extraction_script')
    def test_upload_script_returns_none_or_error(self, mock_run_extraction):
        mock_run_extraction.return_value = None # Simulate script execution failure
        
        data = {'pdf': (BytesIO(b"bad pdf"), 'error_doc.pdf')}
        response = self.client.post('/api/upload/fiscal_report', content_type='multipart/form-data', data=data)
        
        self.assertEqual(response.status_code, 500)
        json_data = response.get_json()
        self.assertIn("Failed to execute fiscal report extraction script", json_data['error'])
        self.assertEqual(len(app.fiscal_reports_data), 0) # Ensure no data was added

    @patch('app.run_extraction_script')
    def test_upload_script_returns_invalid_json(self, mock_run_extraction):
        mock_run_extraction.return_value = "This is not JSON"
        
        data = {'pdf': (BytesIO(b"pdf"), 'bad_json.pdf')}
        response = self.client.post('/api/upload/fiscal_report', content_type='multipart/form-data', data=data)
        
        self.assertEqual(response.status_code, 500)
        json_data = response.get_json()
        self.assertIn("Invalid JSON output from fiscal report script", json_data['error'])

    # --- Tests for /api/unified_data merging logic ---

    def test_unified_data_successful_match(self):
        app.fiscal_reports_data = [
            {"taxpayer_id": "001", "tax_type_description": "IRPJ", "assessment_period": "01/2023", "fiscal_calculated_tax_amount": 100.0, "fiscal_due_date": "15/02/2023", "source_file": "f1.pdf"}
        ]
        app.payment_invoices_data = [
            {"taxpayer_id": "001", "tax_type_code": "IRPJ", "assessment_period": "01/2023", "payment_principal_amount": 100.0, "payment_date": "10/02/2023", "source_file": "p1.pdf"}
        ]
        response = self.client.get('/api/unified_data')
        self.assertEqual(response.status_code, 200)
        unified_data = response.get_json()
        self.assertEqual(len(unified_data), 1)
        record = unified_data[0]
        self.assertEqual(record['payment_status'], "Paid")
        self.assertEqual(record['payment_principal_amount'], 100.0)
        self.assertEqual(record['discrepancy_notes'], [])

    def test_unified_data_no_match_fiscal_unpaid(self):
        app.fiscal_reports_data = [
            {"taxpayer_id": "001", "tax_type_description": "IRPJ", "assessment_period": "01/2023", "fiscal_calculated_tax_amount": 100.0, "source_file": "f1.pdf"}
        ]
        app.payment_invoices_data = []
        response = self.client.get('/api/unified_data')
        unified_data = response.get_json()
        self.assertEqual(len(unified_data), 1)
        record = unified_data[0]
        self.assertEqual(record['payment_status'], "Unpaid")
        self.assertEqual(record['payment_principal_amount'], 0.0)

    def test_unified_data_orphaned_payment(self):
        app.fiscal_reports_data = []
        app.payment_invoices_data = [
            {"taxpayer_id": "001", "tax_type_code": "IRPJ", "assessment_period": "01/2023", "payment_principal_amount": 100.0, "source_file": "p1.pdf"}
        ]
        response = self.client.get('/api/unified_data')
        unified_data = response.get_json()
        self.assertEqual(len(unified_data), 1)
        record = unified_data[0]
        self.assertEqual(record['payment_status'], "Payment without matching fiscal record")
        self.assertEqual(record['payment_principal_amount'], 100.0)

    def test_unified_data_late_payment(self):
        app.fiscal_reports_data = [
            {"taxpayer_id": "001", "tax_type_description": "IRPJ", "assessment_period": "01/2023", "fiscal_due_date": "15/02/2023", "source_file": "f1.pdf"}
        ]
        app.payment_invoices_data = [
            {"taxpayer_id": "001", "tax_type_code": "IRPJ", "assessment_period": "01/2023", "payment_date": "20/02/2023", "source_file": "p1.pdf"}
        ]
        response = self.client.get('/api/unified_data')
        unified_data = response.get_json()
        self.assertEqual(len(unified_data), 1)
        record = unified_data[0]
        self.assertEqual(record['payment_status'], "Paid")
        self.assertIn("Paid late.", record['discrepancy_notes'])

    def test_unified_data_amount_mismatch(self):
        app.fiscal_reports_data = [
            {"taxpayer_id": "001", "tax_type_description": "IRPJ", "assessment_period": "01/2023", "fiscal_calculated_tax_amount": 100.0, "source_file": "f1.pdf"}
        ]
        app.payment_invoices_data = [
            {"taxpayer_id": "001", "tax_type_code": "IRPJ", "assessment_period": "01/2023", "payment_principal_amount": 90.0, "source_file": "p1.pdf"}
        ]
        response = self.client.get('/api/unified_data')
        unified_data = response.get_json()
        self.assertEqual(len(unified_data), 1)
        record = unified_data[0]
        self.assertEqual(record['payment_status'], "Paid")
        self.assertIn("Amount mismatch: Fiscal 100.0, Paid 90.0.", record['discrepancy_notes'])

    def test_unified_data_linkage_key_variations(self):
        # Test case sensitivity and space normalization (as per _generate_linkage_key)
        app.fiscal_reports_data = [
            {"taxpayer_id": "abc", "tax_type_description": "irpj code ", "assessment_period": "01/2023 ", "source_file": "f1.pdf"}
        ]
        app.payment_invoices_data = [
            {"taxpayer_id": "ABC", "tax_type_code": "IRPJCODE", "assessment_period": "01/2023", "source_file": "p1.pdf"}
        ]
        response = self.client.get('/api/unified_data')
        unified_data = response.get_json()
        self.assertEqual(len(unified_data), 1, "Should match despite case/space differences in key components")
        self.assertEqual(unified_data[0]['payment_status'], "Paid")

        # Test N/A placeholder matching
        app.fiscal_reports_data = [
            {"taxpayer_id": "002", "tax_type_description": None, "assessment_period": "02/2023", "source_file": "f2.pdf"}
        ]
        app.payment_invoices_data = [
            {"taxpayer_id": "002", "tax_type_code": None, "assessment_period": "02/2023", "source_file": "p2.pdf"}
        ]
        response = self.client.get('/api/unified_data')
        unified_data = response.get_json()
        self.assertEqual(len(unified_data), 1, "Should match with None (N/A) in tax_type")
        self.assertEqual(unified_data[0]['payment_status'], "Paid")


    def test_unified_data_multiple_items_mixed_scenario(self):
        app.fiscal_reports_data = [
            {"taxpayer_id": "001", "tax_type_description": "IRPJ", "assessment_period": "01/2023", "fiscal_calculated_tax_amount": 100.0, "fiscal_due_date": "15/02/2023", "source_file": "f1.pdf"},
            {"taxpayer_id": "002", "tax_type_description": "PIS", "assessment_period": "01/2023", "fiscal_calculated_tax_amount": 200.0, "source_file": "f2.pdf"}, # Unpaid
            {"taxpayer_id": "003", "tax_type_description": "COFINS", "assessment_period": "02/2023", "fiscal_calculated_tax_amount": 300.0, "fiscal_due_date": "15/03/2023", "source_file": "f3.pdf"} # Late payment
        ]
        app.payment_invoices_data = [
            {"taxpayer_id": "001", "tax_type_code": "IRPJ", "assessment_period": "01/2023", "payment_principal_amount": 100.0, "payment_date": "10/02/2023", "source_file": "p1.pdf"}, # Match for f1
            {"taxpayer_id": "003", "tax_type_code": "COFINS", "assessment_period": "02/2023", "payment_principal_amount": 290.0, "payment_date": "20/03/2023", "source_file": "p3.pdf"}, # Match for f3 (amount mismatch & late)
            {"taxpayer_id": "004", "tax_type_code": "CSLL", "assessment_period": "03/2023", "payment_principal_amount": 400.0, "source_file": "p4.pdf"} # Orphaned
        ]
        response = self.client.get('/api/unified_data')
        unified_data = response.get_json()
        self.assertEqual(len(unified_data), 4) # 3 fiscal (2 paid, 1 unpaid) + 1 orphaned payment

        record_001 = next(r for r in unified_data if r['taxpayer_id'] == "001" and r.get('source_file') == 'f1.pdf')
        self.assertEqual(record_001['payment_status'], "Paid")
        self.assertEqual(record_001['discrepancy_notes'], [])

        record_002 = next(r for r in unified_data if r['taxpayer_id'] == "002")
        self.assertEqual(record_002['payment_status'], "Unpaid")

        record_003 = next(r for r in unified_data if r['taxpayer_id'] == "003" and r.get('source_file') == 'f3.pdf')
        self.assertEqual(record_003['payment_status'], "Paid")
        self.assertIn("Paid late.", record_003['discrepancy_notes'])
        self.assertIn("Amount mismatch: Fiscal 300.0, Paid 290.0.", record_003['discrepancy_notes'])
        
        record_004 = next(r for r in unified_data if r['taxpayer_id'] == "004" and r['payment_status'] == "Payment without matching fiscal record")
        self.assertIsNotNone(record_004)
        self.assertEqual(record_004['payment_principal_amount'], 400.0)

    # --- Tests for helper functions ---
    def test_generate_linkage_key(self):
        item1 = {"taxpayer_id": "123", "tax_type_code": "IRPJ", "assessment_period": "01/2023"}
        self.assertEqual(_generate_linkage_key(item1), "123|IRPJ|01/2023")
        
        item2 = {"taxpayer_id": " 123 ", "tax_type_description": " IRPJ Code ", "assessment_period": " 01/2023 "} # Spaces, description
        self.assertEqual(_generate_linkage_key(item2), "123|IRPJCODE|01/2023") # Normalization check

        item3 = {"taxpayer_id": "456", "tax_type_code": None, "assessment_period": "02/2023"} # None tax_type_code
        self.assertEqual(_generate_linkage_key(item3), "456|N/A|02/2023")

        item4 = {"taxpayer_id": None, "tax_type_description": "PIS", "assessment_period": None} # None taxpayer_id and period
        self.assertEqual(_generate_linkage_key(item4), "N/A|PIS|N/A")
        
        item5 = {"some_other_field": "value"} # Missing all key fields
        self.assertEqual(_generate_linkage_key(item5), "N/A|N/A|N/A")

    def test_parse_date(self):
        self.assertEqual(_parse_date("15/02/2023"), datetime(2023, 2, 15))
        self.assertEqual(_parse_date("2023-03-20"), datetime(2023, 3, 20))
        self.assertEqual(_parse_date("10-04-2023", fmt="%d-%m-%Y"), datetime(2023, 4, 10)) # Explicit format
        self.assertIsNone(_parse_date(None))
        self.assertIsNone(_parse_date("invalid-date"))
        self.assertIsNone(_parse_date("15/02/23")) # Does not match YYYY

    # Test reset data (already existed, ensure it still works)
    def test_reset_data(self):
        app.fiscal_reports_data = [{"key": "value1"}]
        app.payment_invoices_data = [{"key": "value2"}]
        
        response = self.client.delete('/api/reset_data')
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(json_data['message'], "Data reset successfully")

        self.assertEqual(app.fiscal_reports_data, [])
        self.assertEqual(app.payment_invoices_data, [])
        
        # Verify unified data is also empty
        unified_response = self.client.get('/api/unified_data')
        self.assertEqual(unified_response.get_json(), [])


if __name__ == '__main__':
    unittest.main()
