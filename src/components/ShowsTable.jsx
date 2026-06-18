import React from 'react';
import './ShowsTable.css';

function ShowsTable({ shows, onDeleteShow, onViewDetails, onEdit }) {
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
      return date.toLocaleDateString();
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
      <table className="shows-table">
         <thead>
           <tr>
             <th>Show Name</th>
             <th>Show Date</th>
             <th>Total Items</th>
             <th>Total Value</th>
             <th>Created</th>
             <th>Actions</th>
           </tr>
         </thead>
        <tbody>
          {shows.map((show) => (
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
               <td>{show.totalItems}</td>
              <td>{formatCurrency(show.totalValue)}</td>
              <td>{formatDate(show.createdAt)}</td>
              <td>
                <button
                  className="btn-view"
                  onClick={() => onViewDetails(show.id)}
                  title="View Details"
                >
                  📋
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ShowsTable;
