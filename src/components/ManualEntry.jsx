import { useState } from 'react';
import Papa from 'papaparse';
import './ManualEntry.css';

const ManualEntry = ({ type, onUpload }) => {
  const [textInput, setTextInput] = useState('');
  const isInvoice = type === 'invoice';

  const handleParse = () => {
    const lines = textInput.split('\n').filter(line => line.trim());
    const items = [];

    for (const line of lines) {
      // Try tab-separated values first
      let parts = line.split('\t').map(p => p.trim());
      
      // If not tabs, try multiple spaces
      if (parts.length < 4) {
        parts = line.split(/\s{2,}/).map(p => p.trim());
      }
      
      // If still not enough parts, try comma
      if (parts.length < 4) {
        parts = line.split(',').map(p => p.trim());
      }

      // Extract part number, description, quantity, price
      let partNumber = '';
      let description = '';
      let quantity = 0;
      let cost = 0;

      // Look for part number pattern
      const partMatch = line.match(/\b([A-Z]{2,4}-\d+-[A-Z]{2,4})\b/i) ||
                       line.match(/\b([A-Z]{2,4}-\d+)\b/i);
      
      if (partMatch) {
        partNumber = partMatch[1];
      } else if (parts.length > 0) {
        partNumber = parts[0];
      }

      // Get numbers from the line
      const numbers = line.match(/\d+\.?\d*/g) || [];
      const decimals = numbers.filter(n => n.includes('.')).map(parseFloat);
      const wholes = numbers.filter(n => !n.includes('.') && !partNumber.includes(n)).map(parseInt);

      // Quantity is usually a small whole number
      if (wholes.length > 0) {
        const small = wholes.filter(n => n > 0 && n < 500);
        quantity = small[0] || wholes[0] || 1;
      }

      // Cost is usually second-to-last decimal (last is subtotal)
      if (decimals.length >= 2) {
        cost = decimals[decimals.length - 2];
      } else if (decimals.length === 1) {
        cost = decimals[0];
      }

      // Description is what's left
      if (partNumber) {
        const afterPN = line.substring(line.indexOf(partNumber) + partNumber.length);
        const descMatch = afterPN.match(/[\s-]*([A-Za-z][A-Za-z0-9\s\-'"()\/]+)/);
        if (descMatch) {
          description = descMatch[1].trim();
          description = description.replace(/\s*\d+\/\d+.*$/, '').trim();
          description = description.replace(/\s+\d+\.\d+.*$/, '').trim();
        }
      }

      if (partNumber && partNumber.length > 1) {
        items.push({
          partNumber,
          description: description || '',
          quantity: quantity || 1,
          cost: cost || 0
        });
      }
    }

    if (items.length > 0) {
      onUpload(items, 'Manual Entry');
      setTextInput('');
    } else {
      alert('No items found. Please check the format.');
    }
  };

  const handleClear = () => {
    setTextInput('');
  };

  return (
    <div className={`manual-entry ${isInvoice ? 'invoice' : 'shoot-list'}`}>
      <h3>Manual Entry / Paste from PDF</h3>
      <p className="entry-description">
        Copy and paste rows from your PDF invoice. Each line should contain: Part Number, Description, Quantity, Price
      </p>
      
      <textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder={`Example:
FK-8-GTW    Flower King - 8" Shell - Gold ti willow - 1/1    4    113.00    452.00
WPI-6-GTW   WPI - 6" Shell - Gold ti willow - 9/1           2    255.00    510.00
AM-3-BGC    AM - 3" Shell - Platinum breaking glass         25   13.00     325.00`}
        rows={12}
        className="text-input"
      />
      
      <div className="entry-actions">
        <button onClick={handleClear} className="btn-clear">Clear</button>
        <button onClick={handleParse} className="btn-parse">
          {isInvoice ? 'Add to Inventory' : 'Subtract from Inventory'}
        </button>
      </div>
      
      <div className="entry-tips">
        <strong>Tips:</strong>
        <ul>
          <li>Select text from PDF and paste directly</li>
          <li>One item per line</li>
          <li>Works best with tab or space-separated data</li>
        </ul>
      </div>
    </div>
  );
};

export default ManualEntry;
