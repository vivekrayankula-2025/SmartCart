import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ProductImage from "../components/ProductImage";
import { EmptyState, ErrorState, Loader } from "../components/StateMessage";
import StatusBadge from "../components/StatusBadge";
import { fetchOrders } from "../services/api";
import { PAYMENT_LABELS, PAYMENT_STATUS_LABELS, formatDate, formatINR } from "../utils/format";

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => { fetchOrders().then(setOrders).catch(() => setError(true)); }, []);
  if (error) return <ErrorState />;
  if (!orders) return <Loader label="Loading your orders…" />;
  if (orders.length === 0) return <EmptyState icon="📦" title="No orders yet" text="When you place an order it will show up here." actionTo="/products" actionLabel="Start shopping" />;

  return (
    <section className="section narrow">
      <div className="shop-head"><div><span className="kicker">Your account</span><h1>My orders</h1><p>{orders.length} {orders.length === 1 ? "order" : "orders"} booked</p></div></div>
      <div className="order-list">
        {orders.map((order) => (
          <Link key={order.id} className="order-card" to={`/orders/${order.id}`}>
            <div className="order-head">
              <div><b>{order.reference}</b><small>Booked on {formatDate(order.created_at)}</small></div>
              <StatusBadge status={order.status} />
            </div>
            <div className="order-body">
              <div className="order-thumbs">
                {order.items.slice(0, 4).map((item) => <ProductImage key={item.id} product={{ name: item.product_name, category_slug: item.category_slug, image_url: item.image_url }} alt="" />)}
                {order.items.length > 4 && <span>+{order.items.length - 4}</span>}
              </div>
              <div className="order-summary-text"><span>{order.items.map((item) => `${item.product_name} × ${item.quantity}`).join(", ")}</span><small>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method} · {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}</small></div>
              <div className="order-total"><b>{formatINR(order.total)}</b><ChevronRight size={18} /></div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
