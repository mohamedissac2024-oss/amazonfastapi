import { useContext } from "react";
import { AppContext } from "../Provider/AppContext";

/** Read the auth state / auth actions anywhere in the app. */
export default function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp() must be used inside <AppProvider>");
  return ctx;
}
