import unittest
from unittest.mock import patch, mock_open, MagicMock
import subprocess
import os
import sys
import io

# Add the script's directory to sys.path to allow importing
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# The script to be tested
SCRIPT_NAME = "extract_fiscal_report_text.py"
# Path to the sample text file created earlier
SAMPLE_TEXT_FILE = "sample_fiscal.txt" 

class TestExtractFiscalReportText(unittest.TestCase):

    def setUp(self):
        # Ensure the sample text file exists for tests that need it
        if not os.path.exists(SAMPLE_TEXT_FILE):
            with open(SAMPLE_TEXT_FILE, "w") as f:
                f.write("This is sample fiscal text for testing.\n" * 5)
        
        # Store original environment variables
        self.original_env = os.environ.copy()

    def tearDown(self):
        # Restore original environment variables
        os.environ = self.original_env
        # Clean up sample file if created by setUp, but it's better to have it pre-exist
        # if os.path.exists(SAMPLE_TEXT_FILE) and "sample fiscal text for testing" in open(SAMPLE_TEXT_FILE).read():
        #     os.remove(SAMPLE_TEXT_FILE)


    @patch('subprocess.check_call')
    def test_download_if_file_not_exists(self, mock_check_call):
        # Test that download is attempted if PDF does not exist
        with patch('os.path.exists', return_value=False) as mock_os_exists:
            # Mock successful download
            def side_effect_check_call(*args, **kwargs):
                # Simulate file creation by download
                if args[0][0] in ["curl", "wget"] and args[0][2] == "non_existent.pdf": # Check output file arg
                    with open("non_existent.pdf", "w") as f: # Create dummy file
                        f.write("pdf content")
                return 0 
            mock_check_call.side_effect = side_effect_check_call
            
            # Mock open for the actual PDF reading after "download"
            # The script uses pdfminer.high_level.extract_text_to_fp which is hard to mock here simply
            # So we focus on the download attempt.
            # If we were to test the full flow, we'd need a dummy PDF and mock extract_text_to_fp
            # For now, we rely on TEST_MODE for extraction part or assume it errors out after download.
            with patch('builtins.open', mock_open(read_data=b"dummy pdf content")):
                 with patch('extract_fiscal_report_text.extract_text_to_fp', return_value=None) as mock_pdfminer_extract:
                    try:
                        # Run the script with a non-existent file path
                        subprocess.run([sys.executable, SCRIPT_NAME, "non_existent.pdf"], 
                                       capture_output=True, text=True, check=False, timeout=10)
                    except subprocess.TimeoutExpired:
                        self.fail(f"{SCRIPT_NAME} execution timed out during download test.")


            # Check that os.path.exists was called (first for non_existent.pdf, then after "download")
            self.assertGreaterEqual(mock_os_exists.call_count, 1) 
            # Check that subprocess.check_call was called for download (curl or wget)
            self.assertTrue(mock_check_call.called)
            
            # Clean up dummy file if created
            if os.path.exists("non_existent.pdf"):
                os.remove("non_existent.pdf")

    def test_text_extraction_preview_with_test_mode(self):
        # Test text extraction using the TEST_MODE_INPUT_FILE
        os.environ['TEST_MODE_INPUT_FILE'] = SAMPLE_TEXT_FILE
        
        process = subprocess.run(
            [sys.executable, SCRIPT_NAME, SAMPLE_TEXT_FILE], # Pass sample file as arg
            capture_output=True, text=True, timeout=10
        )

        # Read the expected content from the sample file
        with open(SAMPLE_TEXT_FILE, 'r', encoding='utf-8') as f:
            expected_content = f.read()
        
        expected_preview = expected_content[:1000]

        self.assertIn(f"TEST MODE: Reading from {SAMPLE_TEXT_FILE}", process.stdout)
        self.assertIn("First 1000 characters of extracted text:", process.stdout)
        # The actual preview will be after the marker.
        # process.stdout might contain other prints, so check if expected_preview is a substring
        self.assertIn(expected_preview.strip(), process.stdout.strip())
        self.assertEqual(process.returncode, 0)

    def test_argument_parsing_missing_argument(self):
        # Test script behavior when no argument is provided
        process = subprocess.run(
            [sys.executable, SCRIPT_NAME],
            capture_output=True, text=True, timeout=10
        )
        self.assertNotEqual(process.returncode, 0) # Should fail
        self.assertIn("usage:", process.stderr) # Standard argparse error
        self.assertIn("required: pdf_path", process.stderr)

    def test_file_not_found_and_download_fails(self):
        # Test when file doesn't exist and download also fails
        with patch('os.path.exists', return_value=False) as mock_os_exists:
            with patch('subprocess.check_call', side_effect=subprocess.CalledProcessError(1, 'cmd')) as mock_download:
                process = subprocess.run(
                    [sys.executable, SCRIPT_NAME, "truly_non_existent.pdf"],
                    capture_output=True, text=True, timeout=10
                )
                self.assertNotEqual(process.returncode, 0)
                self.assertIn("Error downloading PDF file", process.stdout) # Script prints to stdout for errors
                # It will try curl then wget
                self.assertEqual(mock_download.call_count, 2)

if __name__ == '__main__':
    unittest.main()
