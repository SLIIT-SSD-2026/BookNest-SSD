import Order from '../models/Order.js';
import axios from 'axios';

const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL;
const SELLER_SERVICE_URL = process.env.SELLER_SERVICE_URL;

const fetchCustomerById = async (customerId) => {
  const trimmedBase = (CUSTOMER_SERVICE_URL || '').replace(/\/$/, '');
  const candidates = [
    `${trimmedBase}/${customerId}`,
    `${trimmedBase}/api/customers/${customerId}`,
    `http://${CUSTOMER_SERVICE_URL}/api/customers/${customerId}`
  ];

  let lastError;
  for (const url of candidates) {
    try {
      const response = await axios.get(url);
      const customer = response.data?.data?.customer || response.data?.data;
      if (customer) {
        return customer;
      }
    } catch (error) {
      lastError = error;
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  const notFoundError = new Error('Customer not found in customer service');
  notFoundError.status = 404;
  if (lastError) {
    notFoundError.cause = lastError;
  }
  throw notFoundError;
};

const canAccessOrder = (req, order) => {
  const role = req.user?.role;
  const userId = req.user?.userId || req.user?.id;

  if (role === 'seller' || role === 'admin') {
    return true;
  }

  return Boolean(userId && order.customerId === userId);
};

/**
 * Get orders
 * - customers: only their own orders
 * - sellers/admins: all orders
 * @route GET /api/orders
 * @access Private
 */
export const getOrders = async (req, res) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId || req.user?.id;

    let query = {};
    if (role === 'customer') {
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Unable to identify customer from token'
        });
      }
      query = { customerId: userId };
    }

    const orders = await Order.find(query).sort({ orderDate: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving orders',
      error: error.message
    });
  }
};

/**
 * Create a new order
 * @route POST /api/orders
 * @access Private
 */
export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;
    // Enforce tenant identity for customers to prevent IDOR
    const customerId = req.user?.role === 'customer' ? req.user.userId : req.body.customerId;

    // Validate required fields
    if (!customerId || !items || !items.length || !shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID, items, and shipping address are required'
      });
    }

    // Verify customer exists by calling customer service
    let customerDetails;
    try {
      customerDetails = await fetchCustomerById(customerId);
    } catch (error) {
      if (error.status === 404 || (error.response && error.response.status === 404)) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found in customer service'
        });
      }
      console.error('Error fetching customer details:', error.message);
      // Continue with provided customer data if service is unavailable
    }

    // Validate products and get product details from seller service
    const validatedItems = [];
    for (const item of items) {
      if (!item.productId || !item.productName || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          message: `Invalid item details for product: ${item.productName || 'Unknown'}`
        });
      }

      // Optionally verify product exists in seller service
      try {
        await axios.get(`${SELLER_SERVICE_URL}/api/sellers/products/${item.productId}`);
      } catch (error) {
        console.warn(`Product ${item.productId} verification failed or service unavailable`);
        // Continue even if product service is unavailable
      }

      validatedItems.push({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price
      });
    }

    // Create order object
    const orderData = {
      customerId,
      customerName: customerDetails?.name || req.body.customerName,
      customerEmail: customerDetails?.email || req.body.customerEmail,
      items: validatedItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'card',
      notes: notes || ''
    };

    // Create and save the order
    const order = new Order(orderData);
    await order.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

/**
 * Update order status
 * @route PATCH /api/orders/:orderId
 * @access Private
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    console.log('Updating order:', orderId);
    console.log('Request body:', req.body);

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find the order by orderId field (not _id)
    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {
      console.log('Order not found with orderId:', req.params.orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Order found:', order._id, 'with orderId:', order.orderId);

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this order'
      });
    }

    // Customers can only cancel their own pending orders
    if (req.user?.role === 'customer') {
      if (status !== 'cancelled' || order.status !== 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Customers can only cancel pending orders'
        });
      }
    }

    // Update status if provided
    if (status) {
      order.status = status;
      
      // Set delivery date if status is delivered
      if (status === 'delivered') {
        order.deliveryDate = new Date();
      }
    }

    // Update notes if provided
    if (notes) {
      order.notes = notes;
    }

    await order.save();

    console.log('Order updated successfully');

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating order',
      error: error.message
    });
  }
};

/**
 * Update order (full edit)
 * @route PUT /api/orders/:orderId
 * @access Private
 */
