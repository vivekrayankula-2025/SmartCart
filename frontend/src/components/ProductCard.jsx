import { Heart, ShoppingBag, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatINR } from "../utils/format";
import ProductImage from "./ProductImage";

export default function ProductCard({ product }) {
  const { isSeller, isManagement } = useAuth();
  const canShop = !isSeller && !isManagement;
  const { addToCart, isWishlisted, toggleWishlist } = useCart();
  const liked = isWishlisted(product.id);
  const lowStock = product.stock < 10;

  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={`/products/${product.slug}`} tabIndex={-1}>
          <ProductImage product={product} alt={product.name} loading="lazy" />
        </Link>
        {product.discount_percent > 0 && <span className="discount">{product.discount_percent}% OFF</span>}
        {canShop && (
          <button
            className={`wish ${liked ? "liked" : ""}`}
            onClick={() => toggleWishlist(product)}
            aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={18} fill={liked ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      <div className="product-info">
        <div className="eyebrow">
          {product.brand} · {product.category}
        </div>
        <Link className="product-name" to={`/products/${product.slug}`}>
          {product.name}
        </Link>

        <div className="rating">
          <Star size={14} fill="currentColor" />
          {product.rating}
          <span>({product.review_count.toLocaleString("en-IN")})</span>
        </div>

        <div className="price-row">
          <strong>{formatINR(product.price)}</strong>
          <del>{formatINR(product.original_price)}</del>
        </div>

        <div className="card-bottom">
          <span className={`stock ${lowStock ? "low" : ""}`}>
            {product.stock === 0 ? "Out of stock" : lowStock ? `Only ${product.stock} left` : "In stock"}
          </span>
          {canShop && (
            <button className="add-btn" disabled={product.stock === 0} onClick={() => addToCart(product)}>
              <ShoppingBag size={15} />
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
