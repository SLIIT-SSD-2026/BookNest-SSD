import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { endSession, feedbackAPI, orderAPI } from '../utils/api';

const MIN_FEEDBACK_COMMENT_LENGTH = 3;

const initialForm = {
  orderId: '',
  productId: '',
  rating: '5',
  comment: ''
};

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrderOptions, setLoadingOrderOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchProductId, setSearchProductId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editData, setEditData] = useState({ rating: '5', comment: '' });

  const clearAlerts = useCallback(() => {
    setError('');
    setMessage('');
    setShowThankYou(false);
  }, []);

  const loadFeedback = useCallback(async (orderId = '', productId = '', options = {}) => {
    const { preserveThankYouBanner = false } = options;
    setLoading(true);
    if (!preserveThankYouBanner) clearAlerts();
    try {
      const params = {};
      if (orderId) params.orderId = orderId;
      if (productId) params.productId = productId;
      const response = await feedbackAPI.listMine(params);
      const feedbackItems = response.data?.data?.feedback || [];
      setItems(feedbackItems);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load feedback');
      if (preserveThankYouBanner) setShowThankYou(false);
    } finally {
      setLoading(false);
    }
  }, [clearAlerts]);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');

    if (!rawUser) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(rawUser);
    if (parsedUser.role !== 'customer') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    loadFeedback();
  }, [navigate, loadFeedback]);

  useEffect(() => {
    if (!user?.userId) return undefined;

    let cancelled = false;
    (async () => {
      setLoadingOrderOptions(true);
      try {
        const res = await orderAPI.getOrders();
        const orders = res.data?.data;
        if (!cancelled) {
          setCustomerOrders(Array.isArray(orders) ? orders : []);
        }
      } catch (err) {
        if (!cancelled) {
          setCustomerOrders([]);
          setError(err.response?.data?.message || 'Failed to load your orders');
        }
      } finally {
        if (!cancelled) setLoadingOrderOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!deleteTarget) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !deleteSubmitting) setDeleteTarget(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteTarget, deleteSubmitting]);

  useEffect(() => {
    if (!error && !message && !showThankYou) return undefined;
    const timeout = setTimeout(() => {
      setError('');
      setMessage('');
      setShowThankYou(false);
    }, showThankYou ? 7000 : 4500);
    return () => clearTimeout(timeout);
  }, [error, message, showThankYou]);

  const ratingSummary = useMemo(() => {
    if (!items.length) return 'No ratings yet';
    const total = items.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return `Average rating: ${(total / items.length).toFixed(1)} / 5`;
  }, [items]);

  const orderOptions = useMemo(
    () => customerOrders.filter((order) => order?.orderId),
    [customerOrders]
  );

  const productOptionsByOrder = useMemo(() => {
    const productMap = new Map();

    customerOrders.forEach((order) => {
      const uniqueProducts = new Map();
      (order.items || []).forEach((item) => {
        if (!item?.productId) return;
        if (!uniqueProducts.has(item.productId)) {
          uniqueProducts.set(item.productId, {
            productId: item.productId,
            productName: item.productName || item.productId
          });
        }
      });

      if (order?.orderId) {
        productMap.set(order.orderId, Array.from(uniqueProducts.values()));
      }
    });

    return productMap;
  }, [customerOrders]);

  const submitProductOptions = useMemo(() => {
    if (!formData.orderId) return [];
    return productOptionsByOrder.get(formData.orderId) || [];
  }, [formData.orderId, productOptionsByOrder]);

  const searchProductOptions = useMemo(() => {
    if (searchOrderId) {
      return productOptionsByOrder.get(searchOrderId) || [];
    }

    const uniqueProducts = new Map();
    productOptionsByOrder.forEach((products) => {
      products.forEach((product) => {
        if (!uniqueProducts.has(product.productId)) {
          uniqueProducts.set(product.productId, product);
        }
      });
    });

    return Array.from(uniqueProducts.values());
  }, [searchOrderId, productOptionsByOrder]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    clearAlerts();

    const trimmedComment = formData.comment.trim();
    if (!trimmedComment) {
      setError('Please enter your feedback (comment is required).');
      setSubmitting(false);
      return;
    }
    if (trimmedComment.length < MIN_FEEDBACK_COMMENT_LENGTH) {
      setError(`Your feedback must be at least ${MIN_FEEDBACK_COMMENT_LENGTH} characters.`);
      setSubmitting(false);
      return;
    }

    try {
      await feedbackAPI.create({
        orderId: formData.orderId.trim(),
        productId: formData.productId.trim(),
        rating: Number(formData.rating),
        comment: trimmedComment
      });

      setShowThankYou(true);
      setMessage('');
      setFormData(initialForm);
      await loadFeedback(searchOrderId.trim(), searchProductId.trim(), { preserveThankYouBanner: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditData({
      rating: String(item.rating || 5),
      comment: item.comment || ''
    });
    clearAlerts();
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditData({ rating: '5', comment: '' });
  };

  const submitEdit = async (feedbackId) => {
    clearAlerts();
    const trimmedComment = editData.comment.trim();
    if (!trimmedComment || trimmedComment.length < MIN_FEEDBACK_COMMENT_LENGTH) {
      setError(`Comment must be at least ${MIN_FEEDBACK_COMMENT_LENGTH} characters.`);
      return;
    }
    try {
      await feedbackAPI.update(feedbackId, {
        rating: Number(editData.rating),
        comment: trimmedComment
      });
      setMessage('Feedback updated successfully.');
      cancelEdit();
      await loadFeedback(searchOrderId.trim(), searchProductId.trim());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update feedback');
    }
  };

  const openDeleteModal = (item) => {
    setDeleteTarget({
      id: item._id,
      orderId: item.orderId,
      productLabel: item.productName || item.productId || null
    });
  };

  const closeDeleteModal = () => {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    clearAlerts();
    try {
      await feedbackAPI.remove(deleteTarget.id);
      setMessage('Feedback deleted successfully.');
      setDeleteTarget(null);
      await loadFeedback(searchOrderId.trim(), searchProductId.trim());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete feedback');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadFeedback(searchOrderId, searchProductId);
  };

  const handleResetSearch = async () => {
    setSearchOrderId('');
    setSearchProductId('');
    await loadFeedback('', '');
  };

  const handleOrderSelectChange = (orderId) => {
    setFormData((prev) => ({ ...prev, orderId, productId: '' }));
  };

  const handleSearchOrderChange = (orderId) => {
    setSearchOrderId(orderId);
    setSearchProductId('');
  };

  const handleLogout = async () => {
    await endSession();
    navigate('/');
  };

  const dismissPopup = () => {
    setError('');
    setMessage('');
    setShowThankYou(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(99,102,241,0.12),transparent)]">
      <nav className="bg-white/85 backdrop-blur border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-slate-800">
              Book<span className="text-cyan-700">Nest</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/customer-dashboard"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <span className="text-sm text-slate-600">{user.name}</span>
              <button
                onClick={handleLogout}
                className="bg-slate-800 hover:bg-black text-white text-sm px-4 py-2 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <section className="mb-8 bg-white overflow-hidden shadow-md shadow-gray-200/50 rounded-2xl border border-gray-100/80 ring-1 ring-gray-100">
          <div className="px-6 py-6 sm:px-8 sm:py-7 border-b border-gray-100/90 bg-gradient-to-br from-white via-indigo-50/30 to-gray-50/90">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-800 ring-1 ring-indigo-200/60">
                  Customer reviews
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">My Feedback</h1>
                <p className="text-gray-600 max-w-2xl text-base leading-relaxed">
                  Share thoughtful reviews for your orders—your input helps sellers and other readers on BookNest.
                </p>
              </div>
              <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white text-indigo-900 text-sm font-semibold shadow-sm border border-indigo-100/80 ring-1 ring-indigo-50">
                <span className="text-lg" aria-hidden>⭐</span>
                <span>{ratingSummary}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 lg:gap-8">
          <section className="xl:col-span-2 bg-white overflow-hidden shadow-md shadow-gray-200/40 rounded-2xl border border-gray-100 ring-1 ring-gray-100/80">
            <div className="px-5 py-4 sm:px-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/90 to-indigo-50/20">
              <h2 className="text-lg font-semibold text-gray-900">Submit feedback</h2>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                Choose your order, optionally pick a product, then rate and describe your experience.
              </p>
            </div>
            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-6">
              <div>
                <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-1">
                  Order ID
                </label>
                <select
                  id="orderId"
                  value={formData.orderId}
                  onChange={(e) => handleOrderSelectChange(e.target.value)}
                  required
                  disabled={loadingOrderOptions || orderOptions.length === 0}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">
                    {loadingOrderOptions
                      ? 'Loading your orders...'
                      : orderOptions.length
                        ? 'Select an order'
                        : 'No orders available'}
                  </option>
                  {orderOptions.map((order) => (
                    <option key={order._id || order.orderId} value={order.orderId}>
                      {order.orderId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-1">
                  Product ID (Optional)
                </label>
                <select
                  id="productId"
                  value={formData.productId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productId: e.target.value }))}
                  disabled={!formData.orderId || submitProductOptions.length === 0}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">Order-level feedback (no product selected)</option>
                  {submitProductOptions.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.productName} ({product.productId})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Add Product ID for product-level feedback. Leave empty to add feedback for the full order.
                </p>
              </div>

              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">
                  Rating
                </label>
                <select
                  id="rating"
                  value={formData.rating}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rating: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Very Poor</option>
                </select>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                  Your feedback <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="comment"
                  rows="4"
                  required
                  minLength={MIN_FEEDBACK_COMMENT_LENGTH}
                  maxLength={1000}
                  value={formData.comment}
                  onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-y min-h-[108px]"
                  placeholder="Share your order experience (required)"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  At least {MIN_FEEDBACK_COMMENT_LENGTH} characters required.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !formData.orderId ||
                  formData.comment.trim().length < MIN_FEEDBACK_COMMENT_LENGTH
                }
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition duration-300 shadow-md shadow-indigo-900/20 hover:shadow-lg hover:shadow-indigo-900/25"
              >
                {submitting ? 'Submitting…' : 'Submit feedback'}
              </button>
            </form>
          </section>

          <section className="xl:col-span-3 bg-white overflow-hidden shadow-md shadow-gray-200/40 rounded-2xl border border-gray-100 ring-1 ring-gray-100/80 flex flex-col min-h-[320px]">
            <div className="px-5 py-4 sm:px-6 border-b border-gray-100 bg-gradient-to-r from-gray-50/90 to-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Feedback history</h2>
                <p className="text-sm text-gray-600 mt-1">Filter by order or product, then search.</p>
              </div>
              <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
                <select
                  value={searchOrderId}
                  onChange={(e) => handleSearchOrderChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[140px]"
                >
                  <option value="">All orders</option>
                  {orderOptions.map((order) => (
                    <option key={`search-${order._id || order.orderId}`} value={order.orderId}>
                      {order.orderId}
                    </option>
                  ))}
                </select>
                <select
                  value={searchProductId}
                  onChange={(e) => setSearchProductId(e.target.value)}
                  disabled={searchProductOptions.length === 0}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[160px] disabled:bg-gray-100"
                >
                  <option value="">All products</option>
                  {searchProductOptions.map((product) => (
                    <option key={`search-${product.productId}`} value={product.productId}>
                      {product.productName} ({product.productId})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition duration-300 shadow-sm"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 transition duration-300 shadow-sm"
                >
                  Reset
                </button>
              </form>
            </div>

            <div className="p-5 sm:p-6 flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                <div className="animate-spin rounded-full h-11 w-11 border-2 border-indigo-100 border-t-indigo-600 mb-4" />
                <p className="text-sm font-medium text-gray-700">Loading your feedback…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 px-4 border-2 border-dashed border-gray-200/90 rounded-2xl bg-gradient-to-b from-gray-50/80 to-white">
                <p className="text-4xl mb-4 opacity-90" aria-hidden>💬</p>
                <p className="text-gray-800 font-semibold text-lg">No feedback yet</p>
                <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
                  When you submit a review, it will appear here. Use the form on the left to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {items.map((item) => (
                  <article
                    key={item._id}
                    className="group border border-gray-200/90 rounded-xl p-5 sm:p-6 bg-white shadow-sm hover:shadow-md hover:border-indigo-200/60 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order</p>
                          <p className="font-semibold text-gray-900 truncate">{item.orderId}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Product</p>
                          <p className="font-semibold text-gray-900">{item.productName || item.productId || '—'}</p>
                          {item.productId && (
                            <p className="text-xs text-gray-500 font-mono mt-0.5 break-all">{item.productId}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                          {item.rating}/5
                        </span>
                        <time className="text-xs text-gray-500">
                          {new Date(item.updatedAt || item.createdAt).toLocaleString()}
                        </time>
                      </div>
                    </div>

                    {editingId === item._id ? (
                      <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <select
                            value={editData.rating}
                            onChange={(e) => setEditData((prev) => ({ ...prev, rating: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="5">5 - Excellent</option>
                            <option value="4">4 - Good</option>
                            <option value="3">3 - Average</option>
                            <option value="2">2 - Poor</option>
                            <option value="1">1 - Very Poor</option>
                          </select>
                          <div className="text-sm text-gray-600 self-center">Update your rating and comment</div>
                        </div>
                        <textarea
                          rows="3"
                          required
                          minLength={MIN_FEEDBACK_COMMENT_LENGTH}
                          maxLength={1000}
                          value={editData.comment}
                          onChange={(e) => setEditData((prev) => ({ ...prev, comment: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={`At least ${MIN_FEEDBACK_COMMENT_LENGTH} characters`}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => submitEdit(item._id)}
                            disabled={editData.comment.trim().length < MIN_FEEDBACK_COMMENT_LENGTH}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-md text-sm font-semibold transition duration-300"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-semibold border border-gray-200 transition duration-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-4 text-gray-800 text-sm leading-relaxed border-l-4 border-indigo-200 pl-4 py-1 bg-gray-50/80 rounded-r">
                          {item.comment || 'No comment provided.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-semibold transition duration-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(item)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition duration-300"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
            </div>
          </section>
        </div>
      </main>

      {(showThankYou || error || message) && (
        <div className="fixed top-20 right-4 z-[110] w-[min(92vw,420px)]">
          <div
            role={error ? 'alert' : 'status'}
            className={`rounded-2xl border shadow-2xl backdrop-blur-sm overflow-hidden ${
              error
                ? 'border-red-200 bg-red-50/95 text-red-900'
                : 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
            }`}
          >
            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  error ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}
                aria-hidden
              >
                {error ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-sm font-semibold tracking-wide">
                  {error ? 'Submission Error' : showThankYou ? `Thank you${user?.name ? `, ${user.name}` : ''}!` : 'Success'}
                </h3>
                <p className="mt-1 text-sm leading-relaxed">
                  {error
                    ? error
                    : showThankYou
                      ? 'Your feedback has been submitted successfully. We appreciate your time and input.'
                      : message}
                </p>
              </div>

              <button
                type="button"
                onClick={dismissPopup}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white/70 hover:text-gray-800 transition-colors"
                aria-label="Dismiss notification"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] transition-opacity"
            onClick={closeDeleteModal}
            aria-label="Close dialog"
          />
          <div
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/80 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-feedback-title"
            aria-describedby="delete-feedback-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 bg-gradient-to-r from-red-50/80 to-white px-6 py-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"
                  aria-hidden
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 id="delete-feedback-title" className="text-lg font-semibold text-gray-900">
                    Delete this feedback?
                  </h3>
                  <p id="delete-feedback-desc" className="mt-1 text-sm text-gray-600 leading-relaxed">
                    This cannot be undone.{' '}
                    {deleteTarget.orderId && (
                      <span className="block mt-1 text-gray-700">
                        Order: <span className="font-mono text-xs sm:text-sm">{deleteTarget.orderId}</span>
                        {deleteTarget.productLabel && (
                          <>
                            <span className="mx-1">·</span>
                            <span>{deleteTarget.productLabel}</span>
                          </>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 bg-gray-50/50">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 transition-colors shadow-sm"
              >
                {deleteSubmitting ? 'Deleting…' : 'Delete feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}