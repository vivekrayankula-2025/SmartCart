import ProductCard from "../components/ProductCard";
import { EmptyState } from "../components/StateMessage";
import { useCart } from "../context/CartContext";

export default function Wishlist() {
  const { wishlist } = useCart();

  return (
    <section className="section">
      <div className="shop-head">
        <div>
          <span className="kicker">Saved for later</span>
          <h1>Your wishlist</h1>
          <p>Keep an eye on products you love.</p>
        </div>
      </div>

      {wishlist.length ? (
        <div className="product-grid">
          {wishlist.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🤍"
          title="Nothing saved yet"
          text="Tap the heart on a product to build your wishlist."
          actionTo="/products"
          actionLabel="Browse products"
        />
      )}
    </section>
  );
}
