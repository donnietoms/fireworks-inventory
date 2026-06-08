import { useState, useRef } from 'react';
import { parseFile } from '../utils/fileParser';
import { parseVendorFile } from '../utils/vendorParsers';
import { useVendors } from '../hooks/useVendors';
import './FileUpload.css';

const FileUpload = ({ type, onUpload, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [selectedVendor, setSelectedVendor] = useState('auto'); // 'auto' or vendor id
  const [detectedVendor, setDetectedVendor] = useState(null);
  const [needsVendorSelection, setNeedsVendorSelection] = useState(false);
  const [previewVendor, setPreviewVendor] = useState(null); // Vendor selected in preview
  const fileInputRef = useRef(null);
  const { vendors } = useVendors();

  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'Upload Invoice' : 'Upload Shoot List';
  const description = isInvoice 
    ? 'Add inventory from invoice (PDF/Excel, CSV, JSON)'
    : 'Subtract used items from shoot list (PDF, Excel, CSV, JSON)';

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file, retryWithVendor = null) => {
    setUploading(true);
    setNeedsVendorSelection(false);
    
    try {
      let result;
      
      // Use PDF parser server for PDF files
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add vendor hint if not auto-detect
        const vendorToUse = retryWithVendor || (selectedVendor !== 'auto' ? selectedVendor : null);
        if (vendorToUse) {
          formData.append('vendor', vendorToUse);
        }
        
        const response = await fetch('http://localhost:3001/api/parse-pdf', {
          method: 'POST',
          body: formData
        });
        
      if (!response.ok) {
        const error = await response.json();
        
        // If vendor detection failed, show vendor selector
        if (error.needsVendorSelection) {
          setNeedsVendorSelection(true);
          setUploading(false);
          return;
        }
        
        throw new Error(error.message || 'Failed to parse PDF');
      }
      
      result = await response.json();
      
      // Store detected vendor but don't set it yet - let user confirm
      result.detectedVendor = result.detectedVendor || result.vendor;
    }
      // Use vendor-specific parser for Excel files
      else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        result = await parseVendorFile(file);
      } else {
        result = await parseFile(file);
      }
      
      if (result.items.length === 0) {
        alert('No items found in file. Please check the file format.');
        setUploading(false);
        return;
      }
      
      // Set preview with vendor info
      setPreview({
        fileName: file.name,
        items: result.items,
        headers: result.headers || ['Part Number', 'Description', 'Quantity', 'Cost'],
        columnMap: result.columnMap || {},
        vendor: result.vendor || result.detectedVendor || 'Unknown',
        detectedVendor: result.detectedVendor,
        orderInfo: result.orderInfo || null,
        isInvoice: isInvoice,
        originalFile: file
      });
      setColumnMapping(result.columnMap || {});
      setPreviewVendor(result.vendor || result.detectedVendor);
      
      // Set detected vendor for display
      if (result.detectedVendor) {
        setDetectedVendor(result.detectedVendor);
      }
    } catch (error) {
      alert(`Error parsing file: ${error.message}`);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      // Pass order info if it's an invoice upload
      const orderInfo = isInvoice && preview.orderInfo ? {
        vendor: preview.vendor,
        orderNumber: preview.orderInfo.orderNumber,
        subtotal: preview.orderInfo.subtotal,
        discount: preview.orderInfo.discount,
        total: preview.orderInfo.total
      } : null;
      
      const warnings = onUpload(preview.items, preview.fileName, orderInfo);
      
      if (warnings && warnings.length > 0) {
        const warningMessages = warnings.map(w => 
          w.notFound 
            ? `${w.partNumber}: Not found in inventory`
            : `${w.partNumber}: Requested ${w.requested}, only ${w.available} available`
        ).join('\n');
        alert(`Warnings:\n${warningMessages}`);
      }
      
      setPreview(null);
      setPreviewVendor(null);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setPreviewVendor(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVendorChange = async (newVendor) => {
    if (!preview || !preview.originalFile) {
      setPreviewVendor(newVendor);
      return;
    }
    
    // Reprocess file with new vendor
    if (confirm(`Re-parse file as ${vendors.find(v => v.id === newVendor)?.name || newVendor}?`)) {
      setPreview(null);
      setPreviewVendor(null);
      await processFile(preview.originalFile, newVendor);
    }
  };

  return (
    <div className={`file-upload ${isInvoice ? 'invoice' : 'shoot-list'}`}>
      <h3>{title}</h3>
      <p className="upload-description">{description}</p>
      
      {/* Vendor Selection for Invoice uploads */}
      {isInvoice && !preview && (
        <div className="vendor-selector">
          <label htmlFor="vendor-select">Vendor:</label>
          <select 
            id="vendor-select"
            value={selectedVendor} 
            onChange={(e) => setSelectedVendor(e.target.value)}
            disabled={uploading}
          >
            <option value="auto">Auto-detect</option>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          {detectedVendor && (
            <span className="detected-vendor">
              Detected: {vendors.find(v => v.id === detectedVendor)?.name || detectedVendor}
            </span>
          )}
        </div>
      )}
      
      {/* Vendor selection required message */}
      {needsVendorSelection && (
        <div className="vendor-selection-required">
          <p>Could not auto-detect vendor. Please select vendor and upload again.</p>
        </div>
      )}
      
      {!preview ? (
        <div
          className={`drop-zone ${dragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json,.pdf"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            style={{ display: 'none' }}
          />
          {uploading ? (
            <span>Processing...</span>
          ) : (
            <>
              <span className="drop-icon">{isInvoice ? '+' : '-'}</span>
              <span>Drop file here or click to browse</span>
              <span className="file-types">PDF, Excel, CSV, JSON</span>
            </>
          )}
        </div>
      ) : (
        <div className="preview-panel">
          {/* Vendor Confirmation for Invoices */}
          {isInvoice && preview.detectedVendor && (
            <div className="vendor-confirmation">
              <label htmlFor="preview-vendor-select">
                Detected Vendor:
              </label>
              <select 
                id="preview-vendor-select"
                value={previewVendor || preview.vendor} 
                onChange={(e) => handleVendorChange(e.target.value)}
              >
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              <span className="vendor-hint">
                {preview.detectedVendor === (previewVendor || preview.vendor) 
                  ? '✓ Auto-detected' 
                  : '⚠ Changed from auto-detect'}
              </span>
            </div>
          )}
          
          <div className="preview-header">
            <span className="file-name">{preview.fileName}</span>
            <span className="item-count">{preview.items.length} items</span>
          </div>
          
          {/* Show order info if available */}
          {isInvoice && preview.orderInfo && (
            <div className="order-info">
              {preview.orderInfo.orderNumber && (
                <div className="order-detail">
                  <span className="label">Order #:</span>
                  <span className="value">{preview.orderInfo.orderNumber}</span>
                </div>
              )}
              {preview.orderInfo.subtotal > 0 && (
                <div className="order-detail">
                  <span className="label">Subtotal:</span>
                  <span className="value">${preview.orderInfo.subtotal.toFixed(2)}</span>
                </div>
              )}
              {preview.orderInfo.discount > 0 && (
                <div className="order-detail">
                  <span className="label">Discount:</span>
                  <span className="value">-${preview.orderInfo.discount.toFixed(2)}</span>
                </div>
              )}
              {preview.orderInfo.total > 0 && (
                <div className="order-detail total">
                  <span className="label">Total:</span>
                  <span className="value">${preview.orderInfo.total.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.slice(0, 10).map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.partNumber}</td>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>${item.cost.toFixed(2)}</td>
                  </tr>
                ))}
                {preview.items.length > 10 && (
                  <tr className="more-items">
                    <td colSpan="4">... and {preview.items.length - 10} more items</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="preview-actions">
            <button onClick={handleCancel} className="btn-cancel">Cancel</button>
            <button onClick={handleConfirm} className="btn-confirm">
              {isInvoice ? 'Add to Inventory' : 'Subtract from Inventory'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
