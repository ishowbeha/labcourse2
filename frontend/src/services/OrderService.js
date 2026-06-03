const STORAGE_KEY = 'user_orders';

const OrderService = {
  getOrders: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveOrder: (order) => {
    try {
      const orders = OrderService.getOrders();
      orders.unshift(order);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
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