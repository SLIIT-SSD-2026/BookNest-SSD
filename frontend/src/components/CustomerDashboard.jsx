import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endSession } from '../utils/api';

export default function CustomerDashboard() {
  const [user] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'customer') {
      navigate('/login');
    }
  }, [navigate, user]);

  const handleLogout = async () => {
    await endSession();
    navigate('/');
  };

  if (!user) return null;

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
              <span className="text-gray-700">Welcome, {user.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition duration-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Customer Dashboard</h2>
            <p className="text-gray-600 mt-2">Manage your book orders and account</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
        onClick={() => navigate('/create-order')}
      >
        <div className="p-6">
          <div className="flex items-center">
            <div>
              <div className="text-3xl">➕</div>
            </div>
            <div className="ml-5">
              <h3 className="text-lg font-medium text-gray-900">Create Order</h3>
              <p className="text-gray-600">Place a new book order</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">   
              <div className="p-6">
                <div className="flex items-center">
                  <div>
                    <div className="text-3xl">📚</div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">Browse Books</h3>
                    <p className="text-gray-600">Discover new books to read</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div>
                    <div className="text-3xl">🛒</div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">My Orders</h3>
                    <p className="text-gray-600">Track your book orders</p>
                  </div>
                </div>
              </div>
            </div>

<div 
  className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
  onClick={() => navigate('/orders')}
>
  <div className="p-6">
    <div className="flex items-center">
      <div>
        <div className="text-3xl">📦</div>
      </div>
      <div className="ml-5">
        <h3 className="text-lg font-medium text-gray-900">View All Orders</h3>
        <p className="text-gray-600">Manage and track orders</p>
      </div>
    </div>
  </div>
</div>

<div 
  className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
  onClick={() => navigate(`/customer-profile/${user.userId}`)}
>
              <div className="p-6">
                <div className="flex items-center">
                  <div>
                    <div className="text-3xl">👤</div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                    <p className="text-gray-600">Manage your account</p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              onClick={() => navigate('/customer-feedback')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/customer-feedback');
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="My Feedback — create and manage order feedback"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div>
                    <div className="text-3xl" aria-hidden>⭐</div>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">My Feedback</h3>
                    <p className="text-gray-600">Create and manage order feedback</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <p className="mt-1 text-sm text-gray-900">{user.userId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member Since</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(user.createDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
