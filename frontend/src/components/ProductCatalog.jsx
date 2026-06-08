import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { productApi } from '../api';

export default function ProductCatalog({ onClose, onSelect }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await productApi.getCatalog({ search: q });
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(search);
  }, [search, fetchProducts]);

  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl p-6 max-w-[500px] w-full flex flex-col max-h-[80vh] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="m-0 text-xl font-bold">Browse Catalog</h2>
          <button type="button" onClick={onClose} className="bg-transparent border-0 text-muted hover:text-white text-2xl leading-none p-1">
            &times;
          </button>
        </div>

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full py-2.5 px-4 mb-4 border border-border rounded-lg bg-bg-dark text-[#e6edf3] focus:border-accent outline-none transition-colors"
        />

        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {loading && products.length === 0 ? (
            <p className="text-center text-muted mt-8">Loading...</p>
          ) : products.length === 0 ? (
            <p className="text-center text-muted mt-8">No products found.</p>
          ) : (
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              {products.map((p) => (
                <li key={p._id} className="flex justify-between items-center bg-bg-dark border border-border rounded-lg p-3 hover:border-accent/50 transition-colors">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-muted">₹{p.price.toFixed(2)} &middot; {p.weight}g &middot; {p.category || 'General'}</div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => onSelect(p)}
                    className="py-1.5 px-4 bg-accent/20 text-accent hover:bg-accent hover:text-white border border-accent/30 rounded font-semibold transition-colors"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
