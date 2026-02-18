/**
 * Admin dashboard: products CRUD, orders, mismatches, flagged, config, manual check, audit.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, authApi } from '../api';

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [mismatches, setMismatches] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [randomCheckOrders, setRandomCheckOrders] = useState([]);
  const [config, setConfig] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [productForm, setProductForm] = useState(null);
  const [productEdit, setProductEdit] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.user);
    } catch {
      localStorage.removeItem('scanpay_token');
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.products();
      setProducts(res.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.orders();
      setOrders(res.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMismatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.mismatches();
      setMismatches(res.mismatches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFlagged = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.flagged();
      setFlagged(res.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRandomCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.randomCheck();
      setRandomCheckOrders(res.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const res = await adminApi.getConfig();
      setConfig(res.config || {});
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.auditLogs({ limit: 100 });
      setAuditLogs(res.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'products') loadProducts();
    else if (tab === 'orders') loadOrders();
    else if (tab === 'mismatches') loadMismatches();
    else if (tab === 'flagged') loadFlagged();
    else if (tab === 'random-check') loadRandomCheck();
    else if (tab === 'config') loadConfig();
    else if (tab === 'audit') loadAudit();
  }, [tab, loadProducts, loadOrders, loadMismatches, loadFlagged, loadRandomCheck, loadConfig, loadAudit]);

  const handleLogout = () => {
    localStorage.removeItem('scanpay_token');
    navigate('/admin/login', { replace: true });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productForm) return;
    setError('');
    try {
      await adminApi.createProduct(productForm);
      setProductForm(null);
      loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!productEdit) return;
    setError('');
    try {
      await adminApi.updateProduct(productEdit._id, {
        name: productEdit.name,
        price: productEdit.price,
        weight: productEdit.weight,
        category: productEdit.category,
        barcode: productEdit.barcode,
      });
      setProductEdit(null);
      loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Deactivate this product?')) return;
    try {
      await adminApi.deleteProduct(id);
      loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkManualCheck = async (orderId) => {
    try {
      await adminApi.markManualCheck(orderId);
      loadRandomCheck();
      loadOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!config) return;
    try {
      const res = await adminApi.setConfig(config);
      setConfig(res.config);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!user) return <div className="min-h-screen p-4 max-w-[1200px] mx-auto"><div className="py-8 text-center text-muted">Loading…</div></div>;

  const tabs = [
    { id: 'orders', label: 'Orders' },
    { id: 'products', label: 'Products' },
    { id: 'mismatches', label: 'Weight Mismatches' },
    { id: 'flagged', label: 'Flagged' },
    { id: 'random-check', label: 'Random Check' },
    { id: 'config', label: 'Config' },
    { id: 'audit', label: 'Audit' },
  ];

  const tableClass = 'w-full border-collapse text-sm';
  const thTdClass = 'py-2 px-3 text-left border-b border-border';
  const thClass = thTdClass + ' text-muted font-semibold';
  const btnSmallClass = 'py-1 px-2 mr-1 text-xs bg-border text-[#e6edf3] border-0 rounded hover:bg-accent hover:text-white';

  return (
    <div className="min-h-screen p-4 max-w-[1200px] mx-auto">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="m-0 text-xl font-bold">Admin – Scan & Pay</h1>
        <div className="flex items-center gap-4">
          <span className="text-muted text-sm">{user.email} ({user.role})</span>
          <a href="/" className="text-sm text-accent">Checkout</a>
          <button type="button" onClick={handleLogout} className="py-1.5 px-3 bg-transparent border border-border text-[#e6edf3] rounded-md text-sm">
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="flex justify-between items-center bg-error/15 border border-error text-error py-3 px-4 rounded-lg mb-4" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} className="bg-transparent border-0 text-inherit text-xl py-0 px-1">
            ×
          </button>
        </div>
      )}

      <nav className="flex flex-wrap gap-2 mb-6 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`py-2 px-4 rounded-md text-sm ${tab === t.id ? 'bg-surface text-accent border border-border' : 'bg-transparent border border-transparent text-muted'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'products' && (
          <section>
            <h2 className="m-0 mb-4 text-lg font-semibold">Products</h2>
            {productForm ? (
              <form onSubmit={handleCreateProduct} className="flex flex-wrap gap-3 items-end mb-4">
                <input
                  placeholder="Barcode"
                  value={productForm.barcode || ''}
                  onChange={(e) => setProductForm((p) => ({ ...p, barcode: e.target.value }))}
                  required
                  className="min-w-[120px] py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
                <input
                  placeholder="Name"
                  value={productForm.name || ''}
                  onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="min-w-[120px] py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={productForm.price ?? ''}
                  onChange={(e) => setProductForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                  required
                  className="min-w-[120px] py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
                <input
                  type="number"
                  placeholder="Weight (g)"
                  value={productForm.weight ?? ''}
                  onChange={(e) => setProductForm((p) => ({ ...p, weight: parseInt(e.target.value, 10) || 0 }))}
                  required
                  className="min-w-[120px] py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
                <input
                  placeholder="Category"
                  value={productForm.category || ''}
                  onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                  className="min-w-[120px] py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
                <div className="flex gap-2">
                  <button type="submit" className="py-2 px-4 bg-accent text-white border-0 rounded-md font-semibold">Create</button>
                  <button type="button" onClick={() => setProductForm(null)} className="py-2 px-4 bg-border text-[#e6edf3] border-0 rounded-md font-semibold">Cancel</button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setProductForm({})} className="py-2 px-4 bg-accent text-white border-0 rounded-md font-semibold mb-4">+ Add product</button>
            )}
            {productEdit && (
              <form onSubmit={handleUpdateProduct} className="flex flex-wrap gap-3 items-end mb-4">
                <input
                  placeholder="Barcode"
                  value={productEdit.barcode || ''}
                  onChange={(e) => setProductEdit((p) => ({ ...p, barcode: e.target.value }))}
                  className="min-w-[120px] py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
                <input
                  placeholder="Name"
                  value={productEdit.name || ''}
                  onChange={(e) => setProductEdit((p) => ({ ...p, name: e.target.value }))}
                  className="min-w-[120px] py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={productEdit.price ?? ''}
                  onChange={(e) => setProductEdit((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                  className="min-w-[120px] py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
                <input
                  type="number"
                  placeholder="Weight (g)"
                  value={productEdit.weight ?? ''}
                  onChange={(e) => setProductEdit((p) => ({ ...p, weight: parseInt(e.target.value, 10) || 0 }))}
                  className="min-w-[120px] py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
                <div className="flex gap-2">
                  <button type="submit" className="py-2 px-4 bg-accent text-white border-0 rounded-md font-semibold">Save</button>
                  <button type="button" onClick={() => setProductEdit(null)} className="py-2 px-4 bg-border text-[#e6edf3] border-0 rounded-md font-semibold">Cancel</button>
                </div>
              </form>
            )}
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Barcode</th>
                    <th className={thClass}>Name</th>
                    <th className={thClass}>Price</th>
                    <th className={thClass}>Weight</th>
                    <th className={thClass}>Category</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id}>
                      <td className={thTdClass}>{p.barcode}</td>
                      <td className={thTdClass}>{p.name}</td>
                      <td className={thTdClass}>₹{p.price?.toFixed(2)}</td>
                      <td className={thTdClass}>{p.weight}g</td>
                      <td className={thTdClass}>{p.category || '–'}</td>
                      <td className={thTdClass}>
                        <button type="button" className={btnSmallClass} onClick={() => setProductEdit({ ...p })}>Edit</button>
                        <button type="button" className={btnSmallClass} onClick={() => handleDeleteProduct(p._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'orders' && (
          <section>
            <h2 className="m-0 mb-4 text-lg font-semibold">Recent orders</h2>
            {loading ? <p>Loading…</p> : (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>ID</th>
                      <th className={thClass}>Total</th>
                      <th className={thClass}>Weight</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Verified</th>
                      <th className={thClass}>Risk</th>
                      <th className={thClass}>Flagged</th>
                      <th className={thClass}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o._id}>
                        <td className={thTdClass}><code className="text-[0.85em]">{o._id?.slice(-8)}</code></td>
                        <td className={thTdClass}>₹{o.totalPrice?.toFixed(2)}</td>
                        <td className={thTdClass}>{o.expectedWeightSum}g</td>
                        <td className={thTdClass}>{o.status}</td>
                        <td className={thTdClass}>{o.verified ? 'Yes' : 'No'}</td>
                        <td className={thTdClass}>{o.riskScore ?? 0}</td>
                        <td className={thTdClass}>{o.flagged ? 'Yes' : '–'}</td>
                        <td className={thTdClass}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'mismatches' && (
          <section>
            <h2 className="m-0 mb-4 text-lg font-semibold">Weight mismatches</h2>
            {loading ? <p>Loading…</p> : (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Order</th>
                      <th className={thClass}>Expected</th>
                      <th className={thClass}>Actual</th>
                      <th className={thClass}>Tolerance</th>
                      <th className={thClass}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mismatches.map((m, i) => (
                      <tr key={m.log?._id || i}>
                        <td className={thTdClass}><code className="text-[0.85em]">{m.order?._id?.slice(-8)}</code></td>
                        <td className={thTdClass}>{m.log?.expectedWeight}g</td>
                        <td className={thTdClass}>{m.log?.actualWeight}g</td>
                        <td className={thTdClass}>±{m.log?.tolerance}g</td>
                        <td className={thTdClass}>{m.log?.createdAt ? new Date(m.log.createdAt).toLocaleString() : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'flagged' && (
          <section>
            <h2 className="m-0 mb-4 text-lg font-semibold">Flagged orders</h2>
            {loading ? <p>Loading…</p> : (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>ID</th>
                      <th className={thClass}>Total</th>
                      <th className={thClass}>Risk</th>
                      <th className={thClass}>Manual check</th>
                      <th className={thClass}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flagged.map((o) => (
                      <tr key={o._id}>
                        <td className={thTdClass}><code className="text-[0.85em]">{o._id?.slice(-8)}</code></td>
                        <td className={thTdClass}>₹{o.totalPrice?.toFixed(2)}</td>
                        <td className={thTdClass}>{o.riskScore ?? 0}</td>
                        <td className={thTdClass}>{o.manualCheck ? 'Yes' : 'No'}</td>
                        <td className={thTdClass}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'random-check' && (
          <section>
            <h2 className="m-0 mb-4 text-lg font-semibold">Random manual check</h2>
            <button type="button" onClick={loadRandomCheck} disabled={loading} className="py-2 px-4 bg-accent text-white border-0 rounded-md font-semibold mb-4 disabled:opacity-70">Load candidates</button>
            {loading ? <p>Loading…</p> : (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Order</th>
                      <th className={thClass}>Total</th>
                      <th className={thClass}>Risk</th>
                      <th className={thClass}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {randomCheckOrders.map((o) => (
                      <tr key={o._id}>
                        <td className={thTdClass}><code className="text-[0.85em]">{o._id?.slice(-8)}</code></td>
                        <td className={thTdClass}>₹{o.totalPrice?.toFixed(2)}</td>
                        <td className={thTdClass}>{o.riskScore ?? 0}</td>
                        <td className={thTdClass}>
                          {!o.manualCheck && (
                            <button type="button" className={btnSmallClass} onClick={() => handleMarkManualCheck(o._id)}>Mark checked</button>
                          )}
                          {o.manualCheck && <span>Checked</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'config' && config && (
          <section>
            <h2 className="m-0 mb-4 text-lg font-semibold">System config</h2>
            <form onSubmit={handleSaveConfig} className="flex flex-wrap gap-3 items-end mb-4">
              <label className="flex flex-col gap-1 min-w-[120px] text-sm">
                Weight tolerance (g)
                <input
                  type="number"
                  min="0"
                  value={config.weightToleranceGrams ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, weightToleranceGrams: parseInt(e.target.value, 10) || 0 }))}
                  className="py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
              </label>
              <label className="flex flex-col gap-1 min-w-[120px] text-sm">
                Weight tolerance (%)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={config.weightTolerancePercent ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, weightTolerancePercent: parseFloat(e.target.value) || 0 }))}
                  className="py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
              </label>
              <label className="flex flex-col gap-1 min-w-[120px] text-sm">
                Risk threshold (0–100)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.riskThreshold ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, riskThreshold: parseInt(e.target.value, 10) || 0 }))}
                  className="py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
              </label>
              <label className="flex flex-col gap-1 min-w-[120px] text-sm">
                Random check %
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.randomCheckPercent ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, randomCheckPercent: parseInt(e.target.value, 10) || 0 }))}
                  className="py-2 px-2.5 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
                />
              </label>
              <button type="submit" className="py-2 px-4 bg-accent text-white border-0 rounded-md font-semibold">Save config</button>
            </form>
          </section>
        )}

        {tab === 'audit' && (
          <section>
            <h2 className="m-0 mb-4 text-lg font-semibold">Audit logs</h2>
            {loading ? <p>Loading…</p> : (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Event</th>
                      <th className={thClass}>Session</th>
                      <th className={thClass}>Order</th>
                      <th className={thClass}>Payload</th>
                      <th className={thClass}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td className={thTdClass}><code className="text-[0.85em]">{log.event}</code></td>
                        <td className={thTdClass}><code className="text-[0.85em]">{log.sessionId?.slice(0, 8)}…</code></td>
                        <td className={thTdClass}><code className="text-[0.85em]">{log.orderId?.slice(-8)}</code></td>
                        <td className={`${thTdClass} max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap`}>{JSON.stringify(log.payload || {})}</td>
                        <td className={thTdClass}>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
