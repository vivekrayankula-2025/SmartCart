import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";

const LOGIN_ROLES = [
  { key: "customer", label: "Customer" },
  { key: "seller", label: "Seller" },
  { key: "management", label: "Management" },
];
const REGISTER_ROLES = LOGIN_ROLES.filter(({ key }) => key !== "management");
const ROLE_HOME = { customer: "/", seller: "/seller", management: "/management" };

export default function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const { user, login, register } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const availableRoles = isRegister ? REGISTER_ROLES : LOGIN_ROLES;
  const initialRole = params.get("role");
  const [role, setRole] = useState(
    availableRoles.some((item) => item.key === initialRole) ? initialRole : "customer",
  );
  const [form, setForm] = useState({ fullName: "", companyName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to={location.state?.from ?? ROLE_HOME[user.role] ?? "/"} replace />;
  }

  const isSeller = role === "seller";
  const roleLabel = LOGIN_ROLES.find((item) => item.key === role)?.label ?? "Customer";
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isRegister) await register({ ...form, role });
      else await login(form.email, form.password, role);
    } catch (err) {
      setError(errorMessage(err, isRegister ? "Could not create your account." : "Invalid email or password."));
      setBusy(false);
    }
  };

  const heading = isRegister
    ? isSeller ? "Create a seller account" : "Create your account"
    : role === "management" ? "Management sign in" : role === "seller" ? "Seller sign in" : "Welcome back";
  const subheading = role === "management"
    ? "View company-wide product sales and daily turnover."
    : role === "seller"
      ? "Add products, manage your listings, and fulfil orders."
      : "Shop products, pay securely, and track your deliveries.";

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="auth-brand" to="/">
          <span className="brand-mark"><Sparkles size={16} /></span>
          SmartCart
        </Link>

        <div className={`tabs full-tabs auth-role-tabs ${isRegister ? "two-roles" : "three-roles"}`} role="tablist" aria-label="Account type">
          {availableRoles.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={role === item.key}
              className={role === item.key ? "active" : ""}
              onClick={() => setRole(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div>
          <h1>{heading}</h1>
          <p className="auth-sub">{subheading}</p>
        </div>

        {isRegister && isSeller && (
          <label>
            Store or seller name
            <input required value={form.companyName} onChange={setField("companyName")} placeholder="Your shop name" />
          </label>
        )}
        {isRegister && (
          <label>
            Full name
            <input required value={form.fullName} onChange={setField("fullName")} placeholder="Your name" autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={setField("email")}
            placeholder={isSeller ? "seller@example.com" : "you@example.com"}
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            value={form.password}
            onChange={setField("password")}
            placeholder={isRegister ? "At least 8 characters" : "Your password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </label>

        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-primary full" disabled={busy}>
          {busy ? "Please wait…" : isRegister ? `Create ${roleLabel.toLowerCase()} account` : "Sign in"}
        </button>

        {role === "management" && !isRegister && (
          <p className="management-access-note">Management access is created by an authorized administrator; public registration is disabled.</p>
        )}

        <div className="auth-switch">
          {isRegister ? (
            <>Already have an account? <Link to={`/login?role=${role}`}>Sign in</Link></>
          ) : role === "management" ? (
            <>Need a customer or seller account? <Link to="/register">Register here</Link></>
          ) : (
            <>New here? <Link to={`/register?role=${role}`}>Create an account</Link></>
          )}
        </div>
      </form>
    </section>
  );
}
