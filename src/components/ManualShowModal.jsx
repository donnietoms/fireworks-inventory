import { useState, useEffect } from 'react';
import './ManualShowModal.css';

const ManualShowModal = ({ isOpen, onClose, onAdd, existingShows = [], editingShow = null, inventory = [] }) => {
  const [showData, setShowData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    location: ''
  });
  
  const [items, setItems] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null); // Track which item is being edited
  const [partNumberSearches, setPartNumberSearches] = useState({}); // Track search input for each dropdown
  const [currentItem, setCurrentItem] = useState({
    partNumber: '',
    description: '',
    quantity: '',
    cost: ''
  });
  
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Populate form when editing
  useEffect(() => {
    if (editingShow) {
      setShowData({
        name: editingShow.name,
        date: editingShow.date ? new Date(editingShow.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        location: editingShow.location || ''
      });
      setItems(editingShow.items || []);
    } else {
      // Reset form when not editing
      setShowData({
        name: '',
        date: new Date().toISOString().split('T')[0],
        location: ''
      });
      setItems([]);
    }
  }, [editingShow]);

  const handleShowChange = (field, value) => {
    setShowData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && error) {
      setError('');
    }
  };

  const handlePartNumberChange = (value) => {
    setCurrentItem(prev => ({ ...prev, partNumber: value }));
    
    // Search inventory for matching part numbers
    if (value.length > 0) {
      const results = inventory
        .filter(item => 
          item.partNumber.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5); // Limit to 5 results
      
      // Get unique part numbers with descriptions
      const uniqueResults = {};
      results.forEach(item => {
        if (!uniqueResults[item.partNumber]) {
          uniqueResults[item.partNumber] = item;
        }
      });
      
      setSearchResults(Object.values(uniqueResults));
    } else {
      setSearchResults([]);
    }
  };

  const selectInventoryItem = (item) => {
    setCurrentItem({
      partNumber: item.partNumber,
      description: item.description,
      quantity: '',
      cost: item.cost.toFixed(2)
    });
    setSearchResults([]);
  };

  const handleItemChange = (field, value) => {
    setCurrentItem(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    if (!currentItem.partNumber || !currentItem.description || !currentItem.quantity) {
      setError('Please fill in part number, description, and quantity');
      return;
    }

    const newItem = {
      partNumber: currentItem.partNumber,
      description: currentItem.description,
      quantity: parseInt(currentItem.quantity),
      cost: parseFloat(currentItem.cost) || 0
    };

    if (editingItemIndex !== null) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = newItem;
      setItems(updatedItems);
      setEditingItemIndex(null);
    } else {
      // Add new item
      setItems(prev => [...prev, newItem]);
    }
    
    // Reset current item
    setCurrentItem({
      partNumber: '',
      description: '',
      quantity: '',
      cost: ''
    });
    
    setError('');
    setSearchResults([]);
  };

  const editItem = (index) => {
    const item = items[index];
    setCurrentItem({
      partNumber: item.partNumber,
      description: item.description,
      quantity: item.quantity?.toString() || '',
      cost: item.cost?.toString() || ''
    });
    setEditingItemIndex(index);
  };

  const cancelEdit = () => {
    setCurrentItem({
      partNumber: '',
      description: '',
      quantity: '',
      cost: ''
    });
    setEditingItemIndex(null);
    setSearchResults([]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    
    // Check for duplicate show name (skip if editing the same show)
    const isDuplicate = existingShows.some(
      show => show.name === showData.name && 
      (!editingShow || show.id !== editingShow.id)
    );
    
    if (isDuplicate) {
      setError(`Show "${showData.name}" already exists!`);
      return;
    }
    
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    
    onAdd({
      name: showData.name,
      date: showData.date,
      location: showData.location,
      items: items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: totalValue
    });
    
    // Reset form
    setShowData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      location: ''
    });
    setItems([]);
    setCurrentItem({
      partNumber: '',
      description: '',
      quantity: '',
      cost: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{editingShow ? 'Edit Show' : 'Manual Show Entry'}</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Show Header */}
          <div className="form-section">
            <h3>Show Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Show Name *</label>
                <input
                  type="text"
                  value={showData.name}
                  onChange={(e) => handleShowChange('name', e.target.value)}
                  required
                  placeholder="Bogue 2026 Dedication"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={showData.date}
                  onChange={(e) => handleShowChange('date', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={showData.location}
                  onChange={(e) => handleShowChange('location', e.target.value)}
                  placeholder="City Park"
                />
              </div>
            </div>
          </div>

          {/* Add Item Section */}
          <div className="form-section">
            <h3>Add Items</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Part Number *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={currentItem.partNumber}
                    onChange={(e) => handlePartNumberChange(e.target.value)}
                    placeholder="Type to search inventory..."
                    autoComplete="off"
                  />
                  {searchResults.length > 0 && (
                    <div className="search-dropdown">
                      {searchResults.map((item, index) => (
                        <div 
                          key={index}
                          className="search-result-item"
                          onClick={() => selectInventoryItem(item)}
                        >
                          <strong>{item.partNumber}</strong> - {item.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={currentItem.description}
                  onChange={(e) => handleItemChange('description', e.target.value)}
                  placeholder="Product description"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  value={currentItem.quantity}
                  onChange={(e) => handleItemChange('quantity', e.target.value)}
                  placeholder="10"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Cost per Unit (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentItem.cost}
                  onChange={(e) => handleItemChange('cost', e.target.value)}
                  placeholder="0.00"
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group" style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button type="button" onClick={addItem} className="btn-add-item" style={{ flex: '1' }}>
                  {editingItemIndex !== null ? '✓ Update Item' : '+ Add Item'}
                </button>
                {editingItemIndex !== null && (
                  <button type="button" onClick={cancelEdit} className="btn-cancel" style={{ flex: '1' }}>
                    Cancel
                  </button>
                )}
                {editingShow && (
                  <button type="submit" className="btn-submit" style={{ flex: '1' }}>
                    Update Show
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="form-section">
              <h3>Items ({items.length})</h3>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Cost</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                 <tbody>
                   {items
                     .slice() // Create a copy to avoid mutating original array
                     .sort((a, b) => {
                       // Sort items not in inventory to the top
                       if (a.inInventory === false && b.inInventory !== false) return -1;
                       if (a.inInventory !== false && b.inInventory === false) return 1;
                       return 0;
                     })
                     .map((item, displayIndex) => {
                       // Find original index in unsorted items array
                       const originalIndex = items.findIndex(i => i === item);
                       const notInInventory = item.inInventory === false;
                       const isEditing = editingItemIndex === originalIndex;
                       
                       return (
                         <tr 
                           key={originalIndex} 
                           style={{
                             backgroundColor: isEditing 
                               ? '#fff3cd' 
                               : notInInventory 
                                 ? '#ffebee' 
                                 : 'transparent',
                             borderLeft: notInInventory ? '3px solid #d32f2f' : 'none'
                           }}
                         >
                           <td style={{ fontWeight: notInInventory ? 'bold' : 'normal', position: 'relative' }}>
                             {notInInventory && !isEditing ? (
                               <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                 <button
                                   type="button"
                                   onClick={() => setPartNumberSearches({
                                     ...partNumberSearches,
                                     [originalIndex]: partNumberSearches[originalIndex] === undefined ? '' : undefined
                                   })}
                                   style={{
                                     width: '100%',
                                     padding: '4px 8px',
                                     border: '1px solid #d32f2f',
                                     borderRadius: '4px',
                                     backgroundColor: '#ffebee',
                                     fontSize: '14px',
                                     cursor: 'pointer',
                                     textAlign: 'left',
                                     display: 'flex',
                                     justifyContent: 'space-between',
                                     alignItems: 'center',
                                     fontWeight: 'bold'
                                   }}
                                 >
                                   <span>{item.partNumber} ⚠️ Not in inventory</span>
                                   <span>▼</span>
                                 </button>
                                 {partNumberSearches[originalIndex] !== undefined && (
                                   <div style={{
                                     position: 'absolute',
                                     top: '100%',
                                     left: 0,
                                     right: 0,
                                     backgroundColor: '#fff',
                                     border: '1px solid #d32f2f',
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
                                       value={partNumberSearches[originalIndex]}
                                       onChange={(e) => setPartNumberSearches({
                                         ...partNumberSearches,
                                         [originalIndex]: e.target.value
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
                                           setPartNumberSearches({
                                             ...partNumberSearches,
                                             [originalIndex]: undefined
                                           });
                                         }}
                                         style={{
                                           padding: '8px 12px',
                                           cursor: 'pointer',
                                           backgroundColor: '#ffebee',
                                           borderBottom: '1px solid #f0f0f0',
                                           fontSize: '13px'
                                         }}
                                       >
                                         {item.partNumber} (not in inventory)
                                       </div>
                                       {/* Divider */}
                                       <div style={{ borderBottom: '2px solid #eee' }} />
                                       {/* Filtered inventory options */}
                                       {Array.from(new Set(inventory.map(inv => inv.partNumber)))
                                         .sort()
                                         .filter(partNum => {
                                           const invItem = inventory.find(inv => inv.partNumber === partNum);
                                           const searchTerm = partNumberSearches[originalIndex].toLowerCase();
                                           return partNum.toLowerCase().includes(searchTerm) || 
                                                  invItem.description.toLowerCase().includes(searchTerm);
                                         })
                                         .map(partNum => {
                                           const invItem = inventory.find(inv => inv.partNumber === partNum);
                                           return (
                                             <div
                                               key={partNum}
                                               onClick={() => {
                                                 // Update the item with the selected part number and inventory info
                                                 const updatedItems = [...items];
                                                 updatedItems[originalIndex] = {
                                                   ...updatedItems[originalIndex],
                                                   partNumber: partNum,
                                                   description: invItem.description,
                                                   cost: invItem.cost,
                                                   inInventory: true
                                                 };
                                                 setItems(updatedItems);
                                                 setPartNumberSearches({
                                                   ...partNumberSearches,
                                                   [originalIndex]: undefined
                                                 });
                                               }}
                                               style={{
                                                 padding: '8px 12px',
                                                 cursor: 'pointer',
                                                 backgroundColor: '#fff',
                                                 borderBottom: '1px solid #f0f0f0',
                                                 fontSize: '13px'
                                               }}
                                               onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                               onMouseOut={(e) => e.target.style.backgroundColor = '#fff'}
                                             >
                                               <div style={{ fontWeight: 'bold' }}>{partNum}</div>
                                               <div style={{ fontSize: '11px', color: '#666' }}>{invItem.description}</div>
                                             </div>
                                           );
                                         })
                                       }
                                       {Array.from(new Set(inventory.map(inv => inv.partNumber)))
                                         .filter(partNum => {
                                           const invItem = inventory.find(inv => inv.partNumber === partNum);
                                           const searchTerm = partNumberSearches[originalIndex].toLowerCase();
                                           return partNum.toLowerCase().includes(searchTerm) || 
                                                  invItem.description.toLowerCase().includes(searchTerm);
                                         }).length === 0 && (
                                         <div style={{ padding: '12px', color: '#999', textAlign: 'center', fontSize: '13px' }}>
                                           No matching part numbers
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <>
                                 {item.partNumber}
                                 {notInInventory && <span style={{ color: '#d32f2f', marginLeft: '8px' }}>⚠️ Not in inventory</span>}
                               </>
                             )}
                           </td>
                           <td>{item.description}</td>
                           <td>{item.quantity}</td>
                           <td>${item.cost.toFixed(2)}</td>
                           <td>${(item.quantity * item.cost).toFixed(2)}</td>
                           <td>
                              <button 
                                type="button" 
                                onClick={() => editItem(originalIndex)}
                                className="btn-edit"
                                style={{ marginRight: '5px' }}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button 
                                type="button" 
                                onClick={() => removeItem(originalIndex)}
                                className="btn-remove"
                                title="Delete"
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
           )}

          {!editingShow && (
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                Create Show
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ManualShowModal;
