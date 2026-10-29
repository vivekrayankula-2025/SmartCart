import { CheckCircle2, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { EmptyState, Loader } from "../components/StateMessage";
import ProductImage from "../components/ProductImage";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { createOrder, errorMessage } from "../services/api";
import { formatINR } from "../utils/format";

const PAYMENT_OPTIONS = [
  { key: "card", title: "Card", description: "Credit or debit card via Stripe", icon: CreditCard },
  { key: "upi", title: "UPI", description: "Pay through a supported UPI app", icon: Landmark },
  { key: "cod", title: "Cash on delivery", description: "Pay when your order arrives", icon: CheckCircle2 },
];

export default function Checkout() {
  const { cart, subtotal, shipping, total, clearCart } = useCart();
  const { user, isSeller, isManagement, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", city: "", postal_code: "", payment_method: "cod" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.full_name) setForm((current) => current.full_name ? current : { ...current, full_name: user.full_name });
  }, [user]);

  if (loading) return <Loader label="Checking your account…" />;
  if (!user) {
    return <EmptyState icon="🔐" title="Sign in to place your order" text="Sign in with a customer account; your cart will be waiting." actionTo="/login?role=customer" actionLabel="Customer sign in" />;
  }
  if (isSeller || isManagement) {
    const home = isSeller ? "/seller" : "/management";
    return <EmptyState icon="🛍️" title="Customer checkout only" text="Seller and company-management accounts can review the shop, but only customer accounts can place orders." actionTo={home} actionLabel={isSeller ? "Seller workspace" : "Management reports"} />;
  }
  if (cart.length === 0) {
    return <EmptyState icon="🛍️" title="Nothing to check out" text="Your cart is empty." actionTo="/products" actionLabel="Browse products" />;
  }

  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const online = form.payment_method === "card" || form.payment_method === "upi";
    let checkoutTab = null;
    if (online) {
      checkoutTab = window.open("about:blank", "_blank");
      if (checkoutTab) checkoutTab.opener = null;
      setNotice("Secure Stripe checkout is opening in a new tab. Return here after payment; order status updates when payment is confirmed.");
    }

    try {
      const order = await createOrder({ ...form, items: cart.map((item) => ({ product_id: item.id, quantity: item.qty })) });
      clearCart();
      if (order.checkout_url) {
        if (checkoutTab) checkoutTab.location.href = order.checkout_url;
        else window.location.assign(order.checkout_url);
        return;
      }
      if (checkoutTab) checkoutTab.close();
      navigate(`/orders/${order.id}`, { state: { placed: true } });
    } catch (err) {
      if (checkoutTab && !checkoutTab.closed) checkoutTab.close();
      setError(errorMessage(err));
      setNotice("");
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="shop-head">
        <div><span className="kicker">Customer checkout</span><h1>Almost there.</h1><p>Tell us where to deliver your order.</p></div>
      </div>

      <form className="checkout-grid" onSubmit={handleSubmit}>
        <div className="checkout-form">
          <div className="panel form-card">
            <h2>Delivery address</h2>
            <div className="two">
              <label>Full name<input required maxLength="150" autoComplete="name" value={form.full_name} onChange={setField("full_name")} placeholder="Full name" /></label>
              <label>Phone<input required maxLength="20" autoComplete="tel" value={form.phone} onChange={setField("phone")} placeholder="Mobile number" /></label>
            </div>
            <label>Address<input required maxLength="300" autoComplete="street-address" value={form.address} onChange={setField("address")} placeholder="Street, area, landmark" /></label>
            <div className="two">
              <label>City<input required maxLength="100" autoComplete="address-level2" value={form.city} onChange={setField("city")} placeholder="City" /></label>
              <label>Postal code<input required maxLength="12" autoComplete="postal-code" value={form.postal_code} onChange={setField("postal_code")} placeholder="PIN code" /></label>
            </div>
          </div>

          <div className="panel form-card">
            <h2>Payment method</h2>
            <div className="payment-choice-list">
              {PAYMENT_OPTIONS.map(({ key, title, description, icon: Icon }) => (
                <label className="payment-option" key={key}>
                  <input type="radio" name="payment" value={key} checked={form.payment_method === key} onChange={setField("payment_method")} />
                  <Icon size={18} />
                  <div><b>{title}</b><small>{description}</small></div>
                </label>
              ))}
            </div>
            {(form.payment_method === "card" || form.payment_method === "upi") && (
              <p className="payment-note">You’ll complete payment on Stripe’s secure checkout page. SmartCart never stores card details.</p>
            )}
            {form.payment_method === "cod" && <p className="payment-note">Your invoice will show the amount due to the delivery partner.</p>}
          </div>
        </div>

        <aside className="summary">
          <h2>Order summary</h2>
          <ul className="mini-items">
            {cart.map((item) => (
              <li key={item.id}>
                <ProductImage product={item} alt="" />
                <span>{item.name}<small>Qty {item.qty}</small></span>
                <b>{formatINR(item.price * item.qty)}</b>
              </li>
            ))}
          </ul>
          <hr />
          <div><span>Subtotal</span><b>{formatINR(subtotal)}</b></div>
          <div><span>Shipping</span><b>{shipping === 0 ? "FREE" : formatINR(shipping)}</b></div>
          <hr />
          <div className="grand"><span>Total</span><b>{formatINR(total)}</b></div>

          {notice && <div className="payment-transition" role="status">{notice}</div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-primary full" type="submit" disabled={busy}>
            <CheckCircle2 size={17} />{busy ? "Preparing checkout…" : form.payment_method === "cod" ? "Place order" : "Continue to secure payment"}
          </button>
          <small><ShieldCheck size={13} /> Secure checkout · <Link to="/cart">edit cart</Link></small>
        </aside>
      </form>
    </section>
  );
}
