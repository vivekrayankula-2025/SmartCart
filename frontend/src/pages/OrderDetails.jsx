import { ArrowLeft, CheckCircle2, CreditCard, MapPin, Printer, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import ProductImage from "../components/ProductImage";
import StatusBadge from "../components/StatusBadge";
import { ErrorState, Loader } from "../components/StateMessage";
import { cancelOrder, errorMessage, fetchOrder } from "../services/api";
import { PAYMENT_LABELS, formatDateTime, formatINR } from "../utils/format";

const STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];
const paymentStatusLabel = {
  pending: "Awaiting payment confirmation",
  paid: "Paid",
  cod_due: "Cash due on delivery",
  failed: "Payment failed",
  cancelled: "Cancelled",
};

export default function OrderDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try { setOrder(await fetchOrder(id)); }
    catch (err) { setError(errorMessage(err, "We couldn't find that order.")); }
  }, [id]);

  useEffect(() => { setOrder(null); load(); }, [id, load]);

  const handleCancel = async () => {
    if (!window.confirm("Cancel this unpaid order? Its reserved stock will be returned.")) return;
    setBusy(true);
    try { setOrder(await cancelOrder(id)); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  if (error && !order) return <ErrorState message={error} />;
  if (!order) return <Loader label="Loading order and invoice…" />;

  const cancelled = order.status === "cancelled";
  const paymentPending = order.payment_status === "pending" || order.payment_status === "failed";
  const currentStep = STEPS.findIndex((step) => step.key === order.status);
  const returnState = search.get("payment");

  return (
    <section className="section narrow invoice-page">
      <div className="print-hide">
        <Link className="back" to="/orders"><ArrowLeft size={16} /> All orders</Link>
        {location.state?.placed && <div className="order-banner"><CheckCircle2 size={22} /><div><b>Order placed.</b><span>Your order {order.reference} is saved. Follow shipping updates here.</span></div></div>}
        {returnState === "success" && order.payment_status === "pending" && <div className="payment-transition" role="status">Payment is being confirmed by the provider. Do not submit another payment; refresh this page for the latest status.</div>}
        {returnState === "cancelled" && order.payment_status === "pending" && <div className="payment-transition" role="status">Checkout was closed before confirmation. This order is still awaiting payment and is not marked as paid.</div>}
        <div className="shop-head">
          <div><span className="kicker">Order tracking &amp; invoice</span><h1>{order.reference}</h1><p>Booked {formatDateTime(order.created_at)}</p></div>
          <StatusBadge status={order.status} />
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        {order.payment_status === "pending" && <div className="payment-transition" role="status">Shipping updates begin after online payment is confirmed.</div>}
        {!cancelled && order.payment_status !== "pending" && (
          <ol className="timeline">{STEPS.map((step, index) => <li key={step.key} className={index <= currentStep ? "done" : ""}><span className="dot">{index <= currentStep ? "✓" : index + 1}</span>{step.label}</li>)}</ol>
        )}

        <div className="invoice-toolbar">
          <span className={`payment-status ${order.payment_status === "paid" ? "paid" : paymentPending ? "pending" : ""}`}><CreditCard size={15} />{paymentStatusLabel[order.payment_status] ?? order.payment_status}</span>
          <div className="row-actions">
            {paymentPending && order.payment_status !== "cancelled" && <button className="btn btn-outline btn-sm" onClick={load} disabled={busy}><RefreshCw size={14} /> Refresh status</button>}
            {paymentPending && order.payment_status !== "cancelled" && <button className="btn btn-outline btn-sm" onClick={handleCancel} disabled={busy}><XCircle size={14} /> {busy ? "Cancelling…" : "Cancel unpaid order"}</button>}
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer size={15} /> Print invoice</button>
          </div>
        </div>
      </div>

      <article className="panel invoice-sheet">
        <header className="invoice-header">
          <div><span className="kicker">SmartCart</span><h2>Order invoice</h2><p className="muted">Invoice reference: {order.reference}</p></div>
          <div className="invoice-meta"><b>Order date</b><span>{formatDateTime(order.created_at)}</span><b>Payment</b><span>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span><span className={`payment-status ${order.payment_status === "paid" ? "paid" : ""}`}>{paymentStatusLabel[order.payment_status] ?? order.payment_status}</span></div>
        </header>

        <div className="invoice-parties">
          <div><span className="eyebrow">Billed to</span><p><b>{order.full_name}</b><br />{order.address}<br />{order.city} – {order.postal_code}<br />Phone: {order.phone}</p></div>
          <div><span className="eyebrow">Shipping status</span><p><StatusBadge status={order.status} /><br />{order.payment_status === "pending" ? "Shipping begins after payment is confirmed." : `Last order update: ${formatDateTime(order.created_at)}`}</p></div>
        </div>

        <div className="table-wrap">
          <table className="invoice-table">
            <thead><tr><th>Product</th><th>Unit price</th><th>Qty</th><th>Line total</th></tr></thead>
            <tbody>{order.items.map((item) => <tr key={item.id}><td><div className="cell-product"><ProductImage product={{ name: item.product_name, category_slug: item.category_slug, image_url: item.image_url }} alt="" /><div><b>{item.product_name}</b><small>Shipping: <StatusBadge status={item.status} /></small></div></div></td><td>{formatINR(item.unit_price)}</td><td>{item.quantity}</td><td><b>{formatINR(item.line_total)}</b></td></tr>)}</tbody>
          </table>
        </div>

        <div className="invoice-totals">
          <div><span>Subtotal</span><b>{formatINR(order.subtotal)}</b></div>
          <div><span>Shipping</span><b>{Number(order.shipping_fee) === 0 ? "FREE" : formatINR(order.shipping_fee)}</b></div>
          <div className="grand"><span>Total</span><b>{formatINR(order.total)}</b></div>
        </div>
        <p className="invoice-footnote">This invoice reflects the order booked on SmartCart. Never share your card number or security code with a seller. Payments are confirmed by the payment provider; cash-on-delivery remains due to the delivery partner.</p>
      </article>
    </section>
  );
}
