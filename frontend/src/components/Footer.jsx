import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div>
        <b>SmartCart</b>
        <span>Thoughtful shopping · secure checkout · order tracking</span>
      </div>
      <div className="footer-links">
        <Link to="/products">Shop</Link>
        <Link to="/register?role=seller">Sell on SmartCart</Link>
      </div>
      <span>© {new Date().getFullYear()} SmartCart</span>
    </footer>
  );
}
