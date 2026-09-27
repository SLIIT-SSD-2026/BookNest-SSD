import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerAPI } from '../utils/api';

export default function CustomerProfile() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({ orderCount: 0, feedbackCount: 0 });

  const navigate = useNavigate();
  const { customerId } = useParams();

  useEffect(() => {
    const userData = localStorage.getItem('user');

    if (!userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    if (parsedUser.role !== 'customer' || parsedUser.userId !== customerId) {
      navigate('/customer-dashboard');
      return;
    }

    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetching profile and inter-service summary concurrently
        const [profileRes, summaryRes] = await Promise.all([
          customerAPI.getCustomerById(customerId),
          customerAPI.getSummary(customerId)
        ]);

        if (profileRes.data.success) {
          setCustomer(profileRes.data.data.customer);
        }

        if (summaryRes.data.success) {
          setSummary(summaryRes.data.data);
        }
      } catch (err) {
        // Logging for local dev, but using error state for UI
        const errorMsg = err.response?.data?.message || 'Failed to connect to the API Gateway at port 5000.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [navigate, customerId]);

  const handleBack = () => {
    navigate('/customer-dashboard');
  };

  // Fixed: Standard Loading UI
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={handleBack}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Book<span className="text-indigo-600">Nest</span>
        </h1>
        <button onClick={handleBack} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition">
          Back to Dashboard
        </button>
      </nav>

      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">👤</div>
          <h2 className="text-3xl font-bold text-gray-900">Customer Profile</h2>
          <p className="text-gray-600">Verified activity across services</p>
        </div>

        {/* Activity Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-indigo-600 p-6 rounded-xl text-white shadow-lg">
            <span className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <div className="text-4xl font-extrabold mt-2">{summary.orderCount}</div>
          </div>
          <div className="bg-emerald-600 p-6 rounded-xl text-white shadow-lg">
            <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Feedbacks Submitted</span>
            <div className="text-4xl font-extrabold mt-2">{summary.feedbackCount}</div>
          </div>
        </div>

        {/* Profile Details section */}
        <div className="bg-white shadow rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Account Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section>
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Full Name</label>
                  <p className="text-gray-900 font-medium">{customer?.name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Email Address</label>
                  <p className="text-gray-900 font-medium">{customer?.email}</p>
                </div>
              </section>
              <section>
                <div className="mb-4">
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Member Since</label>
                  <p className="text-gray-900 font-medium">
                    {customer?.createDate ? new Date(customer.createDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Account Status</label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase">
                    Active
                  </span>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}