// Generic CSV/Excel import modal
import { useState, useRef } from 'react';
import { parseCSV, parseExcel } from '../utils/fileParser';
import './GenericImportModal.css';

function GenericImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [vendor, setVendor] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setLoading(true);

    try {
      let result;
      const fileName = selectedFile.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        result = await parseCSV(selectedFile);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        result = await parseExcel(selectedFile);
      } else {
        setError('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
        setLoading(false);
        return;
      }

      if (!result.items || result.items.length === 0) {
        setError('No items found in file. Please check the file format.');
        setLoading(false);
        return;
      }

      setPreview({
        fileName: selectedFile.name,
        items: result.items,
        totalItems: result.items.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: result.items.reduce((sum, item) => sum + (item.quantity * item.cost), 0)
      });
    } catch (err) {
      setError(`Error parsing file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;

    // Validate required fields
    if (!orderNumber.trim()) {
      setError('Please enter an order number');
      return;
    }

    if (!vendor.trim()) {
      setError('Please enter a vendor name');
      return;
    }

    // Create order metadata
    const orderInfo = {
      vendor: vendor.trim(),
      orderNumber: orderNumber.trim(),
      orderDate: orderDate,
      subtotal: preview.totalValue,
      discount: 0,
      total: preview.totalValue
    };

    onImport(preview.items, preview.fileName, orderInfo);

    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError('');
    setLoading(false);
    setOrderNumber('');
    setVendor('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content generic-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Generic CSV/Excel</h2>
          <button className="btn-close" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body">
          {!preview ? (
            <div className="upload-section">
              <div className="format-info">
                <h3>Required Format</h3>
                <p>Your file should have these columns:</p>
                <ul>
                  <li><strong>Part Number</strong> (or Product ID, SKU, Item #)</li>
                  <li><strong>Description</strong> (or Name, Title)</li>
                  <li><strong>Quantity</strong> (or Qty, Count, Amount)</li>
                  <li><strong>Cost</strong> (or Price, Unit Cost) - optional</li>
                </ul>
                <p className="note">
                  Column names are flexible - the parser will automatically detect variations.
                </p>
              </div>

              <div className="file-input-wrapper">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="file-input"
                  id="generic-file-input"
                />
                <label htmlFor="generic-file-input" className="file-input-label">
                  {file ? file.name : '📂 Choose CSV or Excel File'}
                </label>
              </div>

              {error && <div className="error-message">{error}</div>}
              {loading && <div className="loading-message">Parsing file...</div>}

              <div className="example-section">
                <h4>Example CSV:</h4>
                <pre className="code-block">
{`Part Number,Description,Quantity,Cost
SE172,Shell Effect,100,2.50
WPI-6-GTW,6" Titanium Willow,50,15.00
AM-3-BGC,3" Brocade Crown,200,3.75`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="preview-section">
              <div className="order-info-section">
                <h3>Order Information</h3>
                <div className="order-info-grid">
                  <div className="form-group">
                    <label htmlFor="orderNumber">Order Number *</label>
                    <input
                      id="orderNumber"
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g., PO-12345"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="vendor">Vendor *</label>
                    <input
                      id="vendor"
                      type="text"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      placeholder="e.g., Wisley, Kellner's"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="orderDate">Order Date *</label>
                    <input
                      id="orderDate"
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="preview-header">
                <h3>Preview: {preview.fileName}</h3>
                <p>{preview.items.length} products • {preview.totalItems} total items • ${preview.totalValue.toFixed(2)} total value</p>
              </div>

              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Part Number</th>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Cost/Unit</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.partNumber}</td>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>${item.cost.toFixed(2)}</td>
                        <td>${(item.quantity * item.cost).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td><strong>TOTAL</strong></td>
                      <td></td>
                      <td><strong>{preview.totalItems}</strong></td>
                      <td></td>
                      <td><strong>${preview.totalValue.toFixed(2)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={handleClose} className="btn-cancel">
            {preview ? 'Cancel' : 'Close'}
          </button>
          {preview && (
            <button onClick={handleImport} className="btn-submit">
              Import {preview.items.length} Products
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GenericImportModal;
