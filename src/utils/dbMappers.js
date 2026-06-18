/**
 * Utility functions to map between database fields (snake_case) and JavaScript fields (camelCase)
 */

// Map order from database format to app format
export const mapOrderFromDB = (dbOrder) => {
  if (!dbOrder) return null;
  
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    vendor: dbOrder.vendor,
    orderDate: dbOrder.order_date,
    subtotal: dbOrder.subtotal,
    discount: dbOrder.discount,
    total: dbOrder.total,
    invoiceFile: dbOrder.invoice_pdf_url, // Map to invoiceFile for consistency
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at
  };
};

// Map order from app format to database format
export const mapOrderToDB = (appOrder) => {
  if (!appOrder) return null;
  
  const dbOrder = {};
  if (appOrder.orderNumber !== undefined) dbOrder.order_number = appOrder.orderNumber;
  if (appOrder.vendor !== undefined) dbOrder.vendor = appOrder.vendor;
  if (appOrder.orderDate !== undefined) dbOrder.order_date = appOrder.orderDate;
  if (appOrder.subtotal !== undefined) dbOrder.subtotal = appOrder.subtotal;
  if (appOrder.discount !== undefined) dbOrder.discount = appOrder.discount;
  if (appOrder.total !== undefined) dbOrder.total = appOrder.total;
  if (appOrder.invoiceFile !== undefined) dbOrder.invoice_pdf_url = appOrder.invoiceFile; // Map from invoiceFile
  
  return dbOrder;
};

// Map inventory item from database format to app format
export const mapInventoryFromDB = (dbItem) => {
  if (!dbItem) return null;
  
  return {
    id: dbItem.id,
    partNumber: dbItem.part_number,
    description: dbItem.description,
    quantity: dbItem.quantity,
    cost: dbItem.cost,
    lineTotal: dbItem.line_total,
    packing: dbItem.packing,
    cases: dbItem.cases,
    orderNumber: dbItem.order_number,
    orderDate: dbItem.order_date,
    vendor: dbItem.vendor,
    orderId: dbItem.order_id,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at
  };
};

// Map inventory item from app format to database format
export const mapInventoryToDB = (appItem) => {
  if (!appItem) return null;
  
  const dbItem = {};
  if (appItem.partNumber !== undefined) dbItem.part_number = appItem.partNumber;
  if (appItem.description !== undefined) dbItem.description = appItem.description;
  if (appItem.quantity !== undefined) dbItem.quantity = appItem.quantity;
  if (appItem.cost !== undefined) dbItem.cost = appItem.cost;
  if (appItem.lineTotal !== undefined) dbItem.line_total = appItem.lineTotal;
  if (appItem.packing !== undefined) dbItem.packing = appItem.packing;
  if (appItem.cases !== undefined) dbItem.cases = appItem.cases;
  if (appItem.orderNumber !== undefined) dbItem.order_number = appItem.orderNumber;
  if (appItem.orderDate !== undefined) dbItem.order_date = appItem.orderDate;
  if (appItem.vendor !== undefined) dbItem.vendor = appItem.vendor;
  if (appItem.orderId !== undefined) dbItem.order_id = appItem.orderId;
  
  return dbItem;
};

// Map show from database format to app format
export const mapShowFromDB = (dbShow) => {
  if (!dbShow) return null;
  
  return {
    id: dbShow.id,
    name: dbShow.show_name,
    date: dbShow.show_date,
    location: dbShow.location,
    totalValue: dbShow.total_value,
    items: dbShow.items ? dbShow.items.map(mapShowItemFromDB) : [],
    createdAt: dbShow.created_at,
    updatedAt: dbShow.updated_at
  };
};

// Map show item from database format to app format
export const mapShowItemFromDB = (dbItem) => {
  if (!dbItem) return null;
  
  return {
    id: dbItem.id,
    partNumber: dbItem.part_number,
    description: dbItem.description,
    quantity: dbItem.quantity,
    cost: dbItem.cost,
    lineTotal: dbItem.line_total,
    inInventory: dbItem.in_inventory,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at
  };
};

// Map show from app format to database format
export const mapShowToDB = (appShow) => {
  if (!appShow) return null;
  
  const dbShow = {};
  if (appShow.name !== undefined) dbShow.show_name = appShow.name;
  if (appShow.date !== undefined) dbShow.show_date = appShow.date;
  if (appShow.location !== undefined) dbShow.location = appShow.location;
  if (appShow.totalValue !== undefined) dbShow.total_value = appShow.totalValue;
  
  return dbShow;
};
