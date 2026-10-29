import { ArrowLeft, Check, Heart, RotateCcw, ShoppingBag, Star, Store, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import ProductImage from "../components/ProductImage";
import { ErrorState, Loader } from "../components/StateMessage";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { fetchProduct, fetchProducts } from "../services/api";
import { CATEGORY_HIGHLIGHTS, formatINR } from "../utils/format";

export default function ProductDetails() {
  const { slug } = useParams();
  const { isCompany } = useAuth();
  const { addToCart, isWishlisted, toggleWishlist } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    setProduct(null);
    setRelated([]);
    setError(false);
    window.scrollTo({ top: 0 });

    fetchProduct(slug)
      .then(async (data) => {
        setProduct(data);
        const similar = await fetchProducts({ category: data.category_slug, ordering: "-rating" });
        setRelated(similar.results.filter((item) => item.id !== data.id).slice(0, 4));
      })
      .catch(() => setError(true));
  }, [slug]);

  if (error) return <ErrorState message="Product not found." />;
  if (!product) return <Loader label="Loading product…" />;

  const liked = isWishlisted(product.id);
  const highlights = CATEGORY_HIGHLIGHTS[product.category_slug] ?? [];
  const lowStock = product.in_stock && product.stock < 10;

  const details = [
    ["Brand", product.brand],
    ["Category", product.category],
    ["Sold by", product.seller_name],
    ["Customer rating", `${product.rating} / 5 (${product.review_count.toLocaleString("en-IN")} reviews)`],
    ["Availability", product.in_stock ? `${product.stock} in stock` : "Out of stock"],
    ["Product ID", `SC-${String(product.id).padStart(5, "0")}`],
  ];

  return (
    <section className="section detail-page">
      <Link className="back" to="/products">
        <ArrowLeft size={16} />
        Back to products
      </Link>

      <div className="detail">
        <div className="detail-image">
          <ProductImage product={product} alt={product.name} />
        </div>

        <div className="detail-copy">
          <span className="eyebrow">
            {product.brand} · {product.category}
          </span>
          <h1>{product.name}</h1>

          <div className="rating large">
            <Star size={17} fill="currentColor" />
            {product.rating}
            <span>{product.review_count.toLocaleString("en-IN")} reviews</span>
          </div>

          <div className="detail-price">
            {formatINR(product.price)}
            <del>{formatINR(product.original_price)}</del>
            {product.discount_percent > 0 && <span className="save">Save {product.discount_percent}%</span>}
          </div>
          <small className="muted">Inclusive of all taxes</small>

          <p className="detail-description">{product.description}</p>

          {highlights.length > 0 && (
            <ul className="highlights">
              {highlights.map((line) => (
                <li key={line}>
                  <Check size={16} />
                  {line}
                </li>
              ))}
            </ul>
          )}

          <p className={`stock ${lowStock || !product.in_stock ? "low" : ""}`}>
            {!product.in_stock ? "Out of stock" : lowStock ? `Only ${product.stock} left in stock` : "In stock"}
          </p>

          {!isCompany && (
            <div className="detail-actions">
              <button
                className="btn btn-primary"
                disabled={!product.in_stock}
                onClick={() => addToCart(product)}
              >
                <ShoppingBag size={17} />
                Add to cart
              </button>
              <button
                className={`btn btn-outline ${liked ? "liked" : ""}`}
                onClick={() => toggleWishlist(product)}
              >
                <Heart size={17} fill={liked ? "currentColor" : "none"} />
                {liked ? "Saved" : "Wishlist"}
              </button>
            </div>
          )}

          <div className="perks">
            <span>
              <Truck size={17} />
              Free delivery over ₹4,999
            </span>
            <span>
              <RotateCcw size={17} />
              Easy returns
            </span>
            <span>
              <Store size={17} />
              Sold by {product.seller_name}
            </span>
          </div>
        </div>
      </div>

      <div className="panel spec-panel">
        <h2>Product details</h2>
        <dl className="spec-table">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {related.length > 0 && (
        <div className="related">
          <h2>More in {product.category}</h2>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
