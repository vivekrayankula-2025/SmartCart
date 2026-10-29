import { ArrowRight, BadgePercent, ShieldCheck, Sparkles, Store, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import ProductImage from "../components/ProductImage";
import { ErrorState, Loader } from "../components/StateMessage";
import { useAuth } from "../context/AuthContext";
import { fetchCategories, fetchFeatured } from "../services/api";
import { CATEGORY_ICONS, formatINR } from "../utils/format";

export default function Home() {
  const { user, isSeller, isManagement } = useAuth();
  const [featured, setFeatured] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([fetchFeatured(), fetchCategories()])
      .then(([products, cats]) => {
        setFeatured(products);
        setCategories(cats);
      })
      .catch(() => setError(true));
  }, []);

  const totalProducts = categories.reduce((sum, category) => sum + category.product_count, 0);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">
            <Sparkles size={14} />
            Shopping, upgraded
          </span>
          <h1>
            Buy better.
            <br />
            <em>Shop smarter.</em>
          </h1>
          <p>
            Discover products from independent sellers — with clear prices,
            fast delivery and orders you can track.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/products">
              Explore products <ArrowRight size={17} />
            </Link>
            <Link className="btn btn-outline" to="/products?ordering=-rating">
              Top rated
            </Link>
          </div>

          <div className="hero-stats">
            <div>
              <b>{totalProducts || "120+"}</b>
              <span>Products</span>
            </div>
            <div>
              <b>{categories.length || 8}</b>
              <span>Categories</span>
            </div>
            <div>
              <b>₹4,999+</b>
              <span>Free shipping</span>
            </div>
          </div>
        </div>

        <div className="hero-stack">
          {(featured ?? []).slice(0, 3).map((product, index) => (
            <Link key={product.id} className={`hero-card hero-card-${index}`} to={`/products/${product.slug}`}>
              <ProductImage product={product} alt="" />
              <div>
                <b>{product.name}</b>
                <span>{formatINR(product.price)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section section-tight">
        <div className="trust-row">
          <span>
            <ShieldCheck size={18} />
            Secure checkout
          </span>
          <span>
            <Truck size={18} />
            Fast delivery
          </span>
          <span>
            <BadgePercent size={18} />
            Real discounts
          </span>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="kicker">Browse</span>
              <h2>Shop by category</h2>
            </div>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link key={category.id} className="category-tile" to={`/products?category=${category.slug}`}>
                <span className="category-icon">{CATEGORY_ICONS[category.slug] ?? "🛒"}</span>
                <b>{category.name}</b>
                <small>{category.product_count} products</small>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="kicker">Curated for you</span>
            <h2>Trending picks</h2>
          </div>
          <Link className="text-link" to="/products">
            View all <ArrowRight size={16} />
          </Link>
        </div>

        {error && <ErrorState />}
        {!error && !featured && <Loader />}
        {featured && (
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="sell-banner">
        <div>
          <span className="pill pill-light">
            <Store size={14} />
            For sellers
          </span>
          <h2>Sell your products on SmartCart.</h2>
          <p>
            Add products with photos, update your listings, and fulfil customer orders from one
            seller workspace.
          </p>
        </div>
        {isSeller ? (
          <Link to="/seller" className="btn btn-light">Open seller workspace <ArrowRight size={17} /></Link>
        ) : isManagement ? (
          <Link to="/management" className="btn btn-light">Open company reports <ArrowRight size={17} /></Link>
        ) : (
          <Link to="/register?role=seller" className="btn btn-light">Start selling <ArrowRight size={17} /></Link>
        )}
      </section>
    </>
  );
}
