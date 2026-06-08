import { useState } from 'react';
import { useInventory } from './hooks/useInventory';
import { useOrders } from './hooks/useOrders';
import { useShows } from './hooks/useShows';
import { API_BASE_URL } from './config';
import CurrentInventory from './components/CurrentInventory';
import InventoryList from './components/InventoryList';
import InventoryDetails from './components/InventoryDetails';
import OrdersTable from './components/OrdersTable';
import ShowsTable from './components/ShowsTable';
import ShowDetailsTable from './components/ShowDetailsTable';
import FileUpload from './components/FileUpload';
import AddItemModal from './components/AddItemModal';
import AddOrderModal from './components/AddOrderModal';
import { exportToCSV, exportToExcel } from './utils/fileParser';
import { exportToJSON, importFromJSON } from './utils/storage';
import './App.css';

function App() {
  const {
    inventory,
    loading,
    addFromInvoice,
    subtractFromShootList,
    addItem,
    updateItem,
    deleteItem,
    deleteItemsByOrder,
    clearInventory,
    replaceInventory
  } = useInventory();
  
  const {
    orders,
    loading: ordersLoading,
    addOrder,
    updateOrder,
    deleteOrder,
    clearOrders
  } = useOrders();
  
  const {
    shows,
    loading: showsLoading,
    addShow,
    updateShow,
    deleteShow,
    clearShows
  } = useShows();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState('current-inventory');
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [selectedPartNumber, setSelectedPartNumber] = useState(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState(null);

  const handleExport = (format) => {
    if (inventory.length === 0) {
      alert('No inventory to export');
      return;
    }
    
    switch (format) {
      case 'csv':
        exportToCSV(inventory);
        break;
      case 'excel':
        exportToExcel(inventory);
        break;
      case 'json':
        exportToJSON(inventory);
        break;
    }
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await importFromJSON(file);
      if (confirm(`Import ${data.length} items? This will replace current inventory.`)) {
        replaceInventory(data);
      }
    } catch (error) {
      alert(`Error importing: ${error.message}`);
    }
    
    e.target.value = '';
  };

  const handleClearInventory = () => {
    if (inventory.length === 0) return;
    if (confirm('Are you sure you want to clear all inventory? This cannot be undone.')) {
      clearInventory();
    }
  };

  const handleInvoiceUpload = async (items, fileName, orderInfo) => {
    // Get order number
    const orderNumber = orderInfo?.orderNumber || fileName;
    
    // Check if order already exists
    const existingOrder = orders.find(o => o.orderNumber === orderNumber);
    if (existingOrder) {
      const choice = window.confirm(
        `Order ${orderNumber} already exists!\n\n` +
        `Click OK to DELETE the existing order and replace with new data.\n` +
        `Click Cancel to keep the existing order and abort this upload.`
      );
      
      if (choice) {
        // Delete existing order and its inventory
        deleteOrder(existingOrder.id);
        deleteItemsByOrder(orderNumber);
        
        // Delete the invoice file if it exists
        if (existingOrder.invoiceFile) {
          try {
            await fetch(`${API_BASE_URL}/api/invoice/${existingOrder.invoiceFile}`, {
              method: 'DELETE'
            });
          } catch (error) {
            console.error('Failed to delete old invoice file:', error);
          }
        }
      } else {
        return { warnings: [{ error: 'Upload cancelled - duplicate order' }] };
      }
    }
    
    // Add items to inventory with order number
    const result = addFromInvoice(items, fileName, orderNumber);
    
    // Create order record if orderInfo provided
    if (orderInfo) {
      addOrder({
        vendor: orderInfo.vendor || 'Unknown',
        orderNumber: orderNumber,
        subtotal: orderInfo.subtotal || 0,
        discount: orderInfo.discount || 0,
        total: orderInfo.total || 0,
        invoiceFile: orderInfo.savedFileName || null, // Store the saved filename
        originalFileName: fileName
      });
    }
    
    return result;
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    if (confirm(`Delete order ${orderNumber}?\n\nThis will also remove all inventory items from this order.`)) {
      // Find the order to get invoice file info
      const order = orders.find(o => o.id === orderId);
      
      // Delete the order and inventory items
      deleteOrder(orderId);
      deleteItemsByOrder(orderNumber);
      
      // Delete the invoice file if it exists
      if (order?.invoiceFile) {
        try {
          await fetch(`${API_BASE_URL}/api/invoice/${order.invoiceFile}`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.error('Failed to delete invoice file:', error);
          // Don't fail the whole operation if file deletion fails
        }
      }
    }
  };

  const handleShootListUpload = (items, fileName, showInfo) => {
    const showName = showInfo?.name || fileName;
    
    // Check if show already exists
    const existingShow = shows.find(s => s.name === showName);
    if (existingShow) {
      const choice = window.confirm(
        `Show "${showName}" already exists!\n\n` +
        `Click OK to DELETE the existing show and replace with new data.\n` +
        `Click Cancel to keep the existing show and abort this upload.\n\n` +
        `Note: Deleting the show will NOT restore inventory (items remain marked as used).`
      );
      
      if (choice) {
        // Delete existing show
        deleteShow(existingShow.id);
      } else {
        return { warnings: [{ error: 'Upload cancelled - duplicate show' }] };
      }
    }
    
    // Cross-reference items with inventory to get cost
    const enrichedItems = items.map(item => {
      // Find all matching inventory items by part number
      const inventoryItems = inventory.filter(invItem => 
        invItem.partNumber === item.partNumber
      );
      
      // Calculate weighted average cost from all matching inventory items
      let totalCost = 0;
      let totalQty = 0;
      
      inventoryItems.forEach(invItem => {
        totalCost += invItem.cost * invItem.quantity;
        totalQty += invItem.quantity;
      });
      
      const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
      
      return {
        ...item,
        cost: parseFloat(avgCost.toFixed(2)), // Weighted average cost
        inInventory: inventoryItems.length > 0,
        availableQuantity: totalQty
      };
    });
    
    // Create show record with enriched items
    const showId = addShow({
      name: showName,
      date: showInfo?.date || new Date().toISOString(),
      location: showInfo?.location || '',
      items: enrichedItems
    });
    
    // Subtract items from inventory
    const result = subtractFromShootList(enrichedItems, fileName);
    
    return result;
  };

  const handleDeleteShow = (showId) => {
    // TODO: Return items back to inventory when show is deleted
    deleteShow(showId);
  };

  const handleViewShowDetails = (showId) => {
    setSelectedShowId(showId);
    setActiveTab('show-details');
  };

  const handleBackToShows = () => {
    setSelectedShowId(null);
    setActiveTab('shows');
  };

  const handleViewInventoryDetails = (partNumber) => {
    setSelectedPartNumber(partNumber);
    setActiveTab('inventory-details');
  };

  const handleBackToInventory = () => {
    setSelectedPartNumber(null);
    setActiveTab('inventory');
  };

  const handleViewOrderInventory = (orderNumber) => {
    setSelectedOrderNumber(orderNumber);
    setSelectedPartNumber(null);
    setActiveTab('inventory');
  };

  const handleBackToOrders = () => {
    setSelectedOrderNumber(null);
    setActiveTab('orders');
  };

  if (loading || ordersLoading || showsLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Fireworks Inventory</h1>
          <p className="subtitle">Track your pyrotechnic products</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            + Add Item
          </button>
          <div className="dropdown">
            <button className="btn-secondary">Export</button>
            <div className="dropdown-content">
              <button onClick={() => handleExport('csv')}>Export CSV</button>
              <button onClick={() => handleExport('excel')}>Export Excel</button>
              <button onClick={() => handleExport('json')}>Export JSON</button>
            </div>
          </div>
          <label className="btn-secondary import-btn">
            Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              style={{ display: 'none' }}
            />
          </label>
          <button onClick={handleClearInventory} className="btn-danger">
            Clear All
          </button>
        </div>
      </header>

      <nav className="tab-nav">
        <button 
          className={`tab ${activeTab === 'current-inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('current-inventory')}
        >
          Current Inventory
        </button>
        <button 
          className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button 
          className={`tab ${activeTab === 'shows' || activeTab === 'show-details' ? 'active' : ''}`}
          onClick={() => setActiveTab('shows')}
        >
          Shows
        </button>
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Files
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'current-inventory' && (
          <CurrentInventory
            inventory={inventory}
            shows={shows}
            orders={orders}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryList
            inventory={inventory.filter(item => 
              !selectedOrderNumber || item.orderNumber === selectedOrderNumber
            )}
            orderNumber={selectedOrderNumber}
            onViewDetails={handleViewInventoryDetails}
            onBack={selectedOrderNumber ? handleBackToOrders : null}
          />
        )}

        {activeTab === 'inventory-details' && (
          <InventoryDetails
            partNumber={selectedPartNumber}
            inventory={inventory.filter(item => 
              !selectedOrderNumber || item.orderNumber === selectedOrderNumber
            )}
            orderNumber={selectedOrderNumber}
            onBack={handleBackToInventory}
            onUpdate={updateItem}
            onDelete={deleteItem}
          />
        )}

        {activeTab === 'orders' && (
          <>
            <div className="orders-header">
              <button onClick={() => setShowAddOrderModal(true)} className="btn-primary">
                + Add Order
              </button>
            </div>
            <OrdersTable
              orders={orders}
              onUpdate={updateOrder}
              onDelete={handleDeleteOrder}
              onViewInventory={handleViewOrderInventory}
            />
          </>
        )}

        {activeTab === 'shows' && (
          <ShowsTable
            shows={shows}
            onDeleteShow={handleDeleteShow}
            onViewDetails={handleViewShowDetails}
          />
        )}

        {activeTab === 'show-details' && (
          <ShowDetailsTable
            show={shows.find(s => s.id === selectedShowId)}
            onBack={handleBackToShows}
          />
        )}

        {activeTab === 'upload' && (
          <div className="upload-section">
            <div className="upload-column">
              <FileUpload
                type="invoice"
                onUpload={handleInvoiceUpload}
                inventory={inventory}
              />
            </div>
            <div className="upload-column">
              <FileUpload
                type="shootList"
                onUpload={handleShootListUpload}
                inventory={inventory}
              />
            </div>
          </div>
        )}
      </main>

      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addItem}
      />
      
      <AddOrderModal
        isOpen={showAddOrderModal}
        onClose={() => setShowAddOrderModal(false)}
        onAdd={addOrder}
        existingOrders={orders}
      />
    </div>
  );
}

export default App;
