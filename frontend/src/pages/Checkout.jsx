import { useCallback, useEffect, useRef, useState } from 'react';
import BarcodeScanner from '../components/BarcodeScanner';
import Basket from '../components/Basket';
import CheckoutQR from '../components/CheckoutQR';
import ProductCatalog from '../components/ProductCatalog';
import PaymentModal from '../components/PaymentModal';
import { productApi, basketApi, sessionApi, orderApi, networkApi } from '../api';

function buildBasketItem(product, quantity = 1, scanKey = '') {
  return {
    productId: product._id,
    barcode: product.barcode,
    name: product.name,
    price: product.price,
    weight: product.weight,
    quantity,
    scanKey: scanKey || product._id,
  };
}

export default function Checkout() {
  const [sessionId, setSessionId] = useState(null);
  const [basket, setBasket] = useState([]);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [mobileUrl, setMobileUrl] = useState(null);
  const [scanStartTime, setScanStartTime] = useState(null);
  
  const [showCatalog, setShowCatalog] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  
  const sessionStarted = useRef(false);

  useEffect(() => {
    networkApi.getUrl().then((r) => r.url && setMobileUrl(r.url)).catch(() => {});
  }, []);

  useEffect(() => {
    if (sessionStarted.current) return;
    sessionStarted.current = true;
    sessionApi
      .start()
      .then((res) => {
        setSessionId(res.sessionId);
      })
      .catch((err) => {
        const msg = err.message || 'Failed to start session';
        const hint = err.status === 500 ? ' Ensure the backend is running.' : '';
        setError(msg + hint);
      })
      .finally(() => setLoading(false));
  }, []);

  const logBasketAction = useCallback(
    (event, payload) => {
      if (!sessionId) return;
      basketApi.log(event, sessionId, payload).catch(() => {});
    },
    [sessionId]
  );

  const handleAddProduct = useCallback((product) => {
    if (!sessionId || checkoutResult) return;
    setError('');
    setBasket((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      let next;
      if (existing) {
        next = prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        next = [...prev, buildBasketItem(product, 1)];
      }
      return next;
    });
    setScanStartTime((prev) => prev || Date.now());
    logBasketAction('ADD_ITEM', { barcode: product.barcode, productId: product._id, name: product.name });
    setShowCatalog(false);
  }, [sessionId, checkoutResult, logBasketAction]);

  const handleScan = useCallback(
    async (barcode) => {
      if (!sessionId || checkoutResult) return;
      setError('');
      try {
        const res = await productApi.getByBarcode(barcode);
        handleAddProduct(res.product);
      } catch (err) {
        if (err.status === 404) setError('Product not found');
        else setError(err.message || 'Lookup failed');
      }
    },
    [sessionId, checkoutResult, handleAddProduct]
  );

  const handleRemove = useCallback(
    (item) => {
      if (checkoutResult) return;
      setBasket((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (!existing) return prev;
        const newQty = existing.quantity - 1;
        logBasketAction('REMOVE_ITEM', { productId: item.productId, name: item.name, quantity: newQty });
        if (newQty <= 0) return prev.filter((i) => i.productId !== item.productId);
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: newQty } : i
        );
      });
    },
    [checkoutResult, logBasketAction]
  );

  const handleCheckoutClick = () => {
    if (!sessionId || basket.length === 0 || checkoutResult) return;
    setShowPayment(true);
  };

  const handlePaymentSuccess = useCallback(async () => {
    setShowPayment(false);
    setCheckoutLoading(true);
    setError('');
    try {
      const items = basket.map((i) => ({ productId: i.productId, quantity: i.quantity }));
      const scanDurationSeconds = scanStartTime ? Math.round((Date.now() - scanStartTime) / 1000) : null;
      const res = await orderApi.create(sessionId, items, scanDurationSeconds);
      setCheckoutResult({
        orderId: res.orderId,
        qrToken: res.qrToken,
        totalPrice: res.totalPrice,
        expectedWeightSum: res.expectedWeightSum,
        expiresAt: res.expiresAt,
        riskScore: res.riskScore,
        flagged: res.flagged,
      });
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  }, [sessionId, basket, checkoutResult, scanStartTime]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const barcode = manualBarcode.trim();
    if (barcode) {
      handleScan(barcode);
      setManualBarcode('');
    }
  };

  const handleCloseQR = () => {
    setCheckoutResult(null);
    setBasket([]);
    setScanStartTime(null);
    sessionApi.start().then((res) => setSessionId(res.sessionId)).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 max-w-[900px] mx-auto flex items-center justify-center">
        <div className="text-muted animate-pulse font-semibold">Starting terminal session…</div>
      </div>
    );
  }

  const basketTotal = basket.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="min-h-screen p-4 pb-24 lg:pb-4 max-w-[1000px] mx-auto animate-fade-in print-hidden">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-bold text-white shadow-lg">S</div>
          <h1 className="m-0 text-xl font-bold tracking-tight">Scan & Pay</h1>
        </div>
        <a href="/admin/login" className="text-sm font-semibold text-muted hover:text-accent transition-colors">Admin Access</a>
      </header>

      {error && (
        <div className="bg-error/15 border border-error text-error py-3 px-4 rounded-lg mb-6 shadow-sm" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <section className="flex flex-col gap-4 lg:col-span-3">
          <BarcodeScanner onScan={handleScan} disabled={!!checkoutResult || showPayment || showCatalog} />
          
          <div className="flex gap-2 bg-surface p-4 rounded-xl border border-border shadow-sm">
            <form onSubmit={handleManualSubmit} className="flex flex-1 gap-2">
              <input
                type="text"
                placeholder="Barcode"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                disabled={!!checkoutResult}
                autoComplete="off"
                className="flex-1 py-2.5 px-3 border border-border rounded-lg bg-bg-dark text-[#e6edf3] focus:border-accent outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!!checkoutResult || !manualBarcode.trim()}
                className="py-2.5 px-5 bg-border hover:bg-muted text-[#e6edf3] border-0 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </form>
            <button
              type="button"
              onClick={() => setShowCatalog(true)}
              disabled={!!checkoutResult}
              className="py-2.5 px-5 bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              Catalog
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-4 lg:col-span-2">
          <Basket items={basket} onRemove={handleRemove} disabled={!!checkoutResult} />
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/90 backdrop-blur-md border-t border-border z-40 lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:p-0 lg:bg-transparent lg:border-t-0 lg:z-0 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] lg:shadow-none">
            <button
              type="button"
              className="w-full py-3.5 md:py-4 bg-success text-white border-0 rounded-xl text-base md:text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-success/20 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-success/30"
              onClick={handleCheckoutClick}
              disabled={basket.length === 0 || checkoutLoading}
            >
              {checkoutLoading ? 'Processing…' : `Checkout (₹${basketTotal.toFixed(2)})`}
            </button>
          </div>
        </section>
      </div>

      {showCatalog && (
        <ProductCatalog 
          onClose={() => setShowCatalog(false)} 
          onSelect={handleAddProduct} 
        />
      )}

      {showPayment && (
        <PaymentModal 
          total={basketTotal} 
          onSuccess={handlePaymentSuccess} 
          onClose={() => setShowPayment(false)} 
        />
      )}

      {checkoutResult && (
        <CheckoutQR
          orderId={checkoutResult.orderId}
          qrToken={checkoutResult.qrToken}
          totalPrice={checkoutResult.totalPrice}
          expectedWeightSum={checkoutResult.expectedWeightSum}
          expiresAt={checkoutResult.expiresAt}
          basket={basket}
          onClose={handleCloseQR}
        />
      )}
    </div>
  );
}
