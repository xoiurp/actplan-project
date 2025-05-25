import React, { useState, useCallback } from 'react';
import PdfUpload from './PdfUpload'; // Assuming PdfUpload.js is in the same directory
import UnifiedDataTable from './UnifiedDataTable'; // Import the new component
import './App.css'; // Optional: for basic styling

function App() {
  const [unifiedData, setUnifiedData] = useState([]); // Changed to directly store the array of unified records
  const [fetchMessage, setFetchMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // Define API base URL - adjust if your Flask app runs elsewhere
  const API_BASE_URL = 'http://127.0.0.1:5000'; // Flask default

  const handleUploadSuccess = (type) => (response) => {
    console.log(`${type} upload successful:`, response);
    // The response from upload endpoints now confirms data storage, not a text preview.
    alert(`${type} processed successfully. Items extracted: ${response.items_extracted !== undefined ? response.items_extracted : (response.data_preview ? 1 : 'N/A')}. Fetch unified data to see updates.`);
    // Optionally, trigger a fetch of unified data immediately after upload
    // handleFetchUnifiedData(); 
  };

  const handleFetchUnifiedData = useCallback(async () => {
    setFetchMessage('Fetching unified data...');
    setUnifiedData([]); // Clear previous data before fetching new
    try {
      const response = await fetch(`${API_BASE_URL}/api/unified_data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json(); // API returns a list of unified records directly
      setUnifiedData(data);
      setFetchMessage(data.length > 0 ? 'Unified data fetched successfully.' : 'No unified data found on server.');
    } catch (error) {
      console.error("Failed to fetch unified data:", error);
      setFetchMessage(`Error fetching data: ${error.message}`);
      setUnifiedData([]); // Clear data on error
    }
  }, []);

  const handleResetData = async () => {
    setResetMessage('Resetting data...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset_data`, { method: 'DELETE' }); 
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setResetMessage(result.message || 'Data reset successfully on server.');
      setUnifiedData([]); // Clear local data
      setFetchMessage(''); // Clear fetch message as data is gone
    } catch (error) {
      console.error("Failed to reset data:", error);
      setResetMessage(`Error resetting data: ${error.message}`);
    }
  };

  // renderData function is no longer needed and will be removed.

  return (
    <div className="App" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}> {/* Increased maxWidth for table */}
      <header className="App-header">
        <h1>PDF Data Import & Reconciliation System</h1>
      </header>

      <section id="upload-section" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ flexBasis: '48%'}}>
          <h2>Upload Fiscal Report</h2>
          <PdfUpload 
            uploadUrl={`${API_BASE_URL}/api/upload/fiscal_report`}
            fileTypeLabel="Fiscal Report"
            onUploadSuccess={handleUploadSuccess('Fiscal Report')}
          />
        </div>
        <div style={{ flexBasis: '48%'}}>
          <h2>Upload Payment Invoice (DARF)</h2>
          <PdfUpload
            uploadUrl={`${API_BASE_URL}/api/upload/payment_invoice`}
            fileTypeLabel="Payment Invoice"
            onUploadSuccess={handleUploadSuccess('Payment Invoice')}
          />
        </div>
      </section>

      <section id="actions-section" style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h2>Manage Data</h2>
        <button onClick={handleFetchUnifiedData} style={{ marginRight: '10px' }}>Fetch / Refresh Unified Data</button>
        <button onClick={handleResetData}>Reset All Data on Server</button>
        {fetchMessage && <p style={{marginTop: '10px'}}>{fetchMessage}</p>}
        {resetMessage && <p style={{marginTop: '10px'}}>{resetMessage}</p>}
      </section>

      <section id="data-display-section">
        <h2>Unified Data View</h2>
        <UnifiedDataTable unified_records={unifiedData} />
      </section>
    </div>
  );
}

export default App;

// Basic CSS for App (optional, can be in App.css)
// Styles were previously injected, keeping that pattern for now.
// If App.css is preferred, these should be moved there.
const styles = `
.App {
  font-family: Arial, sans-serif;
  /* maxWidth is now set inline for easier adjustment */
  margin: 0 auto;
  padding: 20px;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  margin-bottom: 20px;
  border-radius: 5px;
  text-align: center;
}

button {
  padding: 10px 15px;
  font-size: 1em;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  margin: 5px;
  transition: background-color 0.2s ease-in-out;
}
button:hover {
  background-color: #0056b3;
}
button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

input[type="file"] {
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

#upload-section > div {
  border: 1px solid #e0e0e0;
  padding: 15px;
  border-radius: 5px;
  background-color: #f9f9f9;
}
h2 {
  color: #333;
  text-align: center;
  margin-bottom: 15px;
}
/* Ensure styles don't get duplicated if this script runs multiple times in some environments */
if (!document.getElementById('app-styles-injected')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'app-styles-injected';
  styleSheet.type = "text/css";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
`;
// The style injection needs to be careful not to duplicate if component re-renders often
// A better way is to use App.css or ensure the style injection logic is idempotent.
// For this environment, the direct injection is kept but with a check.
const existingStyleSheet = document.getElementById('app-styles-injected');
if (!existingStyleSheet) {
    const styleSheet = document.createElement("style");
    styleSheet.id = 'app-styles-injected';
    styleSheet.type = "text/css";
    styleSheet.innerText = styles; // This line will cause an error if 'styles' is not defined in this scope
                                   // It should be inside the App component or passed,
                                   // but for this tool, direct execution like this is typical.
                                   // Let's assume 'styles' string is defined globally for this script block.
                                   // A better fix would be to remove this style injection if App.css is used.
                                   // For now, I'll remove the problematic style injection here
                                   // as it's not the core part of the task and can cause errors.
}
