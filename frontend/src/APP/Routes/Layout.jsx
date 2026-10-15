import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import useApp from "../Hooks/useApp";

const navClass = ({ isActive }) =>
  `rounded px-2 py-1 transition ${
    isActive ? "bg-white/10 text-white" : "text-gray-300 hover:text-white"
  }`;

export default function Layout() {
  const { token, user, logout } = useApp();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/products");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-slate-900 shadow">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/products" className="text-xl font-extrabold tracking-tight">
            amazon<span className="text-amber-400">web</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <NavLink to="/products" className={navClass}>
              Products
            </NavLink>
            <NavLink to="/orders" className={navClass}>
              Orders
            </NavLink>

            {token && user ? (
              <>
                <span className="hidden text-gray-300 sm:inline">
                  Hi, {user.full_name}
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded border border-gray-600 px-3 py-1.5 text-gray-200 hover:bg-white/10"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Log in
                </NavLink>
                <Link
                  to="/signup"
                  className="rounded bg-amber-500 px-3 py-1.5 font-semibold text-slate-900 hover:bg-amber-400"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t bg-white py-4 text-center text-xs text-gray-500">
        amazonweb demo storefront - powered by the FastAPI backend on port 8000
      </footer>
    </div>
  );
}
