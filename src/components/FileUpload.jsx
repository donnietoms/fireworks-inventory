import { useState, useRef } from 'react';
import { parseFile } from '../utils/fileParser';
import { parseVendorFile } from '../utils/vendorParsers';
import { useVendors } from '../hooks/useVendors';
import { API_BASE_URL } from '../config';
import './FileUpload.css';

const FileUpload = ({ type, onUpload, disabled, inventory = [] }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [selectedVendor, setSelectedVendor] = useState('auto'); // 'auto' or vendor id
  const [detectedVendor, setDetectedVendor] = useState(null);
  const [needsVendorSelection, setNeedsVendorSelection] = useState(false);
  const [previewVendor, setPreviewVendor] = useState(null); // Vendor selected in preview
  const [packingEdits, setPackingEdits] = useState({}); // Store packing edits: { partNumber: { packagesPerCase, itemsPerPackage } }
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
        
        // Use different endpoint for shoot lists vs invoices
        const endpoint = isInvoice ? '/api/parse-pdf' : '/api/parse-shootlist';
        
        // Add vendor hint if not auto-detect (invoices only)
        if (isInvoice) {
          const vendorToUse = retryWithVendor || (selectedVendor !== 'auto' ? selectedVendor : null);
          if (vendorToUse) {
            formData.append('vendor', vendorToUse);
          }
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          body: formData
        });
        
      if (!response.ok) {
        const error = await response.json();
        
        // If vendor detection failed, show vendor selector (invoices only)
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
        showInfo: result.showInfo || null, // For shoot lists
        savedFileName: result.savedFileName || null, // Store saved filename from backend
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
      // Apply packing edits to items before uploading (invoices only)
      const updatedItems = isInvoice ? preview.items.map(item => {
        if (packingEdits[item.partNumber]) {
          const { packagesPerCase, itemsPerPackage } = packingEdits[item.partNumber];
          const totalPacking = packagesPerCase * itemsPerPackage;
          const totalShells = item.casesOrdered * totalPacking;
          const costPerShell = item.cost / totalPacking; // item.cost is currently per case for missing packing
          
          return {
            ...item,
            cases: item.casesOrdered, // Number of cases
            packing: totalPacking, // Total items per case (numeric)
            packagesPerCase,
            itemsPerPackage,
            quantity: totalShells,
            cost: parseFloat(costPerShell.toFixed(2)),
            needsPacking: false
          };
        }
        return item;
      }) : preview.items;
      
      // Check if any items still need packing (invoices only)
      if (isInvoice) {
        const stillNeedPacking = updatedItems.filter(i => i.needsPacking);
        if (stillNeedPacking.length > 0) {
          alert(`Please enter packing format for all items:\n${stillNeedPacking.map(i => i.partNumber).join(', ')}`);
          return;
        }
      }
      
      // Pass order info if it's an invoice upload
      const orderInfo = isInvoice && preview.orderInfo ? {
        vendor: preview.vendor,
        orderNumber: preview.orderInfo.orderNumber,
        subtotal: preview.orderInfo.subtotal,
        discount: preview.orderInfo.discount,
        total: preview.orderInfo.total,
        savedFileName: preview.savedFileName // Include saved filename
      } : null;
      
      // Pass show info if it's a shoot list upload
      const showInfo = !isInvoice && preview.showInfo ? preview.showInfo : null;
      
      const warnings = onUpload(updatedItems, preview.fileName, isInvoice ? orderInfo : showInfo);
      
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
      setPackingEdits({});
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setPreviewVendor(null);
    setPackingEdits({});
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
      setPackingEdits({});
      await processFile(preview.originalFile, newVendor);
    }
  };

  const handlePackingChange = (partNumber, field, value) => {
    setPackingEdits(prev => ({
      ...prev,
      [partNumber]: {
        ...prev[partNumber],
        [field]: parseInt(value) || 1
      }
    }));
  };

  const getEffectivePacking = (item) => {
    if (packingEdits[item.partNumber]) {
      const { packagesPerCase = 1, itemsPerPackage = 1 } = packingEdits[item.partNumber];
      return { packagesPerCase, itemsPerPackage, total: packagesPerCase * itemsPerPackage };
    }
    if (item.packing) {
      return { 
        packagesPerCase: item.packagesPerCase, 
        itemsPerPackage: item.itemsPerPackage, 
        total: item.packagesPerCase * item.itemsPerPackage 
      };
    }
    return { packagesPerCase: 1, itemsPerPackage: 1, total: 1 };
  };

  const getEffectiveQuantity = (item) => {
    // If item already has quantity calculated (has packing), use it
    if (item.quantity !== null && !packingEdits[item.partNumber]) {
      return item.quantity;
    }
    // Otherwise calculate from cases and packing
    const packing = getEffectivePacking(item);
    return item.casesOrdered * packing.total;
  };

  const getEffectiveCost = (item) => {
    // If we have manual packing edits, recalculate cost per shell
    if (packingEdits[item.partNumber]) {
      const packing = getEffectivePacking(item);
      return item.cost / packing.total; // item.cost is per case for items that needed packing
    }
    // If item already has cost calculated (has packing), use it
    if (item.quantity !== null && !item.needsPacking) {
      return item.cost; // Already cost per shell
    }
    // For items missing packing, cost is still per case
    return item.cost;
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
          
          {/* Show show info if available */}
          {!isInvoice && preview.showInfo && (
            <div className="order-info">
              {preview.showInfo.name && (
                <div className="order-detail">
                  <span className="label">Show Name:</span>
                  <span className="value">{preview.showInfo.name}</span>
                </div>
              )}
              {preview.showInfo.date && (
                <div className="order-detail">
                  <span className="label">Date:</span>
                  <span className="value">{preview.showInfo.date}</span>
                </div>
              )}
              {preview.showInfo.location && (
                <div className="order-detail">
                  <span className="label">Location:</span>
                  <span className="value">{preview.showInfo.location}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Warning for items missing packing */}
          {isInvoice && preview.items.some(item => item.needsPacking) && (
            <div className="packing-warning" style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              padding: '12px',
              marginBottom: '12px',
              borderRadius: '4px'
            }}>
              <strong>⚠️ Missing Packing Information</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                {preview.items.filter(i => i.needsPacking).length} item(s) are missing packing format.
                Enter the packing (e.g., "24/1") in the table below before importing.
              </p>
            </div>
          )}
          
          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  {isInvoice ? (
                    <>
                      <th>Part Number</th>
                      <th>Description</th>
                      <th>Packing (Items/Case)</th>
                      <th>Quantity (Shells)</th>
                      <th>Cost/Shell</th>
                    </>
                  ) : (
                    <>
                      <th>Size</th>
                      <th>Part Number</th>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>In Inventory</th>
                      <th>Cost/Unit</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.items.map((item, idx) => {
                  const packing = getEffectivePacking(item);
                  const qty = getEffectiveQuantity(item);
                  const cost = getEffectiveCost(item);
                  
                  // For shoot lists, check if item is in inventory
                  const inventoryItems = !isInvoice ? inventory.filter(inv => inv.partNumber === item.partNumber) : [];
                  const hasInventory = inventoryItems.length > 0;
                  const inventoryQty = inventoryItems.reduce((sum, inv) => sum + inv.quantity, 0);
                  
                  // Calculate weighted average cost from all matching inventory items
                  let inventoryCost = 0;
                  if (hasInventory && inventoryQty > 0) {
                    const totalCost = inventoryItems.reduce((sum, inv) => sum + (inv.cost * inv.quantity), 0);
                    inventoryCost = totalCost / inventoryQty;
                  }
                  
                  return (
                    <tr key={idx} style={item.needsPacking && !packingEdits[item.partNumber] ? { background: '#fff3cd' } : {}}>
                      {isInvoice ? (
                        <>
                          <td>{item.partNumber}</td>
                          <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </td>
                          <td>
                            {item.needsPacking ? (
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Packages"
                                  value={packingEdits[item.partNumber]?.packagesPerCase || ''}
                                  onChange={(e) => handlePackingChange(item.partNumber, 'packagesPerCase', e.target.value)}
                                  style={{ width: '60px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                                <span>/</span>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Items"
                                  value={packingEdits[item.partNumber]?.itemsPerPackage || ''}
                                  onChange={(e) => handlePackingChange(item.partNumber, 'itemsPerPackage', e.target.value)}
                                  style={{ width: '60px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                              </div>
                            ) : (
                              `${packing.packagesPerCase}/${packing.itemsPerPackage}`
                            )}
                          </td>
                          <td>{item.casesOrdered} cases × {packing.total} = {qty} shells</td>
                          <td>${cost.toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td>{item.size}</td>
                          <td>{item.partNumber}</td>
                          <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </td>
                          <td>{item.quantity || 0}</td>
                          <td style={{ color: hasInventory ? 'green' : 'red' }}>
                            {hasInventory ? `✓ ${inventoryQty}` : '✗ Not in inventory'}
                          </td>
                          <td>
                            {hasInventory ? `$${inventoryCost.toFixed(2)}` : 'N/A'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
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
