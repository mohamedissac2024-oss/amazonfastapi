import { createContext } from "react";

/**
 * Shared app state: { token, user, loadingUser, login, register, logout }.
 * Never import this directly outside the Provider folder - use useApp() instead.
 */
export const AppContext = createContext(null);
