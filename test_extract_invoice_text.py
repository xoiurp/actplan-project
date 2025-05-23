import unittest
from unittest.mock import patch, mock_open, MagicMock
import subprocess
import os
import sys
import io

# Add the script's directory to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# The script to be tested
SCRIPT_NAME = "extract_invoice_text.py"
# Path to the sample text file
SAMPLE_TEXT_FILE = "sample_invoice.txt" 

class TestExtractInvoiceText(unittest.TestCase):

    def setUp(self):
        if not os.path.exists(SAMPLE_TEXT_FILE):
            with open(SAMPLE_TEXT_FILE, "w") as f:
                f.write("This is sample invoice text for testing.\n" * 5)
        self.original_env = os.environ.copy()
        self.test_url = "http://example.com/dummy.pdf"

    def tearDown(self):
        os.environ = self.original_env

    @patch('requests.get')
    def test_download_from_url(self, mock_requests_get):
        # Mock successful download
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.iter_content.return_value = [b"dummy ", b"pdf ", b"content"]
        mock_response.raise_for_status = MagicMock() # Ensure this is mocked
        mock_requests_get.return_value = mock_response

        # Mock open for saving the downloaded file and then for reading it by pdfminer mock
        # The script internally saves the download to a temp file.
        # We will use TEST_MODE to bypass actual pdfminer.
        os.environ['TEST_MODE_INPUT_FILE'] = "temp_downloaded_invoice.pdf" # Path script will try to read

        with patch('builtins.open', mock_open()) as mock_file_open:
            # Simulate that the downloaded file (now a .txt file for test mode) is created
            # and contains the content that TEST_MODE_INPUT_FILE points to.
             with open(os.environ['TEST_MODE_INPUT_FILE'], "w") as f:
                f.write("Downloaded content for test mode.")

            process = subprocess.run(
                [sys.executable, SCRIPT_NAME, self.test_url],
                capture_output=True, text=True, timeout=10
            )
            
            mock_requests_get.assert_called_with(self.test_url, stream=True, timeout=30)
            # Check that the script tried to open/write the temp downloaded file
            # The name "temp_invoice_*.pdf" is generated with uuid, so hard to match exactly.
            # Instead, we check if TEST_MODE logic was hit.
            self.assertIn(f"TEST MODE: Reading from {os.environ['TEST_MODE_INPUT_FILE']}", process.stdout)
            self.assertIn("Downloaded content for test mode.", process.stdout) # Check if the content was read

        if os.path.exists(os.environ['TEST_MODE_INPUT_FILE']):
            os.remove(os.environ['TEST_MODE_INPUT_FILE'])
        del os.environ['TEST_MODE_INPUT_FILE']


    @patch('requests.get')
    def test_download_fails(self, mock_requests_get):
        # Mock failed download
        mock_requests_get.side_effect = requests.exceptions.RequestException("Download failed")

        process = subprocess.run(
            [sys.executable, SCRIPT_NAME, self.test_url],
            capture_output=True, text=True, timeout=10
        )
        self.assertNotEqual(process.returncode, 0) # Script should indicate failure
        self.assertIn("Error downloading PDF from URL", process.stdout)
        self.assertIn("Failed to download the PDF", process.stdout)


    def test_text_extraction_preview_with_test_mode_local_file(self):
        # Test text extraction using TEST_MODE_INPUT_FILE with a "local" .txt file
        os.environ['TEST_MODE_INPUT_FILE'] = SAMPLE_TEXT_FILE
        
        process = subprocess.run(
            [sys.executable, SCRIPT_NAME, SAMPLE_TEXT_FILE], # Pass sample .txt file as arg
            capture_output=True, text=True, timeout=10
        )

        with open(SAMPLE_TEXT_FILE, 'r', encoding='utf-8') as f:
            expected_content = f.read()
        expected_preview = expected_content[:1000]

        self.assertIn(f"TEST MODE: Reading from {SAMPLE_TEXT_FILE}", process.stdout)
        self.assertIn("First 1000 characters of extracted text:", process.stdout)
        self.assertIn(expected_preview.strip(), process.stdout.strip())
        self.assertEqual(process.returncode, 0)
        
        del os.environ['TEST_MODE_INPUT_FILE']

    def test_argument_parsing_missing_argument(self):
        process = subprocess.run(
            [sys.executable, SCRIPT_NAME],
            capture_output=True, text=True, timeout=10
        )
        self.assertNotEqual(process.returncode, 0)
        self.assertIn("usage:", process.stderr)
        self.assertIn("required: pdf_input", process.stderr)

    def test_local_file_not_found(self):
        # Test providing a local file path that does not exist (and not in test mode for path)
        if 'TEST_MODE_INPUT_FILE' in os.environ: # Ensure not in test mode for this specific test
            del os.environ['TEST_MODE_INPUT_FILE']

        non_existent_file = "non_existent_local_file.pdf"
        process = subprocess.run(
            [sys.executable, SCRIPT_NAME, non_existent_file],
            capture_output=True, text=True, timeout=10
        )
        self.assertNotEqual(process.returncode, 0)
        self.assertIn(f"Error: Local PDF file not found at {non_existent_file}", process.stdout)
        self.assertIn("Invalid local file path provided", process.stdout)

if __name__ == '__main__':
    unittest.main()
