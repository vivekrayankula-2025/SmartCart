import axios from "axios";

const TOKEN_KEY = "sc-access-token";
const api = axios.create({ baseURL: "/api" });

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event("sc-auth-expired"));
    }
    return Promise.reject(error);
  },
);

const get = async (url, params) => (await api.get(url, { params })).data;

export const fetchProducts = (params = {}) => get("/products/", params);
export const fetchFeatured = () => get("/products/featured/");
export const fetchProduct = (slug) => get(`/products/${slug}/`);
export const fetchCategories = () => get("/categories/");

export const loginRequest = async (email, password) =>
  (await api.post("/auth/login/", { username: email.trim().toLowerCase(), password })).data;

export const registerRequest = async ({ fullName, email, password, role, companyName }) =>
  (
    await api.post("/auth/register/", {
      full_name: fullName,
      email,
      password,
      role,
      company_name: companyName ?? "",
    })
  ).data;

export const fetchMe = () => get("/auth/me/");

export const createOrder = async (payload) =>
  (await api.post("/orders/", payload)).data;
export const fetchOrders = () => get("/orders/");
export const fetchOrder = (id) => get(`/orders/${id}/`);
export const cancelOrder = async (id) => (await api.post(`/orders/${id}/cancel/`)).data;

export const fetchSellerStats = () => get("/seller/stats/");
export const fetchSellerProducts = () => get("/seller/products/");
export const createSellerProduct = async (data) => (await api.post("/seller/products/", data)).data;
export const updateSellerProduct = async (id, data) =>
  (await api.patch(`/seller/products/${id}/`, data)).data;
export const deleteSellerProduct = (id) => api.delete(`/seller/products/${id}/`);
export const fetchSellerOrders = () => get("/seller/orders/");
export const updateSellerOrderStatus = async (id, status) =>
  (await api.patch(`/seller/orders/${id}/`, { status })).data;

export const fetchManagementReports = (days = 30) => get("/management/reports/", { days });

function firstString(value) {
  if (typeof value === "string") return value;
  const children = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
  for (const child of children) {
    const found = firstString(child);
    if (found) return found;
  }
  return null;
}

export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error?.isAxiosError) return error?.message || fallback;
  const data = error.response?.data;
  if (!data || typeof data === "string") return fallback;
  return (typeof data.detail === "string" && data.detail) || firstString(data) || fallback;
}

export default api;
