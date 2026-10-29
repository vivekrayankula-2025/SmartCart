import { BarChart3, Heart, LogOut, Package, Search, ShoppingBag, Sparkles, Store, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { cartCount, wishlist } = useCart();
  const { user, isSeller, isManagement, logout } = useAuth();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const canShop = !isSeller && !isManagement;

  const handleSearch = (event) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };

  return (
    <header className="nav">
      <Link className="brand" to="/" aria-label="SmartCart home">
        <span className="brand-mark"><Sparkles size={17} /></span>
        Smart<span>Cart</span>
      </Link>

      <form className="searchbar" onSubmit={handleSearch} role="search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products, brands or categories"
          aria-label="Search products"
        />
        <button type="submit">Search</button>
      </form>

      <nav className="nav-actions" aria-label="Main navigation">
        <Link className="nav-link" to="/products">Shop</Link>
        {user?.role === "customer" && (
          <Link className="nav-link" to="/orders"><Package size={16} /> Orders</Link>
        )}
        {isSeller && (
          <Link className="nav-link" to="/seller"><Store size={16} /> Seller</Link>
        )}
        {isManagement && (
          <Link className="nav-link" to="/management"><BarChart3 size={16} /> Reports</Link>
        )}

        {canShop && (
          <>
            <Link className="icon-link" to="/wishlist" aria-label="Wishlist">
              <Heart size={19} />{wishlist.length > 0 && <b>{wishlist.length}</b>}
            </Link>
            <Link className="icon-link" to="/cart" aria-label="Cart">
              <ShoppingBag size={20} />{cartCount > 0 && <b>{cartCount}</b>}
            </Link>
          </>
        )}

        <ThemeToggle />
        {user ? (
          <div className="account-chip">
            <span className="avatar">{(user.company_name || user.full_name || "?")[0].toUpperCase()}</span>
            <span className="account-name">{user.company_name || user.full_name}</span>
            <button className="icon-btn" onClick={logout} aria-label="Sign out" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link className="btn btn-primary btn-sm" to="/login">
            <UserRound size={16} /> Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
