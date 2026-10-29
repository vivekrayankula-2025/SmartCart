import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchMe, loginRequest, registerRequest, tokenStore } from "../services/api";

const AuthContext = createContext(null);
const ROLE_HOME = { customer: "/", seller: "/seller", management: "/management" };
const ROLE_NAME = { customer: "customer", seller: "seller", management: "company-management" };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    fetchMe()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("sc-auth-expired", onExpired);
    return () => window.removeEventListener("sc-auth-expired", onExpired);
  }, []);

  const login = useCallback(async (email, password, expectedRole) => {
    const { access } = await loginRequest(email, password);
    tokenStore.set(access);
    let me;
    try {
      me = await fetchMe();
    } catch (error) {
      tokenStore.clear();
      throw error;
    }
    if (expectedRole && me.role !== expectedRole) {
      tokenStore.clear();
      const expected = ROLE_NAME[expectedRole] || expectedRole;
      throw new Error(`This is a ${ROLE_NAME[me.role] || "different-role"} account. Choose the ${expected} sign-in option.`);
    }
    setUser(me);
    return me;
  }, []);

  const register = useCallback(
    async (details) => {
      await registerRequest(details);
      return login(details.email, details.password, details.role);
    },
    [login],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isCustomer: user?.role === "customer",
      isSeller: user?.role === "seller",
      isManagement: user?.role === "management",
      isCompany: user?.role === "seller" || user?.role === "management",
      roleHome: ROLE_HOME[user?.role] || "/",
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
