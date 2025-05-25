import React from 'react';

// Helper to format currency
const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = parseFloat(value);
  if (isNaN(num)) return 'N/A';
  return `R$ ${num.toFixed(2)}`; // Basic Brazilian Real formatting
};

// Helper to format dates (assuming input is DD/MM/YYYY or can be parsed)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  // If it's already in DD/MM/YYYY, just return. Otherwise, try to parse if needed.
  // For this component, we assume the API provides it in a displayable format or null.
  // The API's _parse_date handles conversion to datetime objects, but the JSON response will have strings.
  // Let's assume the string format is already "DD/MM/YYYY" from the backend.
  return dateString;
};

// Helper to display N/A for null or empty values
const displayValue = (value, type = 'text') => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'N/A';
  }
  if (type === 'currency') return formatCurrency(value);
  if (type === 'date') return formatDate(value);
  if (Array.isArray(value)) { // For discrepancy_notes
    return value.join('; ');
  }
  return String(value);
};

function UnifiedDataTable({ unified_records }) {
  if (!unified_records || unified_records.length === 0) {
    return <p>No unified data available to display.</p>;
  }

  const tableStyles = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
    fontSize: '0.9em',
  };
  const thTdStyles = {
    border: '1px solid #ddd',
    padding: '8px',
    textAlign: 'left',
  };
  const thStyles = {
    ...thTdStyles,
    backgroundColor: '#f2f2f2',
    fontWeight: 'bold',
  };

  return (
    <div style={{ overflowX: 'auto' }}> {/* For responsive handling of wide tables */}
      <table style={tableStyles}>
        <thead>
          <tr>
            <th style={thStyles}>Taxpayer ID</th>
            <th style={thStyles}>Taxpayer Name</th>
            <th style={thStyles}>Assessment Period</th>
            <th style={thStyles}>Tax Type</th>
            <th style={thStyles}>Fiscal Due Date</th>
            <th style={thStyles}>Fiscal Calc. Amount</th>
            <th style={thStyles}>Payment Date</th>
            <th style={thStyles}>Payment Principal</th>
            <th style={thStyles}>Penalty</th>
            <th style={thStyles}>Interest</th>
            <th style={thStyles}>Total Paid</th>
            <th style={thStyles}>Payment Status</th>
            <th style={thStyles}>Discrepancy Notes</th>
            <th style={thStyles}>Fiscal Source</th>
            <th style{...thStyles}>Payment Source</th>
          </tr>
        </thead>
        <tbody>
          {unified_records.map((record, index) => (
            <tr key={index}>
              <td style={thTdStyles}>{displayValue(record.taxpayer_id)}</td>
              <td style={thTdStyles}>{displayValue(record.taxpayer_name)}</td>
              <td style={thTdStyles}>{displayValue(record.assessment_period)}</td>
              <td style={thTdStyles}>{displayValue(record.tax_type_description || record.tax_type_code)}</td>
              <td style={thTdStyles}>{displayValue(record.fiscal_due_date, 'date')}</td>
              <td style={thTdStyles}>{displayValue(record.fiscal_calculated_tax_amount, 'currency')}</td>
              <td style={thTdStyles}>{displayValue(record.payment_date, 'date')}</td>
              <td style={thTdStyles}>{displayValue(record.payment_principal_amount, 'currency')}</td>
              <td style={thTdStyles}>{displayValue(record.payment_penalty_amount, 'currency')}</td>
              <td style={thTdStyles}>{displayValue(record.payment_interest_amount, 'currency')}</td>
              <td style={thTdStyles}>{displayValue(record.payment_total_amount, 'currency')}</td>
              <td style={thTdStyles}>{displayValue(record.payment_status)}</td>
              <td style={thTdStyles}>{displayValue(record.discrepancy_notes)}</td>
              <td style={thTdStyles}>{displayValue(record.source_file)}</td>
              <td style={thTdStyles}>{displayValue(record.payment_source_file)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UnifiedDataTable;
