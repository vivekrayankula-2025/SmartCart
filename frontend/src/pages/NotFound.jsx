import { EmptyState } from "../components/StateMessage";

export default function NotFound() {
  return (
    <EmptyState
      icon="🧭"
      title="Page not found"
      text="The page you're looking for doesn't exist."
      actionTo="/"
      actionLabel="Back home"
    />
  );
}
