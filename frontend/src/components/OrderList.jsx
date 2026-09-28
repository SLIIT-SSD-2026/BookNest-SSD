import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchOrders(parsedUser);
  }, [navigate]);

  const fetchOrders = async (userData) => {
    try {
      setLoading(true);
      let response;
      
      if (userData.role === 'customer') {
        // Fetch customer's orders
        response = await api.get(`/orders/customer/${userData.userId}`);
      } else if (userData.role === 'seller') {
        // For sellers, we might want to fetch all orders or orders for their products
        // This would need a different endpoint or filtering logic
        response = await api.get('/orders'); // This would need implementation in order service
      }
      
      if (response && response.data.success) {
        setOrders(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (orderId) => {
    navigate(`/order-details/${orderId}`);
  };

  const handleEditOrder = (orderId) => {
    navigate(`/order-details/${orderId}`);
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingOrderId(orderId);
      const response = await api.delete(`/orders/${orderId}`);
      
      if (response.data.success) {
        setOrders(orders.filter(order => order.orderId !== orderId));
        alert('Order deleted successfully!');
      }
    } catch (err) {
      console.error('Error deleting order:', err);
      alert(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const canModifyOrder = (order) => {
    // Only allow modification if user is admin, seller, or the order belongs to the customer
    if (user?.role === 'admin' || user?.role === 'seller') return true;
    if (user?.role === 'customer' && order.customerId === user?.userId) return true;
    return false;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ {error}</div>
          <button
            onClick={() => navigate('/customer-dashboard')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition duration-300"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-800">
                Book<span className="text-indigo-600">Nest</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(user?.role === 'customer' ? '/customer-dashboard' : '/seller-dashboard')}
                className="text-gray-700 hover:text-indigo-600 transition duration-300"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">My Orders</h2>
            <p className="text-gray-600 mt-2">Track and manage your book orders</p>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Orders Yet</h3>
              <p className="text-gray-600 mb-6">Start browsing our collection to place your first order!</p>
              <button
                onClick={() => navigate('/customer-dashboard')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition duration-300"
              >
                Browse Books
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((order) => (
                <div
                  key={order._id}
                  onClick={() => handleViewOrder(order.orderId)}
                  className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{order.orderId}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Items:</span>
                        <span className="font-medium text-gray-900">{order.items.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium text-gray-900">
                          ${order.totalAmount?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-600 truncate">
                        📍 {order.shippingAddress}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {canModifyOrder(order) && (
                      <div className="border-t pt-4 mt-4 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditOrder(order.orderId);
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 px-3 rounded transition duration-300"
                        >
                          Edit / View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.orderId);
                          }}
                          disabled={deletingOrderId === order.orderId}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm py-2 px-3 rounded transition duration-300"
                        >
                          {deletingOrderId === order.orderId ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
