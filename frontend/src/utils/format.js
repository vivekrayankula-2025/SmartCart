export const formatINR = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const CATEGORY_ICONS = {
  audio: "🎧",
  cameras: "📷",
  fashion: "👕",
  gaming: "🎮",
  home: "🏠",
  laptops: "💻",
  mobiles: "📱",
  accessories: "🔌",
};

export const STATUS_LABELS = {
  placed: "Placed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_LABELS = {
  cod: "Cash on delivery",
  card: "Card",
  upi: "UPI",
  online: "Card / UPI",
};

export const PAYMENT_STATUS_LABELS = {
  pending: "Awaiting payment",
  paid: "Paid",
  cod_due: "Cash due on delivery",
  failed: "Payment failed",
  cancelled: "Cancelled",
};

/** Generic selling points shown on the product page, by category. */
export const CATEGORY_HIGHLIGHTS = {
  audio: ["Comfortable all-day fit", "Clear, balanced sound", "Quick pairing and stable connection"],
  cameras: ["Sharp photos in everyday light", "Simple controls for beginners", "Built for travel and daily use"],
  fashion: ["Comfortable everyday fit", "Easy to style and layer", "Easy-care fabric"],
  gaming: ["Responsive, low-latency feel", "Built for long sessions", "Works across popular platforms"],
  home: ["Designed for everyday convenience", "Easy to set up", "Compact and easy to store"],
  laptops: ["Smooth performance for work and study", "Portable and travel-ready", "Reliable battery for the day"],
  mobiles: ["Fast, fluid performance", "Capable everyday camera", "All-day battery"],
  accessories: ["Durable build quality", "Plug-and-play compatibility", "Compact and easy to carry"],
};