export const updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { shippingAddress, paymentMethod, notes, items } = req.body;

    console.log('Full update order:', orderId);
    console.log('Request body:', req.body);

    // Find the order
    const order = await Order.findOne({ orderId });

    if (!order) {
      console.log('Order not found with orderId:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Order found:', order._id, 'with orderId:', order.orderId);

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this order'
      });
    }

    // Customers can only edit pending orders
    if (req.user?.role === 'customer' && order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be edited'
      });
    }

    // Validate and update fields
    if (shippingAddress) {
      if (typeof shippingAddress !== 'string' || shippingAddress.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address must be a non-empty string'
        });
      }
      order.shippingAddress = shippingAddress.trim();
    }

    if (paymentMethod) {
      const validPaymentMethods = ['card', 'cash', 'online'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`
        });
      }
      order.paymentMethod = paymentMethod;
    }

    if (notes !== undefined) {
      if (notes.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Notes cannot exceed 500 characters'
        });
      }
      order.notes = notes;
    }

    // Update items if provided
    if (items && Array.isArray(items)) {
      if (items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order must have at least one item'
        });
      }

      // Validate each item
      const validatedItems = [];
      for (const item of items) {
        if (!item.productId || !item.productName || !item.quantity || !item.price) {
          return res.status(400).json({
            success: false,
            message: `Invalid item details for product: ${item.productName || 'Unknown'}`
          });
        }

        if (item.quantity < 1) {
          return res.status(400).json({
            success: false,
            message: `Quantity must be at least 1 for product: ${item.productName}`
          });
        }

        if (item.price < 0) {
          return res.status(400).json({
            success: false,
            message: `Price cannot be negative for product: ${item.productName}`
          });
        }

        validatedItems.push({
          productId: item.productId,
          productName: item.productName,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price)
        });
      }

      order.items = validatedItems;
      // totalAmount will be auto-calculated by the schema pre-save hook
    }

    await order.save();

    console.log('Order fully updated successfully');

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Full update order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating order',
      error: error.message
    });
  }
};

/**
 * Get a single order by ID
 * @route GET /api/orders/:orderId
 * @access Private
 */
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving order',
      error: error.message
    });
  }
};

/**
 * Delete an order
 * @route DELETE /api/orders/:orderId
 * @access Private
 */
export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this order'
      });
    }

    // Customers can only delete their own pending orders
    if (req.user?.role === 'customer' && order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be deleted'
      });
    }

    await Order.deleteOne({ _id: order._id });

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting order',
      error: error.message
    });
  }
};

/**
 * Get orders by customer ID
 * @route GET /api/orders/customer/:customerId
 * @access Private
 */
export const getOrdersByCustomerId = async (req, res) => {
  try {
    const { customerId } = req.params;
    const role = req.user?.role;
    const userId = req.user?.userId || req.user?.id;

    if (role === 'customer' && userId !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own orders.'
      });
    }

    // First, verify customer exists by calling customer service
    try {
      await fetchCustomerById(customerId);
    } catch (error) {
      if (error.status === 404 || (error.response && error.response.status === 404)) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found in customer service'
        });
      }
      console.warn('Customer service unavailable, proceeding with order lookup');
    }

    const orders = await Order.find({ customerId }).sort({ orderDate: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get customer orders error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving customer orders',
      error: error.message
    });
  }
};

/**
 * Get a single order for a specific customer
 * @route GET /api/orders/customer/:customerId/order/:orderId
 * @access Private
 */
export const getCustomerOrderById = async (req, res) => {
  try {
    const { customerId, orderId } = req.params;
    const role = req.user?.role;
    const userId = req.user?.userId || req.user?.id;

    if (role === 'customer' && userId !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own orders.'
      });
    }

    const order = await Order.findOne({ orderId, customerId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get customer order by ID error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving customer order',
      error: error.message
    });
  }
};

/**
 * Get orders by product ID
 * @route GET /api/orders/product/:productId
 * @access Private
 */
export const getOrdersByProductId = async (req, res) => {
  try {
    const { productId } = req.params;
    const role = req.user?.role;

    // Restrict product-level order history to sellers and admins
    if (role !== 'seller' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only sellers and administrators can view product orders.'
      });
    }

    // First, verify product exists by calling seller service
    try {
      await axios.get(`${SELLER_SERVICE_URL}/api/sellers/products/${productId}`);
    } catch (error) {
      console.warn(`Product ${productId} verification failed or seller service unavailable`);
      // Continue even if product service is unavailable
    }

    const orders = await Order.find({ 'items.productId': productId }).sort({ orderDate: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get product orders error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error retrieving product orders',
      error: error.message
    });
  }
};

/**
 * Get customer details (integration endpoint)
 * @route GET /api/orders/customer-details/:customerId
 * @access Private
 */
export const getCustomerDetails = async (req, res) => {
  try {
    const { customerId } = req.params;
    const role = req.user?.role;
    const userId = req.user?.userId || req.user?.id;

    // Verify tenant ownership for customers
    if (role === 'customer' && userId !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own customer details.'
      });
    }
    
    // Forward the authorization header to customer service
    const authHeader = req.headers.authorization;
    
    console.log('Fetching customer details from:', `${CUSTOMER_SERVICE_URL}/${customerId}`);
    console.log('Auth header present:', !!authHeader);

    const response = await axios.get(`${CUSTOMER_SERVICE_URL}/${customerId}`, {
      headers: {
        Authorization: authHeader
      }
    });

    res.status(200).json({
      success: true,
      source: 'customer-service',
      data: response.data?.data?.customer || response.data?.data
    });
  } catch (error) {
    const { customerId } = req.params;
    console.error('Get customer details error:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Request URL:', `${CUSTOMER_SERVICE_URL}/${customerId}`);
    
    if (error.response) {
      console.error('Customer Service responded with status:', error.response.status);
      return res.status(error.response.status).json({
        success: false,
        message: 'Customer not found',
        error: error.response.data?.message || error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching customer details from customer service',
      error: error.message || 'Unknown error'
    });
  }
};

/**
 * Get product details (integration endpoint)
 * @route GET /api/orders/product-details/:productId
 * @access Private
 */
export const getProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Forward the authorization header to seller service
    const authHeader = req.headers.authorization;
    
    console.log('Fetching product details from:', `${SELLER_SERVICE_URL}/api/sellers/products/${productId}`);
    console.log('Auth header present:', !!authHeader);

    const response = await axios.get(`${SELLER_SERVICE_URL}/api/sellers/products/${productId}`, {
      headers: {
        Authorization: authHeader
      }
    });

    res.status(200).json({
      success: true,
      source: 'seller-service',
      data: response.data.data
    });
  } catch (error) {
    const { productId } = req.params;
    console.error('Get product details error:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Request URL:', `${SELLER_SERVICE_URL}/api/sellers/products/${productId}`);
    
    if (error.response) {
      console.error('Seller Service responded with status:', error.response.status);
      return res.status(error.response.status).json({
        success: false,
        message: 'Product not found',
        error: error.response.data?.message || error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching product details from seller service',
      error: error.message || 'Unknown error'
    });
  }
};
