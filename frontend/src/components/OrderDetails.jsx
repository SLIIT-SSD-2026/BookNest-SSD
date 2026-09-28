import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import OrderEditDetailsForm from './OrderEditDetailsForm';

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [editing, setEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchOrder(orderId);
  }, [navigate, orderId]);

  useEffect(() => {
    if (order) {
      setNewStatus(order.status);
      setEditedOrder({ ...order });
    }
  }, [order]);

  const fetchOrder = async (id) => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      
      if (response.data.success) {
        setOrder(response.data.data);
      } else {
        setError('Failed to load order details');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Order not found or unable to load');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === order.status) {
      alert('Please select a different status');
      return;
    }
    
    try {
      setUpdating(true);
      console.log('Updating order status from', order.status, 'to', newStatus);
      const response = await api.patch(`/orders/${orderId}`, {
        status: newStatus
      });
      
      if (response.data.success) {
        setOrder(response.data.data);
        alert('Order status updated successfully!');
      } else {
        alert('Failed to update order status: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update order status';
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleEditOrder = () => {
    setEditing(true);
    // For customers, we'll show the form component
    // For sellers/admins, we'll use inline editing
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditedOrder({ ...order });
  };

  const handleSaveEdit = async () => {
    try {
      setUpdating(true);
      console.log('Saving edited order:', editedOrder);
      
      const updateData = {
        shippingAddress: editedOrder.shippingAddress,
        notes: editedOrder.notes,
        paymentMethod: editedOrder.paymentMethod,
        items: editedOrder.items
      };
      
      const response = await api.put(`/orders/${orderId}`, updateData);
      
      if (response.data.success) {
        setOrder(response.data.data);
        setEditing(false);
        alert('Order updated successfully!');
      } else {
        alert('Failed to update order: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating order:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update order';
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleItemQuantityChange = (index, newQuantity) => {
    const updatedItems = [...editedOrder.items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: Math.max(1, parseInt(newQuantity) || 1)
    };
    setEditedOrder({ ...editedOrder, items: updatedItems });
  };

  const handleRemoveItem = (index) => {
    if (editedOrder.items.length === 1) {
      alert('Cannot remove the last item. Please cancel the order instead.');
      return;
    }
    
    if (window.confirm('Are you sure you want to remove this item from the order?')) {
      const updatedItems = editedOrder.items.filter((_, i) => i !== index);
      setEditedOrder({ ...editedOrder, items: updatedItems });
    }
  };

  const handleDeleteOrder = async () => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await api.delete(`/orders/${orderId}`);
      
      if (response.data.success) {
        alert('Order deleted successfully!');
        navigate('/orders');
      }
    } catch (err) {
      console.error('Error deleting order:', err);
      alert(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
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

  const canUpdateOrder = user?.role === 'seller' || user?.role === 'admin';
  const canCustomerEdit = (user?.role === 'customer' && 
                           order?.customerId === user.userId && 
                           order?.status === 'pending') || 
                          user?.role === 'seller' || user?.role === 'admin';

  const calculateTotal = (items) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ {error || 'Order not found'}</div>
          <button
            onClick={() => navigate('/orders')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition duration-300"
          >
            Back to Orders
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
                onClick={() => navigate('/orders')}
                className="text-gray-700 hover:text-indigo-600 transition duration-300"
              >
                ← Back to Orders
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Order Header */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editing ? 'Edit Order' : 'Order Details'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{order.orderId}</p>
                </div>
                <div className="flex items-center gap-3">
                  {!editing && canCustomerEdit && (
                    <button
                      onClick={handleEditOrder}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition duration-300 text-sm font-medium"
                    >
                      ✏️ Edit Order
                    </button>
                  )}
                  {user?.role === 'customer' && order?.status !== 'pending' && (
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                      🔒 Orders in "{order.status}" status cannot be edited
                    </div>
                  )}
                  {editing && (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition duration-300 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={updating}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg transition duration-300 text-sm font-medium"
                      >
                        {updating ? 'Saving...' : '💾 Save Changes'}
                      </button>
                    </>
                  )}
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Customer Information</h3>
                  <div className="space-y-1">
                    <p className="text-gray-900">{order.customerName}</p>
                    <p className="text-gray-600 text-sm">{order.customerEmail}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Order Date</h3>
                  <p className="text-gray-900">
                    {new Date(order.orderDate).toLocaleString()}
                  </p>
                  {order.deliveryDate && (
                    <>
                      <h3 className="text-sm font-medium text-gray-500 mb-2 mt-3">Delivered On</h3>
                      <p className="text-gray-900">
                        {new Date(order.deliveryDate).toLocaleString()}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Shipping Address</h3>
                {editing && (user?.role === 'seller' || user?.role === 'admin') ? (
                  <textarea
                    value={editedOrder.shippingAddress}
                    onChange={(e) => setEditedOrder({ ...editedOrder, shippingAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                  />
                ) : (
                  <p className="text-gray-900">{order.shippingAddress}</p>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Method</h3>
                {editing && (user?.role === 'seller' || user?.role === 'admin') ? (
                  <select
                    value={editedOrder.paymentMethod}
                    onChange={(e) => setEditedOrder({ ...editedOrder, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                ) : (
                  <>
                    <p className="text-gray-900 capitalize">{order.paymentMethod}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Status: <span className="font-medium">{order.paymentStatus}</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
              {editing && (
                <span className="text-sm text-indigo-600 font-medium">Click on quantity to edit</span>
              )}
            </div>
            <div className="divide-y divide-gray-200">
              {editing && (user?.role === 'seller' || user?.role === 'admin') ? (
                editedOrder.items.map((item, index) => (
                  <div key={index} className="px-6 py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-600">Product ID: {item.productId}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                          />
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="font-medium text-gray-900">${item.price.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Total: ${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Remove item"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                order.items.map((item, index) => (
                  <div key={index} className="px-6 py-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.productName}</h4>
                        <p className="text-sm text-gray-600">Product ID: {item.productId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${item.price.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ${editing ? calculateTotal(editedOrder.items).toFixed(2) : (order.totalAmount?.toFixed(2) || '0.00')}
                </span>
              </div>
            </div>
          </div>

          {/* Update Status (for sellers/admins) */}
          {canUpdateOrder && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Update Order Status</h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center space-x-4">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updating || newStatus === order.status}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition duration-300"
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Order (for authorized users) */}
          {canUpdateOrder && (
            <div className="bg-white shadow rounded-lg mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Danger Zone</h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-600 mb-4">
                  Once you delete an order, it cannot be recovered. Please be certain.
                </p>
                <button
                  onClick={handleDeleteOrder}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-2 rounded-lg transition duration-300"
                >
                  {deleting ? 'Deleting...' : 'Delete Order'}
                </button>
              </div>
            </div>
          )}

          {/* Customer Edit Form */}
          {editing && user?.role === 'customer' && (
            <OrderEditDetailsForm
              order={order}
              onSuccess={(updatedOrder) => {
                setOrder(updatedOrder);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          )}

          {/* Additional Information */}
          {order.notes && (
            <div className="bg-white shadow rounded-lg mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Order Notes</h3>
              </div>
              <div className="px-6 py-4">
                {editing && (user?.role === 'seller' || user?.role === 'admin') ? (
                  <textarea
                    value={editedOrder.notes || ''}
                    onChange={(e) => setEditedOrder({ ...editedOrder, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="4"
                    placeholder="Add order notes..."
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
