import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productForm, setProductForm] = useState(null);
  const [productEdit, setProductEdit] = useState(null);

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

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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

  const tableClass = 'w-full border-collapse text-sm';
  const thTdClass = 'py-2 px-3 text-left border-b border-border';
  const thClass = thTdClass + ' text-muted font-semibold';
  const btnSmallClass = 'py-1 px-2 mr-1 text-xs bg-border text-[#e6edf3] border-0 rounded hover:bg-accent hover:text-white transition-colors';

  return (
    <section className="animate-fade-in">
      <h2 className="m-0 mb-4 text-lg font-semibold">Products</h2>
      
      {error && (
        <div className="flex justify-between items-center bg-error/15 border border-error text-error py-3 px-4 rounded-lg mb-4" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} className="bg-transparent border-0 text-inherit text-xl py-0 px-1">×</button>
        </div>
      )}

      {productForm ? (
        <form onSubmit={handleCreateProduct} className="flex flex-wrap gap-3 items-end mb-4 bg-surface p-4 rounded-lg border border-border">
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
            <button type="submit" className="py-2 px-4 bg-accent text-white border-0 rounded-md font-semibold transition-transform active:scale-95">Create</button>
            <button type="button" onClick={() => setProductForm(null)} className="py-2 px-4 bg-border text-[#e6edf3] border-0 rounded-md font-semibold transition-colors hover:bg-muted">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setProductForm({})} className="py-2 px-4 bg-accent text-white border-0 rounded-md font-semibold mb-4 transition-transform active:scale-95">+ Add product</button>
      )}

      {productEdit && (
        <form onSubmit={handleUpdateProduct} className="flex flex-wrap gap-3 items-end mb-4 bg-surface p-4 rounded-lg border border-border">
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
            <button type="submit" className="py-2 px-4 bg-accent text-white border-0 rounded-md font-semibold transition-transform active:scale-95">Save</button>
            <button type="button" onClick={() => setProductEdit(null)} className="py-2 px-4 bg-border text-[#e6edf3] border-0 rounded-md font-semibold transition-colors hover:bg-muted">Cancel</button>
          </div>
        </form>
      )}

      {loading && !products.length ? <p className="text-muted">Loading...</p> : (
        <div className="overflow-x-auto bg-surface rounded-lg border border-border">
          <table className={tableClass}>
            <thead>
              <tr className="bg-bg-dark">
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
                <tr key={p._id} className="hover:bg-bg-dark/50 transition-colors">
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
              {products.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-4 text-center text-muted">No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
