/**
 * Basket display and controls: add/remove items, show total.
 */
export default function Basket({ items, onRemove, disabled }) {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="bg-surface border border-border rounded-lg p-4 min-h-[180px]">
      <h3 className="m-0 mb-3 text-base font-semibold text-muted">Basket ({itemCount} items)</h3>
      <ul className="list-none m-0 p-0 max-h-60 overflow-y-auto">
        {items.length === 0 ? (
          <li className="text-muted text-sm py-2">Scan items to add</li>
        ) : (
          items.map((item) => (
            <li
              key={item.productId + (item.scanKey || '')}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center py-2 border-b border-border text-sm last:border-b-0"
            >
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</span>
              <span className="text-muted">×{item.quantity}</span>
              <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
              {!disabled && (
                <button
                  type="button"
                  className="w-7 h-7 p-0 rounded-md border border-border text-muted text-[0.85rem] hover:bg-error hover:text-white hover:border-error transition-colors"
                  onClick={() => onRemove(item)}
                  aria-label="Remove"
                >
                  ✕
                </button>
              )}
            </li>
          ))
        )}
      </ul>
      {items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
