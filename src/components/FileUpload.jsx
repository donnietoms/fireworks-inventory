import { useState, useRef } from 'react';
import { parseFile, parseShootListCSV, parseShootListExcel } from '../utils/fileParser';
import { parseVendorFile } from '../utils/vendorParsers';
import { useVendors } from '../hooks/useVendors';
import { API_BASE_URL } from '../config';
import './FileUpload.css';

// Map vendor IDs to display names
const VENDOR_DISPLAY_NAMES = {
  'wisley': 'Wisley Pyrotechnics',
  'spiritof76': 'Spirit of 76',
  'americanwholesale': 'American Wholesale Fireworks',
  'fireworksforever': 'Fireworks Forever'
};

// Helper function to get vendor display name
const getVendorName = (vendorId) => {
  return VENDOR_DISPLAY_NAMES[vendorId] || vendorId || 'Unknown';
};

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
  const [missingPartNumbers, setMissingPartNumbers] = useState({}); // Store part number edits: { itemIndex: newPartNumber }
  const [isGenericImport, setIsGenericImport] = useState(false); // Track if this is a generic import
  const [genericOrderNumber, setGenericOrderNumber] = useState('');
  const [genericVendor, setGenericVendor] = useState('');
  const [genericOrderDate, setGenericOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [partNumberEdits, setPartNumberEdits] = useState({}); // Store part number edits for show list items: { originalPartNumber: newPartNumber }
  const [partNumberSearches, setPartNumberSearches] = useState({}); // Track search input for each dropdown: { originalPartNumber: searchTerm }
  const [showName, setShowName] = useState(''); // For shoot list uploads
  const [showDate, setShowDate] = useState(new Date().toISOString().split('T')[0]); // For shoot list uploads
  const [invoiceOrderDate, setInvoiceOrderDate] = useState(''); // For invoice uploads that need order date
  const fileInputRef = useRef(null);
  const { vendors } = useVendors();

  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'Upload Invoice' : 'Upload Shoot List';
  const description = isInvoice 
    ? 'Add inventory from invoice (PDF from vendor or generic CSV/Excel)'
    : 'Subtract used items from shoot list (Finale 3D PDF or CSV/Excel)';

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
       // For shoot lists, handle CSV/Excel with dedicated parsers
       else if (!isInvoice && (file.name.toLowerCase().endsWith('.csv') || 
                                file.name.toLowerCase().endsWith('.txt'))) {
         result = await parseShootListCSV(file);
       }
       else if (!isInvoice && (file.name.toLowerCase().endsWith('.xlsx') || 
                                file.name.toLowerCase().endsWith('.xls'))) {
         result = await parseShootListExcel(file);
       }
       // For invoices, use vendor-specific parser for Excel files
       else if (isInvoice && (file.name.toLowerCase().endsWith('.xlsx') || 
                              file.name.toLowerCase().endsWith('.xls'))) {
         result = await parseVendorFile(file);
       } 
       // For invoices, handle CSV
       else if (isInvoice && file.name.toLowerCase().endsWith('.csv')) {
         result = await parseFile(file);
       }
       else {
         throw new Error('Unsupported file format');
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
        vendor: getVendorName(result.vendor || result.detectedVendor) || 'Unknown',
        detectedVendor: result.detectedVendor,
        orderInfo: result.orderInfo || null,
        showInfo: result.showInfo || null, // For shoot lists
        savedFileName: result.savedFileName || null, // Store saved filename from backend
        isInvoice: isInvoice,
        originalFile: file
      });
      setColumnMapping(result.columnMap || {});
      setPreviewVendor(result.vendor || result.detectedVendor);
      
      // Pre-fill order date if parser found one
      if (isInvoice && result.orderInfo?.orderDate) {
        // Convert YYYY-MM-DD to MM/DD/YYYY for display
        const [year, month, day] = result.orderInfo.orderDate.split('-');
        setInvoiceOrderDate(`${month}/${day}/${year}`);
      } else {
        setInvoiceOrderDate('');
      }
      
      // Check if this is a generic import (CSV/Excel without vendor info)
      const fileName = file.name.toLowerCase();
      const isCSVOrExcel = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const hasVendorInfo = result.vendor || result.detectedVendor || result.orderInfo;
      
      if (isInvoice && isCSVOrExcel && !hasVendorInfo) {
        setIsGenericImport(true);
      } else {
        setIsGenericImport(false);
      }
      
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
      // For generic imports, validate required fields
      if (isGenericImport) {
        if (!genericOrderNumber.trim()) {
          alert('Please enter an order number');
          return;
        }
        if (!genericVendor.trim()) {
          alert('Please enter a vendor name');
          return;
        }
      }
      
      // For invoices, validate the date field (PDF only, not generic imports)
      if (isInvoice && !isGenericImport && !invoiceOrderDate.trim()) {
        alert('Please enter the order date (MM/DD/YYYY)');
        return;
      }
      
      // For shoot lists, validate show date
      if (!isInvoice && !showDate.trim()) {
        alert('Please enter a show date');
        return;
      }
      
      // Apply packing edits and part number edits to items before uploading (invoices only)
      const updatedItems = isInvoice ? preview.items.map((item, idx) => {
        let updatedItem = { ...item };
        
        // Apply missing part number if provided
        if (missingPartNumbers[idx]) {
          updatedItem.partNumber = missingPartNumbers[idx];
          updatedItem.needsPartNumber = false;
        }
        
        // Apply packing edits
        if (packingEdits[updatedItem.partNumber]) {
          const { packagesPerCase, itemsPerPackage } = packingEdits[updatedItem.partNumber];
          const totalPacking = packagesPerCase * itemsPerPackage;
          const totalItems = updatedItem.cases * packagesPerCase * itemsPerPackage;
          const costPerItem = updatedItem.lineTotal / totalItems;
          
          updatedItem = {
            ...updatedItem,
            cases: updatedItem.cases, // Number of cases
            packing: totalPacking, // Total items per case (numeric)
            packagesPerCase,
            itemsPerPackage,
            quantity: totalItems,
            cost: costPerItem,
            needsPacking: false
          };
        }
        
        return updatedItem;
      }) : preview.items.map((item, idx) => {
        let updatedItem = { ...item };
        
        // Apply missing part number if provided
        if (missingPartNumbers[idx]) {
          updatedItem.partNumber = missingPartNumbers[idx];
          updatedItem.needsPartNumber = false;
        }
        
        // Apply part number edits for show list items
        if (partNumberEdits[updatedItem.partNumber] && partNumberEdits[updatedItem.partNumber] !== updatedItem.partNumber) {
          updatedItem = {
            ...updatedItem,
            partNumber: partNumberEdits[updatedItem.partNumber]
          };
        }
        
        return updatedItem;
      });
      
      // Check if any items still need part numbers
      const stillNeedPartNumbers = updatedItems.filter(i => i.needsPartNumber);
      if (stillNeedPartNumbers.length > 0) {
        alert(`Please enter part numbers for all items missing them.`);
        return;
      }
      
      // Check if any items still need packing (invoices only, but not for generic imports)
      if (isInvoice && !isGenericImport) {
        const stillNeedPacking = updatedItems.filter(i => i.needsPacking);
        if (stillNeedPacking.length > 0) {
          alert(`Please enter packing format for all items:\n${stillNeedPacking.map(i => i.partNumber).join(', ')}`);
          return;
        }
      }
      
      // Create order info for generic imports or use existing orderInfo
      let orderInfo;
      if (isGenericImport) {
        const totalValue = updatedItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
        orderInfo = {
          vendor: genericVendor.trim(),
          orderNumber: genericOrderNumber.trim(),
          orderDate: genericOrderDate,
          subtotal: totalValue,
          discount: 0,
          total: totalValue
        };
      } else if (isInvoice && preview.orderInfo) {
        // Parse MM/DD/YYYY to YYYY-MM-DD if invoiceOrderDate is provided, otherwise use parser date
        let orderDate = invoiceOrderDate ? null : preview.orderInfo.orderDate;
        if (invoiceOrderDate) {
          const dateParts = invoiceOrderDate.split('/');
          if (dateParts.length === 3) {
            const [month, day, year] = dateParts;
            orderDate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
        orderInfo = {
          vendor: preview.vendor,
          orderNumber: preview.orderInfo.orderNumber,
          orderDate: orderDate,
          subtotal: preview.orderInfo.subtotal,
          discount: preview.orderInfo.discount,
          total: preview.orderInfo.total,
          savedFileName: preview.savedFileName
        };
      }
       
       // Pass show info if it's a shoot list upload
       let finalShowInfo = null;
       if (!isInvoice) {
         // Create or update show info with user-provided date and optional name
         finalShowInfo = {
           ...(preview.showInfo || {}),
           date: showDate,
           name: showName || preview.showInfo?.name || null,
           location: preview.showInfo?.location || null
         };
       }
       
       const warnings = onUpload(updatedItems, preview.fileName, isInvoice ? orderInfo : finalShowInfo);
      
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
       setPartNumberEdits({});
       setPartNumberSearches({});
       setInvoiceOrderDate('');
     }
  };

  const handleCancel = () => {
    setPreview(null);
    setPreviewVendor(null);
    setPackingEdits({});
    setPartNumberEdits({});
    setPartNumberSearches({});
    setIsGenericImport(false);
    setGenericOrderNumber('');
    setGenericVendor('');
    setGenericOrderDate(new Date().toISOString().split('T')[0]);
    setInvoiceOrderDate('');
    setShowName('');
    setShowDate(new Date().toISOString().split('T')[0]);
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
      setPartNumberEdits({});
      setPartNumberSearches({});
      setShowName('');
      setShowDate(new Date().toISOString().split('T')[0]);
      await processFile(preview.originalFile, newVendor);
    }
  };

  const handlePackingChange = (partNumber, field, value) => {
    setPackingEdits(prev => ({
      ...prev,
      [partNumber]: {
        ...prev[partNumber],
        [field]: value === '' ? '' : parseInt(value)
      }
    }));
  };

  const getEffectivePacking = (item) => {
    if (packingEdits[item.partNumber]) {
      const { packagesPerCase, itemsPerPackage } = packingEdits[item.partNumber];
      // Check if both values are valid numbers
      const pkgNum = parseInt(packagesPerCase);
      const itemNum = parseInt(itemsPerPackage);
      
      if (!isNaN(pkgNum) && !isNaN(itemNum) && pkgNum > 0 && itemNum > 0) {
        return { packagesPerCase: pkgNum, itemsPerPackage: itemNum, total: pkgNum * itemNum };
      }
      // If either value is missing or invalid, return null
      return { packagesPerCase: pkgNum || null, itemsPerPackage: itemNum || null, total: null };
    }
    if (item.packing && item.packagesPerCase && item.itemsPerPackage) {
      return { 
        packagesPerCase: item.packagesPerCase, 
        itemsPerPackage: item.itemsPerPackage, 
        total: item.packagesPerCase * item.itemsPerPackage 
      };
    }
    return { packagesPerCase: null, itemsPerPackage: null, total: null };
  };

  const getEffectiveQuantity = (item) => {
    const packing = getEffectivePacking(item);
    
    // If we have manual packing edits, calculate total
    if (packingEdits[item.partNumber] && packing.total) {
      return item.cases * packing.total;
    }
    // If item already has quantity calculated (has packing), use it
    if (item.quantity !== null && !item.needsPacking) {
      return item.quantity;
    }
    // Otherwise can't calculate without packing
    return null;
  };

  const getEffectiveCost = (item) => {
    const packing = getEffectivePacking(item);
    const qty = getEffectiveQuantity(item);
    
    // Calculate: lineTotal ÷ (quantity × packing)
    if (qty && qty > 0) {
      return item.lineTotal / qty;
    }
    // If item already has cost calculated, use it
    if (item.cost !== null && !item.needsPacking) {
      return item.cost;
    }
    return null;
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
        <>
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
           
            {/* PDF Invoice Vendor Support - only show for invoices */}
            {isInvoice && (
              <div className="vendor-support-note" style={{
                background: '#e8f5e9',
                border: '1px solid #81c784',
                padding: '12px 16px',
                marginTop: '12px',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#2e7d32'
              }}>
                <strong>📄 PDF Invoice Auto-Import:</strong>
                <p style={{ margin: '8px 0 4px 0' }}>
                  We currently support automatic PDF invoice parsing for these vendors:
                </p>
                <ul style={{ margin: '4px 0 8px 20px', paddingLeft: '0' }}>
                  <li>Wisley Pyrotechnics</li>
                  <li>Spirit of 76</li>
                  <li>American Wholesale Fireworks</li>
                  <li>Fireworks Forever</li>
                </ul>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                  For other vendors, please send a sample invoice to the dev team so we can add support.
                </p>
              </div>
            )}

            {/* CSV Import Format Note - only show for invoices */}
            {isInvoice && (
              <div className="csv-import-note" style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                padding: '12px 16px',
                marginTop: '12px',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#495057'
              }}>
                <strong>📋 CSV Import Format:</strong>
                <p style={{ margin: '8px 0 4px 0' }}>
                  For generic CSV/Excel files, your file should have a header row with these columns:
                </p>
                <ul style={{ margin: '4px 0 4px 20px', paddingLeft: '0' }}>
                  <li><strong>Part Number</strong> (or Product ID, SKU, Item #)</li>
                  <li><strong>Description</strong> (or Name, Title)</li>
                  <li><strong>Quantity</strong> (total items, not cases)</li>
                  <li><strong>Cost</strong> (price per item)</li>
                </ul>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontStyle: 'italic' }}>
                  Example: Part Number,Description,Quantity,Cost<br/>
                  GM123,"Red Peony",24,5.50
                </p>
                <p style={{ margin: '8px 0 0 0' }}>
                  You'll be prompted to enter Order Number, Vendor, and Order Date after upload.
                </p>
              </div>
            )}

           {/* Shoot List Format Guide - PDF */}
           {!isInvoice && (
             <div className="shootlist-format-guide" style={{
               background: '#f0f7ff',
               border: '1px solid #b3d9ff',
               padding: '12px 16px',
               marginTop: '12px',
               borderRadius: '4px',
               fontSize: '13px',
               color: '#0c4a8a'
             }}>
               <strong>📄 PDF Shoot List (Finale 3D "Product Totals" Report):</strong>
               <div style={{ 
                 background: 'white', 
                 border: '1px solid #b3d9ff',
                 padding: '8px 12px', 
                 margin: '8px 0',
                 borderRadius: '3px',
                 fontFamily: 'monospace',
                 fontSize: '11px',
                 overflowX: 'auto'
               }}>
                 <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Product Totals</div>
                 <div>Part Number | Description | Quantity</div>
                 <div>CM202A | Chrysanthemum Shell | 24</div>
                 <div>PFX30 | Palm Cake | 12</div>
               </div>
               <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                 <li>Finale 3D Report: <strong>"Product Totals"</strong></li>
               </ul>
             </div>
           )}

           {/* Shoot List Format Guide - CSV/Excel */}
           {!isInvoice && (
             <div className="shootlist-format-guide" style={{
               background: '#fff3e0',
               border: '1px solid #ffe0b2',
               padding: '12px 16px',
               marginTop: '12px',
               borderRadius: '4px',
               fontSize: '13px',
               color: '#a6500a'
             }}>
               <strong>📋 CSV / Excel Shoot List Format:</strong>
               <p style={{ margin: '8px 0 4px 0' }}>
                 Create a spreadsheet or CSV text file with these columns in order:
               </p>
               <div style={{ 
                 background: 'white', 
                 border: '1px solid #ffe0b2',
                 padding: '8px 12px', 
                 margin: '8px 0',
                 borderRadius: '3px',
                 fontFamily: 'monospace',
                 fontSize: '11px',
                 overflowX: 'auto'
               }}>
                 <div>Part Number,Description,Quantity</div>
                 <div>CM202A,Chrysanthemum Shell,24</div>
                 <div>PFX30,Palm Cake,12</div>
               </div>
               <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                 <li>First row: Column headers <strong>(exact order required)</strong></li>
                 <li>Column order: <strong>Part Number, Description, Quantity</strong></li>
                 <li>Comma-separated values (standard CSV format)</li>
                 <li>File types: .csv, .xlsx, .xls</li>
               </ul>
             </div>
           )}
        </>
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

            {/* Order Date Input for Invoices (PDF only, not generic imports) */}
            {isInvoice && !isGenericImport && (
              <div className="generic-order-info">
                <h4>Order Date (Required)</h4>
                <div className="order-info-grid">
                  <div className="form-group">
                    <label htmlFor="invoice-order-date">Order Date *</label>
                    <input
                      id="invoice-order-date"
                      type="text"
                      value={invoiceOrderDate}
                      onChange={(e) => setInvoiceOrderDate(e.target.value)}
                      placeholder="MM/DD/YYYY"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
           
           {/* Generic Import Order Info Input */}
           {isGenericImport && (
            <div className="generic-order-info">
              <h4>Order Information (Required)</h4>
              <div className="order-info-grid">
                <div className="form-group">
                  <label htmlFor="generic-order-number">Order Number *</label>
                  <input
                    id="generic-order-number"
                    type="text"
                    value={genericOrderNumber}
                    onChange={(e) => setGenericOrderNumber(e.target.value)}
                    placeholder="e.g., PO-12345"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="generic-vendor">Vendor *</label>
                  <input
                    id="generic-vendor"
                    type="text"
                    value={genericVendor}
                    onChange={(e) => setGenericVendor(e.target.value)}
                    placeholder="e.g., Wisley, Kellner's"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="generic-order-date">Order Date *</label>
                  <input
                    id="generic-order-date"
                    type="date"
                    value={genericOrderDate}
                    onChange={(e) => setGenericOrderDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Show information for shoot lists */}
          {!isInvoice && (
            <div className="generic-order-info">
              <h4>Show Information (Required)</h4>
              <div className="order-info-grid">
                <div className="form-group">
                  <label htmlFor="show-name">Show Name (Optional)</label>
                  <input
                    id="show-name"
                    type="text"
                    value={showName}
                    onChange={(e) => setShowName(e.target.value)}
                    placeholder="e.g., July 4th Celebration"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="show-date">Show Date *</label>
                  <input
                    id="show-date"
                    type="date"
                    value={showDate}
                    onChange={(e) => setShowDate(e.target.value)}
                    required
                  />
                </div>
              </div>
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
          
          {/* Warning for items missing part numbers */}
          {preview.items.some(item => item.needsPartNumber) && (
            <div className="part-number-warning" style={{
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              padding: '12px',
              marginBottom: '12px',
              borderRadius: '4px'
            }}>
              <strong>⚠️ Missing Part Numbers</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                {preview.items.filter(i => i.needsPartNumber).length} item(s) are missing part numbers.
                Enter the part number in the table below before importing. Part numbers are required.
              </p>
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
                      <th>Quantity (Items)</th>
                      <th>Cost/Item</th>
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
                   
                    // For shoot lists, check if item is in inventory - use selected part number if remapped
                    const selectedPartNumber = partNumberEdits[item.partNumber] || item.partNumber;
                    const inventoryItems = !isInvoice ? inventory
                      .filter(inv => inv.partNumber === selectedPartNumber)
                      .sort((a, b) => {
                        const dateA = new Date(a.orderDate || 0).getTime();
                        const dateB = new Date(b.orderDate || 0).getTime();
                        return dateA - dateB; // Oldest first (FIFO)
                      }) : [];
                    const hasInventory = inventoryItems.length > 0;
                    const inventoryQty = inventoryItems.reduce((sum, inv) => sum + inv.quantity, 0);
                    
                    // Calculate FIFO cost from inventory (oldest items first)
                    let inventoryCost = 0;
                    if (hasInventory && item.quantity > 0) {
                      let remainingQty = item.quantity;
                      let totalCost = 0;
                      
                      for (const invItem of inventoryItems) {
                        if (remainingQty <= 0) break;
                        
                        const qtyToTake = Math.min(invItem.quantity, remainingQty);
                        totalCost += qtyToTake * invItem.cost;
                        remainingQty -= qtyToTake;
                      }
                      
                      inventoryCost = totalCost / item.quantity;
                    }
                  
                   return (
                     <tr key={idx} style={(item.needsPacking && !packingEdits[item.partNumber]) || (item.needsPartNumber && !missingPartNumbers[idx]) ? { background: '#fff3cd' } : {}}>
                       {isInvoice ? (
                         <>
                           <td>
                             {item.needsPartNumber ? (
                               <input
                                 type="text"
                                 placeholder="Enter part number"
                                 value={missingPartNumbers[idx] || ''}
                                 onChange={(e) => setMissingPartNumbers(prev => ({ ...prev, [idx]: e.target.value }))}
                                 style={{ 
                                   width: '100%', 
                                   padding: '4px', 
                                   border: '2px solid #f5c6cb', 
                                   borderRadius: '4px',
                                   background: '#fff'
                                 }}
                               />
                             ) : (
                               item.partNumber
                             )}
                           </td>
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
                          <td>
                            {packing.total !== null 
                              ? `${item.cases} cases × ${packing.total} = ${qty} items`
                              : `${item.cases || '?'} units`
                            }
                          </td>
                          <td>${cost !== null && !isNaN(cost) ? cost.toFixed(2) : '?'}</td>
                        </>
                       ) : (
                         <>
                           <td>{item.size}</td>
                             <td>
                               {item.needsPartNumber ? (
                                 <input
                                   type="text"
                                   placeholder="Enter part number"
                                   value={missingPartNumbers[idx] || ''}
                                   onChange={(e) => setMissingPartNumbers(prev => ({ ...prev, [idx]: e.target.value }))}
                                   style={{ 
                                     width: '100%', 
                                     padding: '4px', 
                                     border: '2px solid #f5c6cb', 
                                     borderRadius: '4px',
                                     background: '#fff'
                                   }}
                                 />
                               ) : hasInventory ? (
                                 item.partNumber
                               ) : (
                                 <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                   <button
                                     onClick={() => setPartNumberSearches({
                                       ...partNumberSearches,
                                       [item.partNumber]: partNumberSearches[item.partNumber] === undefined ? '' : undefined
                                     })}
                                     style={{
                                       width: '100%',
                                       padding: '4px 8px',
                                       border: '1px solid #ff9800',
                                       borderRadius: '4px',
                                       backgroundColor: '#fff3cd',
                                       fontSize: '14px',
                                       cursor: 'pointer',
                                       textAlign: 'left',
                                       display: 'flex',
                                       justifyContent: 'space-between',
                                       alignItems: 'center'
                                     }}
                                   >
                                     <span>{partNumberEdits[item.partNumber] || item.partNumber}</span>
                                     <span>▼</span>
                                   </button>
                                   {partNumberSearches[item.partNumber] !== undefined && (
                                     <div style={{
                                       position: 'absolute',
                                       top: '100%',
                                       left: 0,
                                       right: 0,
                                       backgroundColor: '#fff',
                                       border: '1px solid #ff9800',
                                       borderTop: 'none',
                                       borderRadius: '0 0 4px 4px',
                                       boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                                       zIndex: 10,
                                       minWidth: '200px'
                                     }}>
                                       {/* Search input at top */}
                                       <input
                                         type="text"
                                         placeholder="Search..."
                                         value={partNumberSearches[item.partNumber]}
                                         onChange={(e) => setPartNumberSearches({
                                           ...partNumberSearches,
                                           [item.partNumber]: e.target.value
                                         })}
                                         onClick={(e) => e.stopPropagation()}
                                         autoFocus
                                         style={{
                                           width: '100%',
                                           padding: '8px',
                                           border: 'none',
                                           borderBottom: '1px solid #f0f0f0',
                                           fontSize: '13px',
                                           boxSizing: 'border-box',
                                           backgroundColor: '#f9f9f9'
                                         }}
                                       />
                                       {/* Dropdown list */}
                                       <div style={{
                                         maxHeight: '250px',
                                         overflowY: 'auto'
                                       }}>
                                         {/* Original item (not in inventory) option */}
                                         <div
                                           onClick={() => {
                                             setPartNumberEdits(prev => {
                                               const updated = { ...prev };
                                               delete updated[item.partNumber];
                                               return updated;
                                             });
                                             setPartNumberSearches({
                                               ...partNumberSearches,
                                               [item.partNumber]: undefined
                                             });
                                           }}
                                           style={{
                                             padding: '8px 12px',
                                             cursor: 'pointer',
                                             backgroundColor: !partNumberEdits[item.partNumber] || partNumberEdits[item.partNumber] === item.partNumber ? '#e3f2fd' : '#fff',
                                             borderBottom: '1px solid #f0f0f0',
                                             fontSize: '13px'
                                           }}
                                           onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                           onMouseOut={(e) => e.target.style.backgroundColor = !partNumberEdits[item.partNumber] || partNumberEdits[item.partNumber] === item.partNumber ? '#e3f2fd' : '#fff'}
                                         >
                                           {item.partNumber} (not in inventory)
                                         </div>
                                         {/* Divider */}
                                         <div style={{ borderBottom: '2px solid #eee' }} />
                                         {/* Filtered inventory options */}
                                         {Array.from(new Set(inventory.map(inv => inv.partNumber)))
                                           .sort()
                                           .filter(partNum => 
                                             partNum.toLowerCase().includes(partNumberSearches[item.partNumber].toLowerCase())
                                           )
                                           .map(partNum => (
                                             <div
                                               key={partNum}
                                               onClick={() => {
                                                 setPartNumberEdits({
                                                   ...partNumberEdits,
                                                   [item.partNumber]: partNum
                                                 });
                                                 setPartNumberSearches({
                                                   ...partNumberSearches,
                                                   [item.partNumber]: undefined
                                                 });
                                               }}
                                               style={{
                                                 padding: '8px 12px',
                                                 cursor: 'pointer',
                                                 backgroundColor: partNumberEdits[item.partNumber] === partNum ? '#e3f2fd' : '#fff',
                                                 borderBottom: '1px solid #f0f0f0',
                                                 fontSize: '13px'
                                               }}
                                               onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                               onMouseOut={(e) => e.target.style.backgroundColor = partNumberEdits[item.partNumber] === partNum ? '#e3f2fd' : '#fff'}
                                             >
                                               {partNum}
                                             </div>
                                           ))
                                         }
                                         {Array.from(new Set(inventory.map(inv => inv.partNumber)))
                                           .filter(partNum => 
                                             partNum.toLowerCase().includes(partNumberSearches[item.partNumber].toLowerCase())
                                           ).length === 0 && (
                                           <div style={{ padding: '12px', color: '#999', textAlign: 'center', fontSize: '13px' }}>
                                             No matching part numbers
                                           </div>
                                         )}
                                       </div>
                                     </div>
                                   )}
                                 </div>
                               )}
                             </td>
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
