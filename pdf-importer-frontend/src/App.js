import React, { useState, useCallback } from 'react';
import PdfUpload from './PdfUpload'; // Assuming PdfUpload.js is in the same directory
import './App.css'; // Optional: for basic styling

function App() {
  const [unifiedData, setUnifiedData] = useState({ fiscal_reports: [], payment_invoices: [] });
  const [fetchMessage, setFetchMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // Define API base URL - adjust if your Flask app runs elsewhere
  const API_BASE_URL = 'http://127.0.0.1:5000'; // Flask default

  const handleUploadSuccess = (type) => (response) => {
    console.log(`${type} upload successful:`, response);
    // Optionally, trigger a fetch of unified data immediately after upload
    // handleFetchUnifiedData(); 
    alert(`${type} uploaded successfully. Preview: ${response.preview ? response.preview.substring(0,100)+'...' : 'N/A'}`);
  };

  const handleFetchUnifiedData = useCallback(async () => {
    setFetchMessage('Fetching unified data...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/unified_data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUnifiedData(data);
      setFetchMessage('Unified data fetched successfully.');
    } catch (error) {
      console.error("Failed to fetch unified data:", error);
      setFetchMessage(`Error fetching data: ${error.message}`);
      // Keep existing data or clear it, depending on desired behavior
      // setUnifiedData({ fiscal_reports: [], payment_invoices: [] }); 
    }
  }, []);

  const handleResetData = async () => {
    setResetMessage('Resetting data...');
    try {
      // Assuming your Flask API endpoint for reset is /api/reset_data
      // And it can accept DELETE or GET. For simplicity, using GET if no body needed.
      const response = await fetch(`${API_BASE_URL}/api/reset_data`, { method: 'DELETE' }); // Or 'GET'
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setResetMessage(result.message || 'Data reset successfully on server.');
      setUnifiedData({ fiscal_reports: [], payment_invoices: [] }); // Clear local data
    } catch (error) {
      console.error("Failed to reset data:", error);
      setResetMessage(`Error resetting data: ${error.message}`);
    }
  };

  // Simple data display function
  const renderData = (title, dataArray) => {
    if (!dataArray || dataArray.length === 0) {
      return <p>No {title.toLowerCase()} found.</p>;
    }
    return (
      <div>
        <h4>{title}</h4>
        <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
          {dataArray.map((item, index) => (
            <li key={index} style={{ background: '#f9f9f9', border: '1px solid #eee', padding: '8px', marginBottom: '5px', borderRadius: '4px' }}>
              <strong>Filename:</strong> {item.filename} <br />
              <strong>Status:</strong> {item.status} <br />
              <strong>Preview:</strong> {item.extracted_text_preview ? item.extracted_text_preview.substring(0, 200) + '...' : 'N/A'}
            </li>
          ))}
        </ul>
      </div>
    );
  };


  return (
    <div className="App" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header className="App-header">
        <h1>PDF Data Import System</h1>
      </header>

      <section id="upload-section" style={{ marginBottom: '30px' }}>
        <h2>Upload Documents</h2>
        <PdfUpload 
          uploadUrl={`${API_BASE_URL}/api/upload/fiscal_report`}
          fileTypeLabel="Fiscal Report"
          onUploadSuccess={handleUploadSuccess('Fiscal Report')}
        />
        <PdfUpload
          uploadUrl={`${API_BASE_URL}/api/upload/payment_invoice`}
          fileTypeLabel="Payment Invoice"
          onUploadSuccess={handleUploadSuccess('Payment Invoice')}
        />
      </section>

      <section id="actions-section" style={{ marginBottom: '30px' }}>
        <h2>Manage Data</h2>
        <button onClick={handleFetchUnifiedData} style={{ marginRight: '10px' }}>Fetch Unified Data</button>
        <button onClick={handleResetData}>Reset All Data on Server</button>
        {fetchMessage && <p>{fetchMessage}</p>}
        {resetMessage && <p>{resetMessage}</p>}
      </section>

      <section id="data-display-section">
        <h2>Unified Data View</h2>
        {renderData('Fiscal Reports', unifiedData.fiscal_reports)}
        {renderData('Payment Invoices', unifiedData.payment_invoices)}
      </section>
    </div>
  );
}

export default App;

// Basic CSS for App (optional, can be in App.css)
const styles = `
.App {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center; /* Basic centering for header */
}

.App-header {
  background-color: #282c34; /* Dark header example */
  padding: 20px;
  color: white;
  margin-bottom: 20px;
  border-radius: 5px;
}

/* Add more styles as needed for sections, buttons, etc. */
button {
  padding: 10px 15px;
  font-size: 1em;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  margin: 5px;
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
}
`;

// Inject styles (alternative to separate CSS file for simplicity in this context)
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
