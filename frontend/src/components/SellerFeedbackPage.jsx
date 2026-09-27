import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { endSession, feedbackAPI } from '../utils/api';

export default function SellerFeedbackPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [feedbackMaster, setFeedbackMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchProductId, setSearchProductId] = useState('');
  const [error, setError] = useState('');

  const loadFeedback = useCallback(async (orderId = '', productId = '') => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (orderId) params.orderId = orderId;
      if (productId) params.productId = productId;
      const response = await feedbackAPI.listForSeller(params);
      const list = response.data?.data?.feedback || [];
      setItems(list);
      if (!orderId && !productId) {
        setFeedbackMaster(list);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch seller feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');

    if (!rawUser) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(rawUser);
    if (parsedUser.role !== 'seller') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    loadFeedback();
  }, [navigate, loadFeedback]);

  const ratingSummary = useMemo(() => {
    if (!items.length) return 'No customer ratings yet';
    const total = items.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return `Average customer rating: ${(total / items.length).toFixed(1)} / 5`;
  }, [items]);

  const orderOptions = useMemo(() => {
    const ids = new Set();
    feedbackMaster.forEach((f) => {
      if (f.orderId) ids.add(f.orderId);
    });
    return Array.from(ids).sort();
  }, [feedbackMaster]);

  const productOptions = useMemo(() => {
    const map = new Map();
    feedbackMaster.forEach((f) => {
      if (f.productId && !map.has(f.productId)) {
        map.set(f.productId, {
          productId: f.productId,
          productName: f.productName || f.productId
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      String(a.productName).localeCompare(String(b.productName))
    );
  }, [feedbackMaster]);

  const productOptionsForFilter = useMemo(() => {
    if (!searchOrderId) return productOptions;
    const allowed = new Set();
    feedbackMaster.forEach((f) => {
      if (f.orderId === searchOrderId && f.productId) allowed.add(f.productId);
    });
    return productOptions.filter((p) => allowed.has(p.productId));
  }, [searchOrderId, productOptions, feedbackMaster]);

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadFeedback(searchOrderId.trim(), searchProductId.trim());
  };

  const handleReset = async () => {
    setSearchOrderId('');
    setSearchProductId('');
    await loadFeedback('', '');
  };

  const handleLogout = async () => {
    await endSession();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-indigo-50/40 bg-[radial-gradient(ellipse_100%_60%_at_100%_0%,rgba(251,191,36,0.14),transparent)]">
      <nav className="bg-white/85 backdrop-blur border-b border-amber-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-slate-800">
              Book<span className="text-orange-700">Nest</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/seller-dashboard"
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <section className="mb-8 bg-white overflow-hidden shadow-md shadow-amber-900/5 rounded-2xl border border-amber-100/90 ring-1 ring-amber-50">
          <div className="px-6 py-6 sm:px-8 sm:py-7 border-b border-amber-100/80 bg-gradient-to-br from-white via-amber-50/35 to-indigo-50/25">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/70">
                  Seller insights
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Customer Feedback</h1>
                <p className="text-slate-600 max-w-2xl text-base leading-relaxed">
                  Review what customers said about each of your sold products—spot trends and celebrate great reviews.
                </p>
              </div>
              <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white text-amber-900 text-sm font-semibold shadow-sm border border-amber-200/80 ring-1 ring-orange-50">
                <span className="text-lg" aria-hidden>⭐</span>
                <span>{ratingSummary}</span>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm"
            role="alert"
          >
            <span className="text-red-600 text-lg leading-none mt-0.5" aria-hidden>
              !
            </span>
            <p className="text-sm font-medium leading-relaxed flex-1">{error}</p>
          </div>
        )}

        <section className="bg-white overflow-hidden shadow-md shadow-slate-200/50 rounded-2xl border border-slate-100 ring-1 ring-slate-100/80">
          <div className="px-5 py-4 sm:px-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-indigo-50/15 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Feedback feed</h2>
              <p className="text-sm text-slate-600 mt-1">
                Filter by order or product using the lists below (built from your feedback).
              </p>
            </div>
            <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
              <select
                value={searchOrderId}
                onChange={(e) => {
                  setSearchOrderId(e.target.value);
                  setSearchProductId('');
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[180px] bg-white"
              >
                <option value="">All orders</option>
                {orderOptions.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <select
                value={searchProductId}
                onChange={(e) => setSearchProductId(e.target.value)}
                disabled={productOptionsForFilter.length === 0}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px] bg-white disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">All products</option>
                {productOptionsForFilter.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} ({p.productId})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 shadow-sm transition-colors"
              >
                Reset
              </button>
            </form>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                <div className="animate-spin rounded-full h-11 w-11 border-2 border-amber-100 border-t-orange-600 mb-4" />
                <p className="text-sm font-medium text-slate-700">Loading feedback…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-gradient-to-b from-slate-50/80 to-white">
                <p className="text-4xl mb-4 opacity-90" aria-hidden>
                  💬
                </p>
                <p className="text-slate-800 font-semibold text-lg">No feedback matches</p>
                <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                  {feedbackMaster.length === 0
                    ? 'No feedback for your seller account yet. When customers leave reviews, they will show here.'
                    : 'Try changing the filters or click Reset to see all feedback.'}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {items.map((item) => (
                  <article
                    key={item._id}
                    className="group border border-slate-200/90 rounded-xl p-5 sm:p-6 bg-white shadow-sm hover:shadow-md hover:border-amber-200/70 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Order</p>
                          <p className="font-semibold text-slate-900 truncate">{item.orderId}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Product</p>
                          <p className="font-semibold text-slate-900">{item.productName || item.productId || '—'}</p>
                          {item.productId && (
                            <p className="text-xs text-slate-500 font-mono mt-0.5 break-all">{item.productId}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 ring-1 ring-amber-200/60">
                          {item.rating}/5
                        </span>
                        <time className="text-xs text-slate-500">
                          {new Date(item.updatedAt || item.createdAt).toLocaleString()}
                        </time>
                      </div>
                    </div>

                    <p className="mt-4 text-slate-800 text-sm leading-relaxed border-l-4 border-amber-200 pl-4 py-2 bg-amber-50/40 rounded-r">
                      {item.comment || 'No comment provided.'}
                    </p>

                    <div className="mt-4 text-xs text-slate-500 font-medium">
                      Customer ID: <span className="font-mono text-slate-600">{item.customerId}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
