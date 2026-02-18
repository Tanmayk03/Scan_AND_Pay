/**
 * API client - base URL from env, helpers for auth and requests.
 */
const API_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeader() {
  const token = localStorage.getItem('scanpay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || res.statusText), { status: res.status, data });
  return data;
}

export const productApi = {
  getByBarcode: (barcode) => api(`/api/product/${encodeURIComponent(barcode)}`),
};

export const networkApi = {
  getUrl: () => api('/api/network-url'),
};

export const basketApi = {
  log: (event, sessionId, payload) => api('/api/basket/log', { method: 'POST', body: JSON.stringify({ event, sessionId, payload }) }),
};

export const sessionApi = {
  start: () => api('/api/session/start', { method: 'POST' }),
};

export const orderApi = {
  create: (sessionId, items) => api('/api/orders', { method: 'POST', body: JSON.stringify({ sessionId, items }) }),
};

export const verifyApi = {
  weight: (token, actualWeight) => api('/api/verify-weight', { method: 'POST', body: JSON.stringify({ token, actualWeight }) }),
  qr: (token) => api(`/verify/${encodeURIComponent(token)}`),
};

export const authApi = {
  login: (email, password) => api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => api('/api/auth/me'),
};

export const adminApi = {
  products: (params) => api('/api/products' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  product: (id) => api(`/api/products/${id}`),
  createProduct: (body) => api('/api/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id) => api(`/api/products/${id}`, { method: 'DELETE' }),
  orders: (params) => api('/api/admin/orders' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  order: (id) => api(`/api/admin/orders/${id}`),
  mismatches: () => api('/api/admin/mismatches'),
  flagged: () => api('/api/admin/flagged'),
  randomCheck: (params) => api('/api/admin/random-check' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  markManualCheck: (id) => api(`/api/admin/orders/${id}/manual-check`, { method: 'POST' }),
  getConfig: () => api('/api/admin/config'),
  setConfig: (body) => api('/api/admin/config', { method: 'PUT', body: JSON.stringify(body) }),
  auditLogs: (params) => api('/api/admin/audit' + (params ? '?' + new URLSearchParams(params).toString() : '')),
};
