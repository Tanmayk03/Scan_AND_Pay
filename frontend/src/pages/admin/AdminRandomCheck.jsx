import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api';

export default function AdminRandomCheck() {
  const [randomCheckOrders, setRandomCheckOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    loadRandomCheck();
  }, [loadRandomCheck]);

  const handleMarkManualCheck = async (orderId) => {
    try {
      await adminApi.markManualCheck(orderId);
      loadRandomCheck();
    } catch (err) {
      setError(err.message);
    }
  };

  const tableClass = 'w-full border-collapse text-sm';
  const thTdClass = 'py-2 px-3 text-left border-b border-border';
  const thClass = thTdClass + ' text-muted font-semibold';
  const btnSmallClass = 'py-1 px-2 mr-1 text-xs bg-border text-[#e6edf3] border-0 rounded hover:bg-accent hover:text-white transition-colors';

  return (
    <section className="animate-fade-in">
      <h2 className="m-0 mb-4 text-lg font-semibold">Random Manual Check Candidates</h2>
      
      {error && (
        <div className="flex justify-between items-center bg-error/15 border border-error text-error py-3 px-4 rounded-lg mb-4" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} className="bg-transparent border-0 text-inherit text-xl py-0 px-1">×</button>
        </div>
      )}

      <button type="button" onClick={loadRandomCheck} disabled={loading} className="py-2 px-4 bg-accent text-white border-0 rounded-md font-semibold mb-4 disabled:opacity-70 transition-transform active:scale-95">
        Refresh Candidates
      </button>

      {loading && !randomCheckOrders.length ? <p className="text-muted">Loading...</p> : (
        <div className="overflow-x-auto bg-surface rounded-lg border border-border">
          <table className={tableClass}>
            <thead>
              <tr className="bg-bg-dark">
                <th className={thClass}>Order</th>
                <th className={thClass}>Total</th>
                <th className={thClass}>Risk</th>
                <th className={thClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {randomCheckOrders.map((o) => (
                <tr key={o._id} className="hover:bg-bg-dark/50 transition-colors">
                  <td className={thTdClass}><code className="text-[0.85em]">{o._id?.slice(-8)}</code></td>
                  <td className={thTdClass}>₹{o.totalPrice?.toFixed(2)}</td>
                  <td className={thTdClass}>{o.riskScore ?? 0}</td>
                  <td className={thTdClass}>
                    {!o.manualCheck ? (
                      <button type="button" className={btnSmallClass} onClick={() => handleMarkManualCheck(o._id)}>Mark Checked</button>
                    ) : (
                      <span className="text-success text-xs font-semibold px-2 py-1 bg-success/20 rounded">Checked</span>
                    )}
                  </td>
                </tr>
              ))}
              {randomCheckOrders.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-4 text-center text-muted">No orders pending manual check.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
