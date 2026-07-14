import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, fetchMe } from "./api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    const controller = new AbortController();
    fetchMe(token, { signal: controller.signal })
      .then(setUser)
      .catch((error) => {
        if (error.name === "AbortError") return;
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
      });
    return () => controller.abort();
  }, [token]);

  async function login(email, password) {
    const { access_token } = await apiLogin(email, password);
    localStorage.setItem("token", access_token);
    setToken(access_token);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
