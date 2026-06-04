const getStorageKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id || user?.userId || 'anonymous';
    return `user_orders_${userId}`;
  } catch {
    return 'user_orders_anonymous';
  }
};

const OrderService = {
  getOrders: () => {
    try {
      const key = getStorageKey();
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveOrder: (order) => {
    try {
      const key = getStorageKey();
      const orders = OrderService.getOrders();
      // Check for duplicate orderNumber to prevent duplicates
      const exists = orders.some(o => o.orderNumber === order.orderNumber);
      if (exists) return true;
      orders.unshift(order);
      localStorage.setItem(key, JSON.stringify(orders));
      return true;
    } catch {
      return false;
    }
  },

  getOrderById: (orderNumber) => {
    const orders = OrderService.getOrders();
    return orders.find(o => o.orderNumber === orderNumber) || null;
  },

  generateOrderNumber: () => {
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 900000) + 100000;
    return `ORD-${year}-${random}`;
  }
};

export default OrderService;