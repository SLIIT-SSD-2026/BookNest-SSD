import axios from 'axios';

const normalizeCustomerServiceBase = () => {
  let base = (process.env.CUSTOMER_SERVICE_URL || '').trim().replace(/\/$/, '');
  base = base.replace(/\/api\/customers\/?$/i, '');
  return base;
};

export const fetchCustomerById = async (customerId) => {
  const baseUrl = normalizeCustomerServiceBase();
  if (!baseUrl) {
    const err = new Error('CUSTOMER_SERVICE_URL is not configured');
    err.status = 503;
    throw err;
  }

  try {
    const response = await axios.get(`${baseUrl}/api/customers/${encodeURIComponent(customerId)}`, {
      timeout: 5000
    });

    const customer = response.data?.data?.customer;
    return customer || null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    const err = new Error(error.response?.data?.message || 'Unable to reach customer service');
    err.status = error.response?.status || 502;
    throw err;
  }
};
