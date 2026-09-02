import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../services/authService";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../auth/Auth.css";

const Register = () => {
  const navigate = useNavigate();

  const [cedula, setCedula] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 10) {
      alert("La contraseña debe tener mínimo 10 caracteres");
      return;
    }

    // eslint-disable-next-line security/detect-possible-timing-attacks
    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);

      const response = await registerUser({
        cedula,
        nombre_completo: nombreCompleto,
        correo,
        telefono,
        password,
        confirm_password: confirmPassword,
        role: "USER",
      });

      alert(response?.message || "Usuario registrado correctamente");
      navigate("/login");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Error al registrar usuario";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-page-wrapper">
        <div className="auth-page-left">
          <h2>Registrarse</h2>

          <form className="auth-page-form" onSubmit={handleSubmit}>
            <input
              className="auth-page-input"
              type="text"
              placeholder="Cédula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              required
            />

            <input
              className="auth-page-input"
              type="text"
              placeholder="Nombre Completo"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
            />

            <input
              className="auth-page-input"
              type="email"
              placeholder="Correo Electrónico"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />

            <input
              className="auth-page-input"
              type="text"
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
            />

            <div className="password-input-container">
              <input
                className="auth-page-input"
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña (mínimo 10 caracteres)"
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

            <div className="password-input-container">
              <input
                className="auth-page-input"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmar Contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="submit"
              className="auth-btn-primary"
              disabled={loading}
            >
              {loading ? "REGISTRANDO..." : "REGISTRARSE"}
            </button>
          </form>
        </div>

        <div className="auth-page-divider"></div>

        <div className="auth-page-right">
          <h2>¿Ya tienes cuenta?</h2>
          <p>Si ya estás registrado puedes acceder desde aquí.</p>

          <button
            className="auth-btn-secondary"
            onClick={() => navigate("/login")}
          >
            ACCEDER
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;