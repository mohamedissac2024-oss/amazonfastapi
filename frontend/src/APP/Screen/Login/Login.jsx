import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useApp from "../../Hooks/useApp";
import illustration from "../../Asset/bg.svg";

const input =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200";

export default function Login() {
  const { login, token } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/products" replace />;

  const update = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const ok = await login(form.email, form.password);
    setBusy(false);
    if (ok) {
      toast.success("Welcome back!");
      navigate("/products", { replace: true });
    }
  };

  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <img
        src={illustration}
        alt=""
        className="hidden rounded-2xl md:block"
      />

      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm"
      >
        <h1 className="text-2xl font-bold">Log in</h1>
        <p className="mt-1 text-sm text-gray-500">
          New to amazonweb?{" "}
          <Link
            to="/signup"
            className="font-medium text-amber-600 hover:underline"
          >
            Create an account
          </Link>
        </p>

        <label
          htmlFor="email"
          className="mt-6 block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={update}
          placeholder="you@example.com"
          className={`${input} mt-1`}
        />

        <label
          htmlFor="password"
          className="mt-4 block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          value={form.password}
          onChange={update}
          placeholder="********"
          className={`${input} mt-1`}
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-slate-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
