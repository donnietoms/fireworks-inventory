import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
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
import ManualOrderModal from './components/ManualOrderModal';
import ManualShowModal from './components/ManualShowModal';
import { exportToCSV, exportToExcel } from './utils/fileParser';
import { exportToJSON, importFromJSON } from './utils/storage';
import './InventoryApp.css';

const MESSAGES = {
  ERROR: {
    UPLOAD_FAILED: 'Upload failed. Please try again.',
    DELETE_FAILED: 'Delete operation failed. Please try again.',
    UPDATE_FAILED: 'Update operation failed. Please try again.',
  },
  SUCCESS: {
    ORDER_DELETED: 'Order deleted successfully',
    SHOW_DELETED: 'Show deleted successfully',
  }
};

function InventoryApp() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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
    clearShows,
    resyncShowCosts
  } = useShows();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const [showManualShowModal, setShowManualShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null); // Order being edited
  const [editingShow, setEditingShow] = useState(null); // Show being edited
  const [activeTab, setActiveTab] = useState('current-inventory');
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [selectedPartNumber, setSelectedPartNumber] = useState(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationError, setOperationError] = useState(null);

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
    setOperationLoading(true);
    setOperationError(null);
    
    try {
      // Get order number
      const orderNumber = orderInfo?.orderNumber || fileName;
      
      // Get order date from parser (should already be provided from FileUpload component)
      let orderDate = orderInfo?.orderDate;
      if (!orderDate) {
        return { warnings: [{ error: 'Order date is required' }] };
      }
      
      // Ensure orderDate is in YYYY-MM-DD format
      if (orderDate && !orderDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        return { warnings: [{ error: 'Invalid order date format' }] };
      }
      
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
          await deleteOrder(existingOrder.id);
          await deleteItemsByOrder(orderNumber);
          
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
      
      // Create order record if orderInfo provided
      let createdOrder = null;
      if (orderInfo) {
        createdOrder = await addOrder({
          vendor: orderInfo.vendor || 'Unknown',
          orderNumber: orderNumber,
          orderDate: orderDate,  // Add orderDate as a separate field
          subtotal: orderInfo.subtotal || 0,
          discount: orderInfo.discount || 0,
          total: orderInfo.total || 0,
          invoiceFile: orderInfo.savedFileName || null, // Store the saved filename
          originalFileName: fileName
        });
      }
      
      // Add items to inventory with order number, date, vendor, and order ID
      const itemsWithOrderId = items.map(item => ({
        ...item,
        orderId: createdOrder?.id
      }));
      const result = await addFromInvoice(itemsWithOrderId, fileName, orderNumber, orderDate, orderInfo?.vendor || 'Unknown');
      
      return result;
    } catch (error) {
      console.error('Error uploading invoice:', error);
      setOperationError(error.message || MESSAGES.ERROR.UPLOAD_FAILED);
      return { warnings: [{ error: error.message || MESSAGES.ERROR.UPLOAD_FAILED }] };
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    if (!confirm(`Delete order ${orderNumber}?\n\nThis will also remove all inventory items from this order.`)) {
      return;
    }
    
    setOperationLoading(true);
    setOperationError(null);
    
    try {
      // Find the order to get invoice file info
      const order = orders.find(o => o.id === orderId);
      
      // Delete the order and inventory items
      await deleteOrder(orderId);
      await deleteItemsByOrder(orderNumber);
      
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
    } catch (error) {
      console.error('Error deleting order:', error);
      setOperationError(error.message || MESSAGES.ERROR.DELETE_FAILED);
      alert(`Error: ${error.message || MESSAGES.ERROR.DELETE_FAILED}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleShootListUpload = async (items, fileName, showInfo) => {
    setOperationLoading(true);
    setOperationError(null);
    
    try {
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
          await deleteShow(existingShow.id);
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
      const showId = await addShow({
        name: showName,
        date: showInfo?.date || new Date().toISOString(),
        location: showInfo?.location || '',
        items: enrichedItems
      });
      
      // Subtract items from inventory
      const result = await subtractFromShootList(enrichedItems, fileName);
      
      // Switch to Current Inventory tab to see updated quantities
      setActiveTab('current-inventory');
      
      return result;
    } catch (error) {
      console.error('Error uploading shoot list:', error);
      setOperationError(error.message || MESSAGES.ERROR.UPLOAD_FAILED);
      return { warnings: [{ error: error.message || MESSAGES.ERROR.UPLOAD_FAILED }] };
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteShow = async (showId) => {
    if (!confirm('Delete this show? Items will be returned to inventory.')) {
      return;
    }
    
    setOperationLoading(true);
    setOperationError(null);
    
    try {
      await deleteShow(showId);
      // Switch to Current Inventory tab to see updated quantities
      if (activeTab === 'shows' && !selectedShowId) {
        setActiveTab('current-inventory');
      }
    } catch (error) {
      console.error('Error deleting show:', error);
      setOperationError(error.message || MESSAGES.ERROR.DELETE_FAILED);
      alert(`Error: ${error.message || MESSAGES.ERROR.DELETE_FAILED}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleManualOrderEntry = async ({ order, items }) => {
    setOperationLoading(true);
    setOperationError(null);
    
    try {
      if (editingOrder) {
        // Update existing order
        await updateOrder(editingOrder.id, order);
        
        // Delete old inventory items for this order
        await deleteItemsByOrder(editingOrder.orderNumber);
        
        // Add new inventory items with order ID
        const itemsWithOrderId = items.map(item => ({
          ...item,
          orderId: editingOrder.id
        }));
        await addFromInvoice(itemsWithOrderId, `Manual Order #${order.orderNumber}`, order.orderNumber, order.orderDate, order.vendor);
        
        setEditingOrder(null);
      } else {
        // Add new order
        const createdOrder = await addOrder(order);
        
        // Add all items to inventory with order ID
        const itemsWithOrderId = items.map(item => ({
          ...item,
          orderId: createdOrder.id
        }));
        await addFromInvoice(itemsWithOrderId, `Manual Order #${order.orderNumber}`, order.orderNumber, order.orderDate, order.vendor);
      }
    } catch (error) {
      console.error('Error saving manual order:', error);
      setOperationError(error.message || MESSAGES.ERROR.UPDATE_FAILED);
      alert(`Error: ${error.message || MESSAGES.ERROR.UPDATE_FAILED}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditOrder = (order) => {
    // Get inventory items for this order
    const orderItems = inventory.filter(item => item.orderNumber === order.orderNumber);
    
    setEditingOrder({
      ...order,
      items: orderItems
    });
    setShowManualOrderModal(true);
  };

  const handleManualShowEntry = async (showData) => {
    setOperationLoading(true);
    setOperationError(null);
    
    try {
      if (editingShow) {
        // Editing existing show - delete old one and add new
        await deleteShow(editingShow.id); // This will return items to inventory
        await addShow({ ...showData, id: editingShow.id }); // Keep same ID
        await subtractFromShootList(showData.items, null, { ...showData, id: editingShow.id });
        setEditingShow(null);
        setShowManualShowModal(false);
        // Switch to Current Inventory to show updated quantities
        setActiveTab('current-inventory');
      } else {
        // Creating new show
        await addShow(showData);
        await subtractFromShootList(showData.items, null, showData);
      }
      setShowManualShowModal(false);
    } catch (error) {
      console.error('Error saving manual show:', error);
      setOperationError(error.message || MESSAGES.ERROR.UPDATE_FAILED);
      alert(`Error: ${error.message || MESSAGES.ERROR.UPDATE_FAILED}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditShow = (show) => {
    setEditingShow(show);
    setShowManualShowModal(true);
  };

  const handleResyncShow = async (showId) => {
    setOperationLoading(true);
    setOperationError(null);
    
    try {
      const result = await resyncShowCosts(showId, inventory);
      alert(`Show costs resynced successfully! New total: $${result.totalValue.toFixed(2)}`);
    } catch (error) {
      console.error('Error resyncing show:', error);
      setOperationError(error.message || 'Failed to resync show costs');
      alert(`Error: ${error.message || 'Failed to resync show costs'}`);
    } finally {
      setOperationLoading(false);
    }
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

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await signOut();
      navigate('/');
    }
  };

  if (loading || ordersLoading || showsLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🎆 Fireworks Inventory</h1>
          <p className="subtitle">Track your pyrotechnic products</p>
        </div>
        <div className="header-actions">
          <span className="user-name">👤 {user?.name || user?.email}</span>
          <button onClick={() => navigate('/app/settings')} className="btn-settings" title="Account Settings">
            ⚙️ Settings
          </button>
          <button onClick={handleLogout} className="btn-logout" title="Log out of the application">
            Logout
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
        {operationError && (
          <div className="error-banner">
            <strong>Error:</strong> {operationError}
            <button onClick={() => setOperationError(null)} className="error-close">×</button>
          </div>
        )}
        
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
            order={selectedOrderNumber ? orders.find(o => o.orderNumber === selectedOrderNumber) : null}
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
              <button onClick={() => setActiveTab('upload')} className="btn-primary" title="Upload an order invoice file">
                📤 Upload Order
              </button>
              <button onClick={() => setShowManualOrderModal(true)} className="btn-secondary" title="Add order manually without uploading a file">
                ✏️ Manual Order
              </button>
            </div>
            <OrdersTable
              orders={orders}
              inventory={inventory}
              onUpdate={updateOrder}
              onDelete={handleDeleteOrder}
              onEdit={handleEditOrder}
              onViewInventory={handleViewOrderInventory}
            />
          </>
        )}

        {activeTab === 'shows' && (
          <>
            <div className="orders-header">
              <button onClick={() => setActiveTab('upload')} className="btn-primary" title="Upload a show file">
                📤 Upload Show
              </button>
              <button onClick={() => setShowManualShowModal(true)} className="btn-secondary" title="Add show manually without uploading a file">
                ✏️ Manual Show
              </button>
            </div>
            <ShowsTable
              shows={shows}
              onDeleteShow={handleDeleteShow}
              onViewDetails={handleViewShowDetails}
              onEdit={handleEditShow}
              onResync={handleResyncShow}
            />
          </>
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
                disabled={operationLoading}
              />
            </div>
            <div className="upload-column">
              <FileUpload
                type="shootList"
                onUpload={handleShootListUpload}
                inventory={inventory}
                disabled={operationLoading}
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

      <ManualOrderModal
        isOpen={showManualOrderModal}
        onClose={() => {
          setShowManualOrderModal(false);
          setEditingOrder(null);
        }}
        onAdd={handleManualOrderEntry}
        existingOrders={orders}
        editingOrder={editingOrder}
        inventory={inventory}
      />

      <ManualShowModal
        isOpen={showManualShowModal}
        onClose={() => {
          setShowManualShowModal(false);
          setEditingShow(null);
        }}
        onAdd={handleManualShowEntry}
        existingShows={shows}
        editingShow={editingShow}
        inventory={inventory}
      />
    </div>
  );
}

export default InventoryApp;
