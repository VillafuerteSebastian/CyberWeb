import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  HiOutlineSquares2X2,
  HiOutlineShoppingBag,
  HiOutlineMapPin,
  HiOutlineUserCircle,
  HiOutlineArrowRightOnRectangle,
} from "react-icons/hi2";
import { useAuth } from "../../../context/AuthContext";
import "./Profile.css";

const AccountPage = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isDashboard = location.pathname === "/mi-cuenta";

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const displayName =
    user.nombre_completo?.trim() || user.correo?.trim() || "Usuario";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div className="account-page">
      <div className="account-container">
        <aside className="account-sidebar">
          <div className="account-sidebar-user">
            <span className="account-avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="account-sidebar-user-info">
              <strong>{displayName}</strong>
              {user.correo && <span>{user.correo}</span>}
            </div>
          </div>

          <nav className="account-menu">
            <NavLink to="/mi-cuenta" end>
              <HiOutlineSquares2X2 aria-hidden="true" />
              Escritorio
            </NavLink>

            <NavLink to="/mi-cuenta/pedidos">
              <HiOutlineShoppingBag aria-hidden="true" />
              Pedidos
            </NavLink>

            <NavLink to="/mi-cuenta/direccion">
              <HiOutlineMapPin aria-hidden="true" />
              Dirección
            </NavLink>

            <NavLink to="/mi-cuenta/detalles">
              <HiOutlineUserCircle aria-hidden="true" />
              Detalles de la cuenta
            </NavLink>

            <button onClick={logout} className="account-logout-btn">
              <HiOutlineArrowRightOnRectangle aria-hidden="true" />
              Cerrar sesión
            </button>
          </nav>
        </aside>

        <main className="account-content">
          {isDashboard ? (
            <>
              <section id="escritorio" className="account-welcome">
                <span className="account-welcome-kicker">Bienvenido de vuelta</span>
                <h1>Hola, {displayName.split(/\s+/)[0]}</h1>
                <p>
                  Desde el escritorio de tu cuenta puedes ver tus pedidos
                  recientes, gestionar tus direcciones y actualizar los
                  detalles de tu cuenta.
                </p>
              </section>

              <div className="account-cards">
                <NavLink to="/mi-cuenta/pedidos" className="account-card">
                  <span className="account-card-icon">
                    <HiOutlineShoppingBag aria-hidden="true" />
                  </span>
                  <h3>Pedidos</h3>
                  <p>Consulta el estado e historial de tus compras.</p>
                </NavLink>

                <NavLink to="/mi-cuenta/direccion" className="account-card">
                  <span className="account-card-icon">
                    <HiOutlineMapPin aria-hidden="true" />
                  </span>
                  <h3>Dirección</h3>
                  <p>Administra tus direcciones de envío y facturación.</p>
                </NavLink>

                <NavLink to="/mi-cuenta/detalles" className="account-card">
                  <span className="account-card-icon">
                    <HiOutlineUserCircle aria-hidden="true" />
                  </span>
                  <h3>Detalles de la cuenta</h3>
                  <p>Actualiza tu información personal y contraseña.</p>
                </NavLink>

                <button className="account-card logout-card" onClick={logout}>
                  <span className="account-card-icon">
                    <HiOutlineArrowRightOnRectangle aria-hidden="true" />
                  </span>
                  <h3>Cerrar sesión</h3>
                  <p>Salir de tu cuenta actual.</p>
                </button>
              </div>
            </>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

export default AccountPage;