import { Link } from "react-router-dom";

export function Loader({ label = "Loading…" }) {
  return (
    <div className="state" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function EmptyState({ icon, title, text, actionLabel, actionTo }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h1>{title}</h1>
      <p>{text}</p>
      {actionTo && (
        <Link className="btn btn-primary" to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ message = "We couldn't load this. Is the API running?" }) {
  return (
    <div className="state error" role="alert">
      {message}
    </div>
  );
}
