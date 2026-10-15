import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import useApp from "../Hooks/useApp";
import Layout from "./Layout.jsx";
import Login from "../Screen/Login/Login.jsx";
import SignUp from "../Screen/SignUp/SignUp.jsx";
import Product from "../Screen/Product/Product.jsx";
import Order from "../Screen/Order/Order.jsx";

function RequireAuth({ children }) {
  const { token } = useApp();
  return token ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/products" replace />} />
          <Route path="products" element={<Product />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<SignUp />} />
          <Route
            path="orders"
            element={
              <RequireAuth>
                <Order />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
