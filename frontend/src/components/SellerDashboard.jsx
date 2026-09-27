import { useEffect, useState } from 'react';
import MyBooks from './MyBooks';
import EditBookForm from './EditBookForm';
import CustomerOrders from './CustomerOrders';
import { useNavigate } from 'react-router-dom';
import { endSession } from '../utils/api';

export default function SellerDashboard() {
  const [user] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  const [activeView, setActiveView] = useState('dashboard');
  const [editingBook, setEditingBook] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'seller') {
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
            <h2 className="text-3xl font-bold text-gray-900">Seller Dashboard</h2>
            <p className="text-gray-600 mt-2">Manage your books and sales</p>
          </div>

          {/* Navigation Cards — uniform layout (icon + title + subtitle), no per-tile rings or extra buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <button
              type="button"
              onClick={() => {
                setActiveView('myBooks');
                setEditingBook(null);
              }}
              className="bg-white overflow-hidden shadow rounded-lg p-6 text-left cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="text-3xl" aria-hidden>📖</div>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">My Books</h3>
                  <p className="text-gray-600">Manage your book inventory</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingBook(null);
                navigate('/seller/add-book');
              }}
              className="bg-white overflow-hidden shadow rounded-lg p-6 text-left cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="text-3xl" aria-hidden>➕</div>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Add Book</h3>
                  <p className="text-gray-600">List a new book for sale</p>
                </div>
              </div>
            </button>

            <div className="bg-white overflow-hidden shadow rounded-lg p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="text-3xl" aria-hidden>📊</div>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Sales</h3>
                  <p className="text-gray-600">View your sales analytics</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveView('orders');
                setEditingBook(null);
              }}
              className="bg-white overflow-hidden shadow rounded-lg p-6 text-left cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="text-3xl" aria-hidden>📦</div>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Orders</h3>
                  <p className="text-gray-600">Manage customer orders</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView('dashboard');
                setEditingBook(null);
              }}
              className="bg-white overflow-hidden shadow rounded-lg p-6 text-left cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="text-3xl" aria-hidden>👤</div>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Profile</h3>
                  <p className="text-gray-600">Manage your account</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/seller-feedback')}
              className="bg-white overflow-hidden shadow rounded-lg p-6 text-left cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <div className="shrink-0">
                  <div className="text-3xl" aria-hidden>⭐</div>
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Customer Feedback</h3>
                  <p className="text-gray-600">Read ratings from your customers</p>
                </div>
              </div>
            </button>
          </div>

          {/* Dynamic Content */}
          {activeView === 'myBooks' && (
            <>
              <div className="mb-8">
                <MyBooks
                  sellerId={user.userId}
                  onEdit={(book) => setEditingBook(book)}
                />
              </div>
              {editingBook && (
                <EditBookForm
                  book={editingBook}
                  onSuccess={() => {
                    setEditingBook(null);
                    // Simple way to refresh the list without extra wiring
                    window.location.reload();
                  }}
                  onCancel={() => setEditingBook(null)}
                />
              )}
            </>
          )}

          {activeView === 'orders' && (
            <div className="mb-8">
              <CustomerOrders />
            </div>
          )}

          {activeView === 'dashboard' && (
            <div className="bg-white shadow rounded-lg">
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
          )}
        </div>
      </div>
    </div>
  );
}
