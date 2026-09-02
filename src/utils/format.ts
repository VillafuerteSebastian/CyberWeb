/**
 * Formatea un monto en colones con punto como separador de miles
 * (ej: 15000 -> "15.000"), sin depender del locale del navegador
 * del usuario (que puede mostrar comas o espacios según su idioma/SO).
 */
export const formatPrice = (value: number): string => {
  const rounded = Math.round(value || 0);
  const withDots = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `₡${withDots}`;
};
