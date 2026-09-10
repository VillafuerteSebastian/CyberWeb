import { useEffect, useState } from "react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiXMark,
} from "react-icons/hi2";
import "./notify.css";

// Reemplazo propio de `alert()`/`window.confirm()`: son ventanas nativas del
// navegador, no se pueden estilar, bloquean el hilo principal y se ven
// distintas en cada sistema operativo. Este módulo expone las mismas dos
// operaciones (avisar algo, pedir confirmación) pero renderizadas con el
// diseño del sitio.
//
// Se usa un pub/sub a nivel de módulo (en vez de Context) para que
// cualquier archivo pueda hacer `toastError(...)` o `await confirmDialog(...)`
// con un simple import, sin tener que envolver cada página en un Provider.
// `<NotificationCenter />` se monta una sola vez en App.tsx y es quien
// efectivamente dibuja los toasts/el modal cuando estas funciones se llaman.

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

export type ConfirmOptions = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  /** Pinta el botón de confirmar en rojo — usar para acciones destructivas (eliminar). */
  danger?: boolean;
};

type ConfirmRequest = ConfirmOptions & {
  id: number;
  message: string;
  resolve: (value: boolean) => void;
};

let idCounter = 0;
let toastListener: ((toast: Toast) => void) | null = null;
let confirmListener: ((request: ConfirmRequest) => void) | null = null;

const emitToast = (type: ToastType, message: string) => {
  const toast: Toast = { id: ++idCounter, type, message };

  if (toastListener) {
    toastListener(toast);
  } else {
    // No debería pasar (NotificationCenter se monta una vez en App.tsx),
    // pero si por lo que sea no está montado todavía, que el mensaje no se
    // pierda en silencio.
    console.warn("NotificationCenter no está montado, toast perdido:", message);
  }
};

/** Aviso de que algo salió bien (reemplaza `alert("... correctamente")`). */
export const toastSuccess = (message: string) => emitToast("success", message);

/** Aviso de error o validación fallida (reemplaza `alert(error.message)`). */
export const toastError = (message: string) => emitToast("error", message);

/** Aviso neutro, sin connotación de éxito/error. */
export const toastInfo = (message: string) => emitToast("info", message);

/**
 * Reemplazo de `window.confirm(message)`: devuelve una Promise<boolean> en
 * vez de bloquear el hilo, así que todo llamador necesita `await`.
 */
export const confirmDialog = (
  message: string,
  options: ConfirmOptions = {}
): Promise<boolean> => {
  return new Promise((resolve) => {
    const request: ConfirmRequest = { id: ++idCounter, message, resolve, ...options };

    if (confirmListener) {
      confirmListener(request);
    } else {
      // Red de seguridad: si por lo que sea el centro no está montado,
      // mejor un confirm nativo que perder la confirmación y borrar algo sin
      // preguntar.
      console.warn("NotificationCenter no está montado, se usa confirm nativo.");
      resolve(window.confirm(message));
    }
  });
};

const TOAST_DURATION_MS = 4500;

const TOAST_ICON: Record<ToastType, React.ReactNode> = {
  success: <HiCheckCircle />,
  error: <HiExclamationCircle />,
  info: <HiInformationCircle />,
};

/** Se monta una sola vez, cerca de la raíz de la app (ver App.tsx). */
export const NotificationCenter = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    toastListener = (toast) => {
      setToasts((prev) => [...prev, toast]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, TOAST_DURATION_MS);
    };

    confirmListener = (request) => setConfirmRequest(request);

    return () => {
      toastListener = null;
      confirmListener = null;
    };
  }, []);

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const resolveConfirm = (result: boolean) => {
    confirmRequest?.resolve(result);
    setConfirmRequest(null);
  };

  return (
    <>
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            <span className="toast-icon" aria-hidden="true">
              {TOAST_ICON[toast.type]}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Cerrar aviso"
            >
              <HiXMark />
            </button>
          </div>
        ))}
      </div>

      {confirmRequest && (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => resolveConfirm(false)}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label={confirmRequest.title || "Confirmar"}
            onClick={(e) => e.stopPropagation()}
          >
            {confirmRequest.title && (
              <h3 className="confirm-title">{confirmRequest.title}</h3>
            )}
            <p className="confirm-message">{confirmRequest.message}</p>

            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-btn confirm-btn--cancel"
                onClick={() => resolveConfirm(false)}
              >
                {confirmRequest.cancelText || "Cancelar"}
              </button>
              <button
                type="button"
                className={`confirm-btn confirm-btn--confirm ${
                  confirmRequest.danger ? "confirm-btn--danger" : ""
                }`}
                onClick={() => resolveConfirm(true)}
              >
                {confirmRequest.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
