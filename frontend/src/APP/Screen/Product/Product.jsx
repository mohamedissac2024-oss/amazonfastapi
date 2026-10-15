import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useApp from "../../Hooks/useApp";
import useAxios, { assetUrl } from "../../Hooks/useAxios";

const PAGE_SIZE = 12;

export default function Product() {
  const { get, post } = useAxios();
  const { token } = useApp();
  const navigate = useNavigate();

  const [term, setTerm] = useState(""); // what is typed
  const [search, setSearch] = useState(""); // what is applied
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const data = await get("/products", {
        search: search || undefined,
        limit: PAGE_SIZE,
      });
      if (!alive) return;
      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [search, get]);

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(term.trim());
  };

  const quantityOf = (id) => quantities[id] ?? 1;
  const changeQuantity = (id, delta) =>
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.min(999, Math.max(1, (prev[id] ?? 1) + delta)),
    }));

  const placeOrder = async (product) => {
    if (!token) {
      toast("Please log in to place an order", { icon: "🔒" });
      navigate("/login");
      return;
    }
    const data = await post("/orders", {
      items: [{ product_id: product.id, quantity: quantityOf(product.id) }],
    });
    if (data._error) return; // the toast already explained what went wrong
    toast.success(`Order #${data.id} placed!`);
    navigate("/orders");
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-gray-500">
            {products.length} item(s) shown
          </p>
        </div>
        <form onSubmit={submitSearch} className="flex gap-2">
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search name or description..."
            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-gray-500">Loading products...</p>
      ) : products.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed bg-white p-10 text-center text-gray-500">
          No products found{search ? ` for "${search}"` : ""}.{" "}
          <button
            type="button"
            onClick={() => {
              setTerm("");
              setSearch("");
            }}
            className="text-amber-600 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const out = product.stock <= 0;
            return (
              <li
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                {product.image_url ? (
                  <img
                    src={assetUrl(product.image_url)}
                    alt={product.name}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-gray-100 text-4xl">
                    📦
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-tight">
                      {product.name}
                    </h2>
                    <span className="whitespace-nowrap text-lg font-bold text-amber-600">
                      ${Number(product.price).toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-gray-500">
                    {product.description}
                  </p>
                  <p className="mt-2 text-xs">
                    {out ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 font-medium text-red-700">
                        Out of stock
                      </span>
                    ) : (
                      <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-700">
                        {product.stock} in stock
                      </span>
                    )}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-lg border px-1">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => changeQuantity(product.id, -1)}
                        className="px-2 py-1 text-gray-600 hover:text-black"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {quantityOf(product.id)}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => changeQuantity(product.id, 1)}
                        className="px-2 py-1 text-gray-600 hover:text-black"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={out}
                      onClick={() => placeOrder(product)}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      Order now
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
