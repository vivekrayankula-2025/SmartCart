import { CheckCircle2, Eye, EyeOff, Pencil, Plus, Trash2, Truck, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import ProductForm from "../components/ProductForm";
import ProductImage from "../components/ProductImage";
import { ErrorState, Loader } from "../components/StateMessage";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import {
  deleteSellerProduct,
  errorMessage,
  fetchCategories,
  fetchSellerOrders,
  fetchSellerProducts,
  fetchSellerStats,
  updateSellerOrderStatus,
  updateSellerProduct,
} from "../services/api";
import { PAYMENT_LABELS, formatDateTime, formatINR } from "../utils/format";

export default function SellerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("products");
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [newStats, newProducts, newOrders, newCategories] = await Promise.all([
        fetchSellerStats(), fetchSellerProducts(), fetchSellerOrders(), fetchCategories(),
      ]);
      setStats(newStats);
      setProducts(newProducts);
      setLines(newOrders);
      setCategories(newCategories);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "We couldn't load your seller dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (action) => {
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (loading) return <Loader label="Loading seller dashboard…" />;
  if (!stats) return <ErrorState message={error || "We couldn't load your seller dashboard."} />;

  const cards = [
    { label: "Sales revenue", value: formatINR(stats.revenue) },
    { label: "Orders", value: stats.orders },
    { label: "To fulfil", value: stats.pending, highlight: stats.pending > 0 },
    { label: "Active products", value: `${stats.active_products}/${stats.products}` },
    { label: "Low stock", value: stats.low_stock, highlight: stats.low_stock > 0 },
  ];

  return (
    <section className="section">
      <div className="shop-head">
        <div>
          <span className="kicker">Seller workspace</span>
          <h1>{user.company_name || user.full_name}</h1>
          <p>Manage your product listings and fulfil orders for your store.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setTab("products"); setEditing("new"); }}>
          <Plus size={17} /> Add product
        </button>
      </div>

      <div className="stats-grid seller-metrics">
        {cards.map((card) => (
          <div key={card.label} className={`stat-card ${card.highlight ? "attention" : ""}`}>
            <span>{card.label}</span><b>{card.value}</b>
          </div>
        ))}
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="tabs" role="tablist">
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Products ({products.length})</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Orders ({lines.length})</button>
      </div>

      {tab === "products" && (
        <>
          {editing && (
            <ProductForm
              key={editing === "new" ? "new" : editing.id}
              product={editing === "new" ? null : editing}
              categories={categories}
              onCancel={() => setEditing(null)}
              onSaved={() => { setEditing(null); load(); }}
            />
          )}
          {products.length === 0 && !editing ? (
            <div className="panel empty-panel">
              <h2>No products yet</h2>
              <p>Add your first product with a picture, price, and stock. It will appear in the store.</p>
              <button className="btn btn-primary" onClick={() => setEditing("new")}><Plus size={17} /> Add product</button>
            </div>
          ) : products.length > 0 && (
            <div className="panel table-wrap">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th /></tr></thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td><div className="cell-product"><ProductImage product={product} alt="" /><div><b>{product.name}</b><small>{product.brand}</small></div></div></td>
                      <td>{categories.find((item) => item.slug === product.category)?.name ?? product.category}</td>
                      <td>{formatINR(product.price)}</td>
                      <td className={product.stock < 10 ? "low" : ""}>{product.stock}</td>
                      <td><span className={`badge badge-${product.is_active ? "active" : "hidden"}`}>{product.is_active ? "Visible" : "Hidden"}</span></td>
                      <td>
                        <div className="row-actions end">
                          <button className="icon-btn" title="Edit" onClick={() => setEditing(product)}><Pencil size={16} /></button>
                          <button className="icon-btn" title={product.is_active ? "Hide from store" : "Show in store"} onClick={() => run(() => updateSellerProduct(product.id, { is_active: !product.is_active }))}>{product.is_active ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                          <button className="icon-btn danger" title="Delete" onClick={() => window.confirm(`Delete “${product.name}”?`) && run(() => deleteSellerProduct(product.id))}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "orders" && (lines.length === 0 ? (
        <div className="panel empty-panel"><h2>No orders yet</h2><p>Customer orders for your products will appear here after payment or cash-on-delivery booking.</p></div>
      ) : (
        <div className="fulfil-list">
          {lines.map((line) => (
            <div className="panel fulfil-card" key={line.id}>
              <div className="fulfil-top"><div><b>{line.reference}</b><small>{formatDateTime(line.created_at)}</small></div><StatusBadge status={line.status} /></div>
              <div className="fulfil-body">
                <div className="cell-product"><ProductImage product={line} alt="" /><div><b>{line.product_name}</b><small>{formatINR(line.unit_price)} × {line.quantity} = {formatINR(line.line_total)}</small></div></div>
                <div className="fulfil-address"><b>{line.customer_name}</b><small>{line.address}, {line.city} – {line.postal_code}</small><small>Phone {line.phone} · {PAYMENT_LABELS[line.payment_method] ?? line.payment_method} · {line.payment_status === "paid" ? "Paid" : "Cash due on delivery"}</small></div>
                <div className="row-actions end">
                  {line.status === "placed" && <button className="btn btn-primary btn-sm" onClick={() => run(() => updateSellerOrderStatus(line.id, "shipped"))}><Truck size={15} /> Mark shipped</button>}
                  {line.status === "shipped" && <button className="btn btn-primary btn-sm" onClick={() => run(() => updateSellerOrderStatus(line.id, "delivered"))}><CheckCircle2 size={15} /> Mark delivered</button>}
                  {(line.status === "placed" || line.status === "shipped") && <button className="btn btn-outline btn-sm" onClick={() => window.confirm("Cancel this item? The stock will be returned.") && run(() => updateSellerOrderStatus(line.id, "cancelled"))}><XCircle size={15} /> Cancel</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
