import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useApp from "../../Hooks/useApp";
import illustration from "../../Asset/bg.svg";

const input =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200";

export default function SignUp() {
  const { register, token } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/products" replace />;

  const update = (event) =>
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    const ok = await register({
      fullName: form.full_name,
      email: form.email,
      password: form.password,
    });
    setBusy(false);
    if (ok) {
      toast.success("Account created - welcome!");
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
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-amber-600 hover:underline"
          >
            Log in
          </Link>
        </p>

        <label
          htmlFor="full_name"
          className="mt-6 block text-sm font-medium text-gray-700"
        >
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          minLength={1}
          maxLength={100}
          autoComplete="name"
          value={form.full_name}
          onChange={update}
          placeholder="Jane Doe"
          className={`${input} mt-1`}
        />

        <label
          htmlFor="email"
          className="mt-4 block text-sm font-medium text-gray-700"
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
          maxLength={72}
          autoComplete="new-password"
          value={form.password}
          onChange={update}
          placeholder="At least 8 characters"
          className={`${input} mt-1`}
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-slate-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}
