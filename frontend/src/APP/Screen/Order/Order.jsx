import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAxios from "../../Hooks/useAxios";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Order() {
  const { get } = useAxios();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await get("/orders");
      if (!alive) return;
      setOrders(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [get]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading your orders...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
        <h1 className="text-xl font-bold">No orders yet</h1>
        <p className="mt-2 text-sm text-gray-500">
          Everything you order will show up here.
        </p>
        <Link
          to="/products"
          className="mt-4 inline-block rounded-lg bg-amber-500 px-5 py-2 font-semibold text-slate-900 hover:bg-amber-400"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">My orders</h1>
      <ul className="mt-6 space-y-4">
        {orders.map((order) => (
          <li
            key={order.id}
            className="rounded-2xl border bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Order #{order.id}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[order.status] ||
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleString()} ·{" "}
                <span className="font-bold text-amber-600">
                  ${Number(order.total).toFixed(2)}
                </span>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              {order.items.map((item) => (
                <li
                  key={item.product_id}
                  className="flex justify-between gap-4"
                >
                  <span>
                    {item.quantity} × {item.product_name}
                  </span>
                  <span>
                    ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
