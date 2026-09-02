import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
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

  return (
    <div className="account-page">
      <div className="account-container">
        <aside className="account-sidebar">
          <h2>Mi cuenta</h2>

          <nav className="account-menu">
            <NavLink to="/mi-cuenta" end>
              Escritorio
            </NavLink>

            <NavLink to="/mi-cuenta/pedidos">Pedidos</NavLink>

            <NavLink to="/mi-cuenta/direccion">Dirección</NavLink>

            <NavLink to="/mi-cuenta/detalles">
              Detalles de la cuenta
            </NavLink>

            <button onClick={logout} className="account-logout-btn">
              Cerrar sesión
            </button>
          </nav>
        </aside>

        <main className="account-content">
          {isDashboard ? (
            <>
              <section id="escritorio" className="account-section">
                <h1>Hola {displayName}</h1>
                <p>
                  Desde el escritorio de tu cuenta puedes ver tus pedidos
                  recientes, gestionar tus direcciones, revisar tus favoritos y
                  actualizar los detalles de tu cuenta.
                </p>
              </section>

              <div className="account-cards">
                <NavLink to="/mi-cuenta/pedidos" className="account-card">
                  <h3>Pedidos</h3>
                  <p>Consulta el estado e historial de tus compras.</p>
                </NavLink>

                <NavLink to="/mi-cuenta/direccion" className="account-card">
                  <h3>Dirección</h3>
                  <p>Administra tus direcciones de envío y facturación.</p>
                </NavLink>

                <NavLink to="/mi-cuenta/detalles" className="account-card">
                  <h3>Detalles de la cuenta</h3>
                  <p>Actualiza tu información personal y contraseña.</p>
                </NavLink>

                <button className="account-card logout-card" onClick={logout}>
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