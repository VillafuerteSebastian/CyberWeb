import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import MainLayout from "./layouts/MainLayout";
import AdminRoute from "./components/AdminRoute";
import { CartProvider } from "./context/CartContext";

// Lazy loaded components
const Home = lazy(() => import("./pages/home/Home"));
const Login = lazy(() => import("./pages/login/Login"));
const Register = lazy(() => import("./pages/Register/Register"));
const CartPage = lazy(() => import("./pages/Cart/CartPage"));
const ProductDetail = lazy(() => import("./pages/ProductDetail/ProducDetail"));
const CategoryPage = lazy(() => import("./pages/Category/CategoryPage"));
const Ubication = lazy(() => import("./pages/navbar/ubicacion/Ubication"));
const Nosotros = lazy(() => import("./pages/navbar/Nosotros/Nosotros"));
const Garantias = lazy(() => import("./pages/navbar/Garantias/Garantias"));
const Descuentos = lazy(() => import("./pages/navbar/Descuentos/Descuentos"));
const AddProduct = lazy(() => import("./adminpages/AdminProductis/AddProduct"));
const AdminOrders = lazy(() => import("./adminpages/OrderList/OrderList"));
const AccountPage = lazy(() => import("./pages/mi cuenta/Perfil/Profile"));
const PedidosPage = lazy(() => import("./pages/mi cuenta/Pedidos/Pedidos"));
const DireccionPage = lazy(() => import("./pages/mi cuenta/Direccion/Dirrecion"));
const DetallesPage = lazy(() => import("./pages/mi cuenta/Detallesperfil/DetallesPerfil"));
const CategoryManager = lazy(() => import("./adminpages/AdminCategories/CategoryManager"));

function App() {
  return (
    <CartProvider>
      <Suspense fallback={<div className="loading">Cargando...</div>}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/catalogo" element={<CategoryPage />} />

            <Route
              path="/admin/add-product"
              element={
                <AdminRoute>
                  <AddProduct />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminOrders />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/categories"
              element={
                <AdminRoute>
                  <CategoryManager />
                </AdminRoute>
              }
            />

            <Route path="/tiendas" element={<Ubication />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/garantias" element={<Garantias />} />
            <Route path="/descuentos" element={<Descuentos />} />

            <Route path="/cart" element={<CartPage />} />

            <Route path="/mi-cuenta" element={<AccountPage />}>
              <Route path="pedidos" element={<PedidosPage />} />
              <Route path="direccion" element={<DireccionPage />} />
              <Route path="detalles" element={<DetallesPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </CartProvider>
  );
}

export default App;