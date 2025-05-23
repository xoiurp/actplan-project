import React, { useState } from 'react';

function PdfUpload({ uploadUrl, fileTypeLabel, onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage(''); // Clear previous messages
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    setIsUploading(true);
    setMessage(`Uploading ${fileTypeLabel}...`);

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`${fileTypeLabel} uploaded successfully! Preview: ${result.preview ? result.preview.substring(0,100)+'...' : 'N/A'}`);
        if (onUploadSuccess) {
          onUploadSuccess(result);
        }
      } else {
        setMessage(`Error uploading ${fileTypeLabel}: ${result.error || response.statusText}`);
      }
    } catch (error) {
      setMessage(`Network error during ${fileTypeLabel} upload: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setSelectedFile(null); // Clear file input
      // Optionally reset the file input element itself
      const fileInput = document.querySelector(`input[type="file"][aria-label="${fileTypeLabel}"]`);
      if (fileInput) {
        fileInput.value = ""; 
      }
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
      <h4>Upload {fileTypeLabel}</h4>
      <input 
        type="file" 
        accept=".pdf" 
        onChange={handleFileChange} 
        disabled={isUploading}
        aria-label={fileTypeLabel} // For potentially resetting the input
      />
      <button onClick={handleUpload} disabled={isUploading || !selectedFile}>
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
      {message && <p style={{ marginTop: '10px', fontSize: '0.9em' }}>{message}</p>}
    </div>
  );
}

export default PdfUpload;
