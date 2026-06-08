import React, { useMemo, useState } from 'react';
import './CurrentInventory.css';

function CurrentInventory({ inventory, shows, orders }) {
  const [searchTerm, setSearchTerm] = useState('');
  // Calculate current inventory with FIFO costing
  const currentInventory = useMemo(() => {
    // First, calculate how much of each product has been used in shows
    const usedByPartNumber = {};
    
    shows.forEach(show => {
      show.items?.forEach(item => {
        if (!usedByPartNumber[item.partNumber]) {
          usedByPartNumber[item.partNumber] = 0;
        }
        usedByPartNumber[item.partNumber] += item.quantity || 0;
      });
    });
    
    // Now calculate available inventory with FIFO costing
    const grouped = {};
    
    // Group inventory by part number and sort by order date (FIFO)
    const inventoryByPart = {};
    inventory.forEach(item => {
      if (!inventoryByPart[item.partNumber]) {
        inventoryByPart[item.partNumber] = [];
      }
      inventoryByPart[item.partNumber].push(item);
    });
    
    // For each part number, apply FIFO to calculate available quantity and weighted cost
    Object.keys(inventoryByPart).forEach(partNumber => {
      const items = inventoryByPart[partNumber].sort((a, b) => {
        const dateA = new Date(a.orderDate || 0).getTime();
        const dateB = new Date(b.orderDate || 0).getTime();
        return dateA - dateB; // Oldest first (FIFO)
      });
      
      const totalOrdered = items.reduce((sum, item) => sum + item.quantity, 0);
      const used = usedByPartNumber[partNumber] || 0;
      const available = totalOrdered - used;
      
      if (available > 0) {
        // Calculate FIFO cost: skip over used items, then average remaining items
        let remainingToSkip = used;
        let availableValue = 0;
        let availableQty = 0;
        
        items.forEach(item => {
          if (remainingToSkip >= item.quantity) {
            // This entire item has been used
            remainingToSkip -= item.quantity;
          } else if (remainingToSkip > 0) {
            // Partially used item
            const qtyAvailable = item.quantity - remainingToSkip;
            availableQty += qtyAvailable;
            availableValue += qtyAvailable * item.cost;
            remainingToSkip = 0;
          } else {
            // Fully available item
            availableQty += item.quantity;
            availableValue += item.lineTotal || (item.quantity * item.cost);
          }
        });
        
        grouped[partNumber] = {
          partNumber: partNumber,
          description: items[0].description,
          ordered: totalOrdered,
          used: used,
          available: available,
          avgCost: availableQty > 0 ? availableValue / availableQty : 0
        };
      }
    });
    
    // Convert to array and sort by part number
    return Object.values(grouped)
      .sort((a, b) => a.partNumber.localeCompare(b.partNumber));
  }, [inventory, shows]);

  // Filter inventory based on search term
  const filteredInventory = useMemo(() => {
    if (!searchTerm.trim()) {
      return currentInventory;
    }
    
    const search = searchTerm.toLowerCase();
    return currentInventory.filter(item => 
      item.partNumber.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search)
    );
  }, [currentInventory, searchTerm]);

  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  // Export all unique products from all orders (Inventory Export)
  const exportInventoryCSV = () => {
    // Get all unique products from inventory
    const productMap = {};
    
    inventory.forEach(item => {
      if (!productMap[item.partNumber]) {
        productMap[item.partNumber] = {
          partNumber: item.partNumber,
          description: item.description,
          // Determine partType based on description keywords
          partType: guessPartType(item.description),
          // Extract size if present
          size: extractSize(item.description),
          // Use average cost across all orders
          costs: [],
          manufacturer: 'Wisley' // Default, could be enhanced to detect from order data
        };
      }
      productMap[item.partNumber].costs.push(item.cost);
    });

    // Calculate average cost for each product
    const products = Object.values(productMap).map(product => ({
      ...product,
      stdPrice: product.costs.reduce((sum, c) => sum + c, 0) / product.costs.length
    }));

    // Generate CSV
    const headers = ['partNumber', 'description', 'partType', 'size', 'stdPrice', 'manufacturer'];
    const csvRows = [headers.join(',')];

    products.forEach(product => {
      const row = [
        product.partNumber,
        `"${product.description.replace(/"/g, '""')}"`, // Escape quotes
        product.partType,
        product.size || '',
        `$${product.stdPrice.toFixed(2)}`,
        product.manufacturer
      ];
      csvRows.push(row.join(','));
    });

    downloadCSV(csvRows.join('\n'), 'finale3d_inventory_export.csv');
  };

  // Export current available inventory as quotas (Quota Export)
  const exportQuotaCSV = () => {
    const headers = ['partNumber', 'quota'];
    const csvRows = [headers.join(',')];

    currentInventory.forEach(item => {
      if (item.available > 0) {
        csvRows.push(`${item.partNumber},${item.available}`);
      }
    });

    downloadCSV(csvRows.join('\n'), 'finale3d_quota_export.csv');
  };

  // Helper: Guess part type from description
  const guessPartType = (description) => {
    const desc = description.toLowerCase();
    if (desc.includes('cake') || desc.includes('shot')) return 'cake';
    if (desc.includes('shell')) return 'shell';
    if (desc.includes('candle')) return 'candle';
    if (desc.includes('mine')) return 'mine';
    if (desc.includes('comet')) return 'comet';
    if (desc.includes('rocket')) return 'rocket';
    if (desc.includes('fountain') || desc.includes('gerb')) return 'ground';
    return 'other_effect';
  };

  // Helper: Extract size from description
  const extractSize = (description) => {
    // Look for patterns like: 5", 3", 75mm, 30mm, 20mm
    const sizeMatch = description.match(/(\d+(?:\.\d+)?)\s*["']|(\d+)\s*mm/i);
    if (sizeMatch) {
      if (sizeMatch[1]) return `${sizeMatch[1]}"`;
      if (sizeMatch[2]) return `${sizeMatch[2]}mm`;
    }
    return '';
  };

  // Helper: Download CSV file
  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate totals (use filtered inventory for displayed totals)
  const totals = useMemo(() => {
    return filteredInventory.reduce((acc, item) => ({
      available: acc.available + item.available,
      value: acc.value + (item.available * item.avgCost)
    }), { available: 0, value: 0 });
  }, [filteredInventory]);

  if (currentInventory.length === 0) {
    return (
      <div className="empty-state">
        <p>No current inventory available. Upload invoices to add inventory.</p>
      </div>
    );
  }

  return (
    <div className="current-inventory-container">
      <div className="current-inventory-header">
        <div className="current-inventory-summary">
          <div className="summary-stat">
            <span className="stat-label">Unique Products:</span>
            <span className="stat-value">{currentInventory.length}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Available Items:</span>
            <span className="stat-value">{totals.available}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Total Value:</span>
            <span className="stat-value">{formatCurrency(totals.value)}</span>
          </div>
        </div>
        
        <div className="export-buttons">
          <button onClick={exportInventoryCSV} className="btn-export" title="Export all products for Finale 3D inventory import">
            📦 Export Inventory
          </button>
          <button onClick={exportQuotaCSV} className="btn-export" title="Export available quantities for Finale 3D quota import">
            📊 Export Quotas
          </button>
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search by part number or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')} 
            className="clear-search"
            title="Clear search"
          >
            ✕
          </button>
        )}
        {searchTerm && (
          <span className="search-results">
            Showing {filteredInventory.length} of {currentInventory.length} products
          </span>
        )}
      </div>

      <div className="current-inventory-table-container">
        <table className="current-inventory-table">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Description</th>
              <th>Available</th>
              <th>Avg Cost/Unit</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item, index) => (
              <tr key={index}>
                <td>{item.partNumber}</td>
                <td className="description-cell">{item.description}</td>
                <td className="available-qty">{item.available}</td>
                <td>{formatCurrency(item.avgCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td colSpan="2"><strong>TOTAL</strong></td>
              <td className="available-qty"><strong>{totals.available}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default CurrentInventory;
