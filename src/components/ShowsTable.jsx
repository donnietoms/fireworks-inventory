import React, { useState, useMemo } from 'react';
import './ShowsTable.css';

function ShowsTable({ shows, onDeleteShow, onViewDetails, onEdit, onResync }) {
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Sort shows based on current sort state
  const sortedShows = useMemo(() => {
    return [...shows].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [shows, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return null;
    return <span className="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  if (shows.length === 0) {
    return (
      <div className="empty-state">
        <p>No shows yet. Upload a shoot list or use Manual Entry to create a show record.</p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatShowDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="shows-table-container">
      <div className="table-wrapper">
        <table className="shows-table">
          <thead>
           <tr>
             <th>Show Name</th>
             <th onClick={() => handleSort('date')} className="sortable">
               Show Date <SortIcon column="date" />
             </th>
             <th>Total Items</th>
             <th>Not in Inventory</th>
             <th>Total Value</th>
             <th>Actions</th>
           </tr>
         </thead>
          <tbody>
            {sortedShows.map((show) => {
              // Calculate total items (sum of all quantities)
              const totalItems = show.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
              
              // Calculate items not in inventory
              const notInInventory = show.items?.filter(item => !item.inInventory).length || 0;
              
              return (
              <tr key={show.id}>
                <td>
                  <button 
                    className="link-button"
                    onClick={() => onViewDetails(show.id)}
                  >
                    {show.name}
                  </button>
                </td>
                  <td>{formatShowDate(show.date)}</td>
                 <td className="amount">{totalItems}</td>
                 <td className="amount" style={{ color: notInInventory > 0 ? '#ff6b35' : '#666' }}>
                   {notInInventory}
                 </td>
                 <td className="amount total">{formatCurrency(show.totalValue)}</td>
                <td>
                 <button
                   className="btn-view"
                   onClick={() => onViewDetails(show.id)}
                   title="View Details"
                 >
                   📋
                 </button>
                 <button
                   className="btn-resync"
                   onClick={() => {
                     if (window.confirm(`Resync costs for "${show.name}" from current inventory using FIFO?`)) {
                       onResync(show.id);
                     }
                   }}
                   title="Resync Costs from Inventory"
                 >
                   🔄
                 </button>
                 <button
                   className="btn-edit"
                   onClick={() => onEdit(show)}
                   title="Edit Show"
                 >
                   ✏️
                 </button>
                 <button
                   className="btn-delete"
                   onClick={() => {
                     if (window.confirm(`Delete show "${show.name}"? This will return all used items back to inventory.`)) {
                       onDeleteShow(show.id);
                     }
                   }}
                   title="Delete Show"
                 >
                   🗑️
                 </button>
                </td>
             </tr>
             );
            })}
         </tbody>
       </table>
      </div>
    </div>
  );
}

export default ShowsTable;
