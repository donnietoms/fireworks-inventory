import { useState } from 'react';
import { useInventory } from './hooks/useInventory';
import { useOrders } from './hooks/useOrders';
import InventoryTable from './components/InventoryTable';
import OrdersTable from './components/OrdersTable';
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
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');

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

  const handleInvoiceUpload = (items, fileName, orderInfo) => {
    // Get order number
    const orderNumber = orderInfo?.orderNumber || fileName;
    
    // Check if order already exists
    const existingOrder = orders.find(o => o.orderNumber === orderNumber);
    if (existingOrder) {
      alert(`Order ${orderNumber} already exists!\n\nPlease use a different order number or delete the existing order first.`);
      return { warnings: [{ error: 'Duplicate order number' }] };
    }
    
    // Add items to inventory with order number
    const result = addFromInvoice(items, fileName, orderNumber);
    
    // Create order record if orderInfo provided
    if (orderInfo) {
      addOrder({
        vendor: orderInfo.vendor || 'Unknown',
        orderNumber: orderNumber,
        subtotal: orderInfo.subtotal || items.reduce((sum, item) => sum + (item.quantity * item.cost), 0),
        discount: orderInfo.discount || 0,
        total: orderInfo.total || items.reduce((sum, item) => sum + (item.quantity * item.cost), 0)
      });
    }
    
    return result;
  };

  const handleDeleteOrder = (orderId, orderNumber) => {
    if (confirm(`Delete order ${orderNumber}?\n\nThis will also remove all inventory items from this order.`)) {
      deleteOrder(orderId);
      deleteItemsByOrder(orderNumber);
    }
  };

  if (loading || ordersLoading) {
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
          className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
        <button 
          className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Files
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'inventory' && (
          <InventoryTable
            inventory={inventory}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onOrderClick={() => setActiveTab('orders')}
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
            />
          </>
        )}

        {activeTab === 'upload' && (
          <div className="upload-section">
            <div className="upload-column">
              <FileUpload
                type="invoice"
                onUpload={handleInvoiceUpload}
              />
            </div>
            <div className="upload-column">
              <FileUpload
                type="shootList"
                onUpload={subtractFromShootList}
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
