import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../auth/Auth.css";

const Login = () => {
  const navigate = useNavigate();
  const { loadUserProfile } = useAuth();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await loginUser({
        correo,
        password,
      });

      if (response?.data?.access_token) {
        await loadUserProfile();
        navigate("/");
      } else {
        alert("No se pudo iniciar sesión");
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Error al iniciar sesión";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-page-wrapper">
        <div className="auth-page-left">
          <h2>Acceder</h2>

          <form className="auth-page-form" onSubmit={handleSubmit}>
            <input
              className="auth-page-input"
              type="email"
              placeholder="Correo electrónico"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />

            <div className="password-input-container">
              <input
                className="auth-page-input"
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="submit"
              className="auth-btn-primary"
              disabled={loading}
            >
              {loading ? "INGRESANDO..." : "LOG IN"}
            </button>
          </form>
        </div>

        <div className="auth-page-divider"></div>

        <div className="auth-page-right">
          <h2>Registro</h2>
          <p>
            Al registrarte podrás acceder al estado y al historial de tus
            pedidos.
          </p>

          <button
            className="auth-btn-secondary"
            onClick={() => navigate("/register")}
          >
            REGISTRARSE
          </button>
        </div>
      </div>

    </div>
  );
};

export default Login;