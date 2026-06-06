import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';

import AdminProducts from './admin/AdminProducts';
import AdminOrders from './admin/AdminOrders';
import AdminMismatches from './admin/AdminMismatches';
import AdminFlagged from './admin/AdminFlagged';
import AdminRandomCheck from './admin/AdminRandomCheck';
import AdminConfig from './admin/AdminConfig';
import AdminAudit from './admin/AdminAudit';
import AdminMlGuard from './admin/AdminMlGuard';


export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
  const [user, setUser] = useState(null);

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

  const handleLogout = () => {
    localStorage.removeItem('scanpay_token');
    navigate('/admin/login', { replace: true });
  };

  if (!user) return <div className="min-h-screen p-4 max-w-[1200px] mx-auto flex items-center justify-center"><div className="py-8 text-center text-muted animate-pulse">Loading Admin Dashboard…</div></div>;

  const tabs = [
    { id: 'orders', label: 'Orders' },
    { id: 'products', label: 'Products' },
    { id: 'mismatches', label: 'Weight Mismatches' },
    { id: 'flagged', label: 'Flagged' },
    { id: 'ml-guard', label: 'ML Fraud Guard' },
    { id: 'random-check', label: 'Random Check' },
    { id: 'config', label: 'Config' },
    { id: 'audit', label: 'Audit' },
  ];

  return (
    <div className="min-h-screen p-4 max-w-[1200px] mx-auto animate-fade-in">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm">
        <h1 className="m-0 text-xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-muted text-sm font-medium">{user.email} <span className="bg-bg-dark px-2 py-0.5 rounded ml-1 uppercase text-[0.7rem]">{user.role}</span></span>
          <a href="/" className="text-sm font-semibold text-accent hover:underline">Checkout Terminal</a>
          <button type="button" onClick={handleLogout} className="py-1.5 px-3 bg-transparent border border-border text-[#e6edf3] rounded-md text-sm hover:bg-error hover:text-white hover:border-error transition-colors">
            Logout
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6 border-b border-border pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-accent text-white shadow-sm' : 'bg-surface border border-border text-muted hover:bg-bg-dark hover:text-[#e6edf3]'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        {tab === 'products' && <AdminProducts />}
        {tab === 'orders' && <AdminOrders />}
        {tab === 'mismatches' && <AdminMismatches />}
        {tab === 'flagged' && <AdminFlagged />}
        {tab === 'ml-guard' && <AdminMlGuard />}
        {tab === 'random-check' && <AdminRandomCheck />}
        {tab === 'config' && <AdminConfig />}
        {tab === 'audit' && <AdminAudit />}
      </main>
    </div>
  );
}
