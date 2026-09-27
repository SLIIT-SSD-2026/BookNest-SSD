import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const endSession = async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // The cookie may already be missing or expired.
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyToken: () => api.post('/auth/verify-token'),
  logout: () => api.post('/auth/logout'),
};

export const feedbackAPI = {
  create: (payload) => api.post('/feedback', payload),
  listMine: (params = {}) => api.get('/feedback', { params }),
  listForSeller: (params = {}) => api.get('/feedback/seller', { params }),
  getByOrder: (orderId) => api.get(`/feedback/order/${orderId}`),
  update: (feedbackId, payload) => api.put(`/feedback/${feedbackId}`, payload),
  remove: (feedbackId) => api.delete(`/feedback/${feedbackId}`),
};

export const productAPI = {
  createProduct: (productData) => api.post('/products', productData),
  getAllProducts: () => api.get('/products'),
  getCategories: () => api.get('/products/categories'),
  getProductsBySeller: (sellerId) =>
    api.get(`/products/seller/${sellerId}`),
  getProductById: (productId) =>
    api.get(`/products/${productId}`),
  updateProduct: (productId, updateData) =>
    api.put(`/products/${productId}`, updateData),
  deleteProduct: (productId) =>
    api.delete(`/products/${productId}`),
};

export const orderAPI = {
  // Order CRUD operations
  getOrders: () => api.get('/orders'),
  createOrder: (orderData) => api.post('/orders', orderData),
  getOrderById: (orderId) => api.get(`/orders/${orderId}`),
  getOrdersByCustomerId: (customerId) => api.get(`/orders/customer/${customerId}`),
  getOrdersByProductId: (productId) => api.get(`/orders/product/${productId}`),
  updateOrder: (orderId, updateData) => api.patch(`/orders/${orderId}`, updateData),
  deleteOrder: (orderId) => api.delete(`/orders/${orderId}`),
  
  // Integration endpoints
  getCustomerDetails: (customerId) => api.get(`/orders/customer-details/${customerId}`),
  getProductDetails: (productId) => api.get(`/orders/product-details/${productId}`),
};

export const customerAPI = {
  getCustomerById: (customerId) => api.get(`/customers/${customerId}`),
  getSummary: (customerId) => api.get(`/customers/${customerId}/summary`),
};

export const sellerAPI = {
  getSellerById: (sellerId) => api.get(`/sellers/${sellerId}`),
};

export default api;
