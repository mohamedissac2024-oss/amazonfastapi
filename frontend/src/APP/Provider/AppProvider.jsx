import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import useAxios from "../Hooks/useAxios";
import { AppContext } from "./AppContext";

const TOKEN_KEY = "token";

export default function AppProvider({ children }) {
  const { get, post, postForm } = useAxios();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // React to token changes made in another tab.
  useEffect(() => {
    const sync = () => setToken(localStorage.getItem(TOKEN_KEY));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Fetch the profile every time the token changes.
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoadingUser(false);
      return;
    }
    let alive = true;
    setLoadingUser(true);
    (async () => {
      const data = await get("/auth/me");
      if (!alive) return;
      if (data._error) {
        // Expired or invalid token -> sign out.
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setLoadingUser(false);
        return;
      }
      setUser(data);
      setLoadingUser(false);
    })();
    return () => {
      alive = false;
    };
  }, [token, get]);

  const login = useCallback(
    async (email, password) => {
      // The backend expects the OAuth2 form: username = email.
      const form = new URLSearchParams();
      form.set("username", String(email).trim().toLowerCase());
      form.set("password", password);
      const data = await postForm("/auth/login", form);
      if (data._error) return false;
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      return true;
    },
    [postForm]
  );

  const register = useCallback(
    async ({ fullName, email, password }) => {
      const created = await post("/auth/register", {
        full_name: fullName.trim(),
        email: String(email).trim().toLowerCase(),
        password,
      });
      if (created._error) return false;
      // Sign the new user in straight away.
      return login(email, password);
    },
    [post, login]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    toast.success("Signed out - see you soon!");
  }, []);

  const value = useMemo(
    () => ({ token, user, loadingUser, login, register, logout }),
    [token, user, loadingUser, login, register, logout]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
