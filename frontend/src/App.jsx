import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import RequireRole from "./components/RequireRole";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import OrderDetails from "./pages/OrderDetails";
import Orders from "./pages/Orders";
import ProductDetails from "./pages/ProductDetails";
import Products from "./pages/Products";
import Register from "./pages/Register";
import Wishlist from "./pages/Wishlist";
import { Loader } from "./components/StateMessage";

const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const ManagementDashboard = lazy(() => import("./pages/ManagementDashboard"));

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/orders" element={<RequireRole role="customer"><Orders /></RequireRole>} />
          <Route path="/orders/:id" element={<RequireRole role="customer"><OrderDetails /></RequireRole>} />
          <Route path="/seller" element={<RequireRole role="seller"><Suspense fallback={<Loader label="Loading seller workspace…" />}><SellerDashboard /></Suspense></RequireRole>} />
          <Route path="/management" element={<RequireRole role="management"><Suspense fallback={<Loader label="Loading company reports…" />}><ManagementDashboard /></Suspense></RequireRole>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
