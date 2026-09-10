import { useMemo, useState } from "react";
import {
  HiOutlineUserCircle,
  HiOutlineIdentification,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { useAuth } from "../../../context/AuthContext";
import { changePassword } from "../../../services/authService";
import { toastSuccess, toastError } from "../../../components/Notify/notify";
import "../Perfil/Profile.css";

const DetallesPerfilPage = () => {
  const { user, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  const { nombre, apellidos, nombreVisible } = useMemo(() => {
    const fullName = user?.nombre_completo?.trim() || "";
    const parts = fullName.split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return {
        nombre: "",
        apellidos: "",
        nombreVisible: "",
      };
    }

    if (parts.length === 1) {
      return {
        nombre: parts[0],
        apellidos: "",
        nombreVisible: parts[0],
      };
    }

    if (parts.length === 2) {
      return {
        nombre: parts[0],
        apellidos: parts[1],
        nombreVisible: `${parts[0]} ${parts[1]}`,
      };
    }

    if (parts.length === 3) {
      // "Nombre Apellido1 Apellido2": el nombre es una sola palabra y los
      // apellidos son las otras dos, no al revés.
      return {
        nombre: parts[0],
        apellidos: `${parts[1]} ${parts[2]}`,
        nombreVisible: `${parts[0]} ${parts[1]}`,
      };
    }

    const firstName = parts[0];
    const firstSurname = parts[parts.length - 2];
    const apellidosCalculados = parts.slice(-2).join(" ");
    const nombresCalculados = parts.slice(0, -2).join(" ");

    return {
      nombre: nombresCalculados,
      apellidos: apellidosCalculados,
      nombreVisible: `${firstName} ${firstSurname}`,
    };
  }, [user?.nombre_completo]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toastError("Completa todos los campos de contraseña");
      return;
    }

    if (newPassword.length < 10) {
      toastError("La nueva contraseña debe tener mínimo 10 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError("La nueva contraseña y la confirmación no coinciden");
      return;
    }

    try {
      setLoadingPassword(true);

      const response = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toastSuccess(
        response?.message ||
          "Contraseña actualizada correctamente. Debes iniciar sesión de nuevo."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Antes esto pasaba recién al cerrar el `alert()` nativo (bloqueante);
      // con un toast (no bloqueante) hay que darle un respiro a mano para
      // que el mensaje se alcance a leer antes de la redirección.
      window.setTimeout(() => {
        logout();
        window.location.href = "/login";
      }, 1500);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Error al cambiar la contraseña";
      toastError(message);
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="account-section-page profile-details-page">
      <header className="account-subpage-header">
        <span className="account-subpage-icon">
          <HiOutlineUserCircle aria-hidden="true" />
        </span>
        <div>
          <h1>Detalles de la cuenta</h1>
          <p>Tu información personal y la contraseña de acceso a tu cuenta.</p>
        </div>
      </header>

      <form className="profile-details-form">
        <div className="profile-grid-two">
          <div className="profile-field">
            <label htmlFor="nombre">
              Nombre <span>*</span>
            </label>
            <div className="profile-field-icon">
              <HiOutlineIdentification aria-hidden="true" />
              <input
                id="nombre"
                type="text"
                value={nombre}
                readOnly
                placeholder="Nombre"
              />
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="apellidos">
              Apellidos <span>*</span>
            </label>
            <div className="profile-field-icon">
              <HiOutlineIdentification aria-hidden="true" />
              <input
                id="apellidos"
                type="text"
                value={apellidos}
                readOnly
                placeholder="Apellidos"
              />
            </div>
          </div>
        </div>

        <div className="profile-field">
          <label htmlFor="nombreVisible">
            Nombre visible <span>*</span>
          </label>
          <div className="profile-field-icon">
            <HiOutlineUserCircle aria-hidden="true" />
            <input
              id="nombreVisible"
              type="text"
              value={nombreVisible}
              readOnly
              placeholder="Nombre visible"
            />
          </div>
          <small>
            Así será como se mostrará tu nombre en la sección de tu cuenta.
          </small>
        </div>

        <div className="profile-field">
          <label htmlFor="correo">
            Dirección de correo electrónico <span>*</span>
          </label>
          <div className="profile-field-icon">
            <HiOutlineEnvelope aria-hidden="true" />
            <input
              id="correo"
              type="email"
              value={user?.correo || ""}
              readOnly
              placeholder="Correo electrónico"
            />
          </div>
        </div>
      </form>

      <div className="profile-password-box">
        <h2>
          <HiOutlineLockClosed aria-hidden="true" style={{ marginRight: "0.5em" }} />
          Cambio de contraseña
        </h2>

        <form className="profile-password-form" onSubmit={handleChangePassword}>
          <div className="profile-field">
            <label htmlFor="currentPassword">Contraseña actual</label>
            <div className="profile-field-icon">
              <HiOutlineLockClosed aria-hidden="true" />
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="newPassword">Nueva contraseña</label>
            <div className="profile-field-icon">
              <HiOutlineLockClosed aria-hidden="true" />
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa tu nueva contraseña"
                required
              />
            </div>
          </div>

          <div className="profile-field">
            <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
            <div className="profile-field-icon">
              <HiOutlineLockClosed aria-hidden="true" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="account-btn"
            disabled={loadingPassword}
          >
            {loadingPassword ? "ACTUALIZANDO..." : "GUARDAR CAMBIOS"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DetallesPerfilPage;