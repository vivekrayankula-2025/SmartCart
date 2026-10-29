import { ArrowRight, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/StateMessage";
import { useCart } from "../context/CartContext";
import { formatINR } from "../utils/format";

export default function Cart() {
  const { cart, subtotal, shipping, total, freeShippingThreshold, updateQty, removeFromCart } =
    useCart();

  if (cart.length === 0) {
    return (
      <EmptyState
        icon="🛍️"
        title="Your cart is waiting"
        text="Add products and SmartCart will help you shop smarter."
        actionTo="/products"
        actionLabel="Start shopping"
      />
    );
  }

  const remaining = freeShippingThreshold - subtotal;

  return (
    <section className="section">
      <div className="shop-head">
        <div>
          <span className="kicker">Smart Cart</span>
          <h1>Your shopping bag</h1>
          <p>Review your items before checkout.</p>
        </div>
      </div>

      <div className="cart-layout">
        <div className="cart-list">
          {cart.map((item) => (
            <div className="cart-item" key={item.id}>
              <img src={item.image_url} alt={item.name} />
              <div>
                <span className="eyebrow">{item.brand}</span>
                <h3>
                  <Link to={`/products/${item.slug}`}>{item.name}</Link>
                </h3>
                <p>{formatINR(item.price)} each</p>
                <div className="qty">
                  <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease quantity">
                    <Minus size={13} />
                  </button>
                  <b>{item.qty}</b>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase quantity">
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              <strong>{formatINR(item.price * item.qty)}</strong>
              <button className="delete" onClick={() => removeFromCart(item.id)} aria-label="Remove item">
                <Trash2 size={17} />
              </button>
            </div>
          ))}

          <div className="smart-cart-box">
            ✨
            <div>
              <b>
                {remaining > 0
                  ? `Add ${formatINR(remaining)} more for free shipping`
                  : "You've unlocked free shipping"}
              </b>
              <p>Price changes and low-stock warnings will plug into this module.</p>
            </div>
          </div>
        </div>

        <aside className="summary">
          <h2>Order summary</h2>
          <div>
            <span>Subtotal</span>
            <b>{formatINR(subtotal)}</b>
          </div>
          <div>
            <span>Shipping</span>
            <b>{shipping === 0 ? "FREE" : formatINR(shipping)}</b>
          </div>
          <hr />
          <div className="grand">
            <span>Total</span>
            <b>{formatINR(total)}</b>
          </div>
          <Link className="btn btn-primary full" to="/checkout">
            Checkout <ArrowRight size={17} />
          </Link>
          <small>
            <ShieldCheck size={13} />
            Secure checkout
          </small>
        </aside>
      </div>
    </section>
  );
}
