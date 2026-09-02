import { useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import orderService from "../../../services/orderService";
import { COSTA_RICA_LOCATIONS } from "../../../mnt/data/CostaRicaLocations";
import "../Perfil/Profile.css";

type Address = {
  direccion: string;
  predeterminada?: boolean;
};

type Province = keyof typeof COSTA_RICA_LOCATIONS;

const PROVINCIAS = Object.keys(COSTA_RICA_LOCATIONS) as Province[];
const defaultProvince = PROVINCIAS[0] || ("San José" as Province);

const getCantones = (prov: Province) => {
  if (!Object.prototype.hasOwnProperty.call(COSTA_RICA_LOCATIONS, prov)) {
    return [];
  }

  return Object.keys(COSTA_RICA_LOCATIONS[prov]) as string[];
};

const isProvince = (value: string): value is Province =>
  PROVINCIAS.includes(value as Province);

const isCanton = (prov: Province, value: string) =>
  Object.prototype.hasOwnProperty.call(COSTA_RICA_LOCATIONS[prov], value);

const getDistritos = (prov: Province, cant: string) => {
  if (!Object.prototype.hasOwnProperty.call(COSTA_RICA_LOCATIONS, prov)) {
    return [];
  }

  return isCanton(prov, cant) ? COSTA_RICA_LOCATIONS[prov][cant] : [];
};

const DireccionPage = () => {
  const { user, loadUserProfile } = useAuth();

  const [pais, setPais] = useState("Costa Rica");
  const [provincia, setProvincia] = useState<Province>(defaultProvince);
  const [canton, setCanton] = useState<string>(getCantones(defaultProvince)[0] || "");
  const [distrito, setDistrito] = useState<string>(
    getDistritos(defaultProvince, getCantones(defaultProvince)[0] || "")[0] || ""
  );
  const [calle, setCalle] = useState("");
  const [apartamento, setApartamento] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const direcciones = useMemo(() => user?.direcciones || [], [user?.direcciones]);

  const cantonesDisponibles = useMemo(
    () => getCantones(provincia),
    [provincia]
  );

  const distritosDisponibles = useMemo(
    () => getDistritos(provincia, canton),
    [provincia, canton]
  );

  const guardarDirecciones = async (updatedDirecciones: Address[]) => {
    try {
      setLoading(true);

      await orderService.updateAddresses(updatedDirecciones);

      await loadUserProfile();
      alert("Direcciones actualizadas");
    } catch (error: any) {
      const message = error?.message || "Error al actualizar direcciones";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const construirDireccion = () => {
    const partes = [
      calle.trim(),
      apartamento.trim(),
      distrito.trim(),
      canton.trim(),
      provincia.trim(),
      codigoPostal.trim() ? `CP ${codigoPostal.trim()}` : "",
      pais.trim(),
    ].filter(Boolean);

    return partes.join(", ");
  };

  const limpiarFormulario = () => {
    const primeraProvincia = PROVINCIAS[0] || defaultProvince;
    const primerCanton = getCantones(primeraProvincia)[0] || "";
    const primerDistrito = getDistritos(primeraProvincia, primerCanton)[0] || "";

    setPais("Costa Rica");
    setProvincia(primeraProvincia);
    setCanton(primerCanton);
    setDistrito(primerDistrito);
    setCalle("");
    setApartamento("");
    setCodigoPostal("");
    setEditingIndex(null);
  };

  const parsearDireccion = (direccionCompleta: string) => {
    const partes = direccionCompleta.split(",").map((p) => p.trim());

    const nuevoPais = partes[partes.length - 1] || "Costa Rica";
    const posibleCodigo = partes[partes.length - 2] || "";
    const nuevaProvincia = partes[partes.length - 3] || defaultProvince;
    const nuevoCanton = partes[partes.length - 4] || "";
    const nuevoDistrito = partes[partes.length - 5] || "";
    const posibleApartamento = partes[1] || "";
    const nuevaCalle = partes[0] || "";

    const codigo =
      posibleCodigo.startsWith("CP ") ? posibleCodigo.replace("CP ", "") : "";

    const provinciaValida = isProvince(nuevaProvincia)
      ? nuevaProvincia
      : defaultProvince;

    const cantonesProvincia = getCantones(provinciaValida);
    const cantonValido = isCanton(provinciaValida, nuevoCanton)
      ? nuevoCanton
      : cantonesProvincia[0] || "";

    const distritosCanton = getDistritos(provinciaValida, cantonValido);
    const distritoValido = distritosCanton.includes(nuevoDistrito)
      ? nuevoDistrito
      : distritosCanton[0] || "";

    setPais(nuevoPais || "Costa Rica");
    setProvincia(provinciaValida);
    setCanton(cantonValido);
    setDistrito(distritoValido);
    setCalle(nuevaCalle);
    setApartamento(
      posibleCodigo.startsWith("CP ") ? "" : posibleApartamento
    );
    setCodigoPostal(codigo);
  };

  const handleAgregarOActualizarDireccion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!calle.trim()) {
      alert("Debes escribir la dirección de la calle");
      return;
    }

    const direccionCompleta = construirDireccion();

    const existe = direcciones.some(
      (dir, index) =>
        dir.direccion.trim().toLowerCase() === direccionCompleta.toLowerCase() &&
        index !== editingIndex
    );

    if (existe) {
      alert("Esa dirección ya existe");
      return;
    }

    let updatedDirecciones: Address[] = [];

    if (editingIndex !== null) {
      updatedDirecciones = direcciones.map((dir, index) =>
        index === editingIndex
          ? {
              ...dir,
              direccion: direccionCompleta,
            }
          : dir
      );
    } else {
      updatedDirecciones = [
        ...direcciones,
        {
          direccion: direccionCompleta,
          predeterminada: direcciones.length === 0,
        },
      ];
    }

    await guardarDirecciones(updatedDirecciones);
    limpiarFormulario();
  };

  const handleEditarDireccion = (index: number) => {
    const direccion = direcciones[index];
    if (!direccion) return;

    setEditingIndex(index);
    parsearDireccion(direccion.direccion);
  };

  const handleCancelarEdicion = () => {
    limpiarFormulario();
  };

  const handleSetPredeterminada = async (direccionSeleccionada: string) => {
    const updatedDirecciones = direcciones.map((dir) => ({
      ...dir,
      predeterminada: dir.direccion === direccionSeleccionada,
    }));

    await guardarDirecciones(updatedDirecciones);
  };

  const handleEliminarDireccion = async (direccionSeleccionada: string) => {
    const filtradas = direcciones.filter(
      (dir) => dir.direccion !== direccionSeleccionada
    );

    const updatedDirecciones =
      filtradas.length > 0 && !filtradas.some((dir) => dir.predeterminada)
        ? filtradas.map((dir, index) => ({
            ...dir,
            predeterminada: index === 0,
          }))
        : filtradas;

    await guardarDirecciones(updatedDirecciones);

    if (
      editingIndex !== null &&
      direcciones[editingIndex]?.direccion === direccionSeleccionada
    ) {
      limpiarFormulario();
    }
  };

  return (
    <div className="account-section-page address-page-modern">
      <h1>Direcciones</h1>
      <p>Gestiona tus direcciones de envío y facturación.</p>

      <div className="address-card modern-address-card saved-addresses-card">
        <h3>Direcciones guardadas</h3>

        {direcciones.length === 0 ? (
          <p>No has agregado una dirección todavía.</p>
        ) : (
          <div className="address-list compact-address-list">
            {direcciones.map((dir, index) => (
              <div
                key={`${dir.direccion}-${index}`}
                className={`saved-address-item compact-address-item ${
                  dir.predeterminada ? "is-default" : ""
                }`}
              >
                <div className="saved-address-content">
                  <p>{dir.direccion}</p>
                  {dir.predeterminada && (
                    <span className="default-badge">Predeterminada</span>
                  )}
                </div>

                <div className="saved-address-actions compact-address-actions">
                  <button
                    type="button"
                    className="account-btn secondary-btn"
                    onClick={() => handleEditarDireccion(index)}
                    disabled={loading}
                  >
                    Editar
                  </button>

                  {!dir.predeterminada && (
                    <button
                      type="button"
                      className="account-btn secondary-btn"
                      onClick={() => handleSetPredeterminada(dir.direccion)}
                      disabled={loading}
                    >
                      Principal
                    </button>
                  )}

                  <button
                    type="button"
                    className="account-btn danger-btn"
                    onClick={() => handleEliminarDireccion(dir.direccion)}
                    disabled={loading}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="address-card modern-address-card add-address-card">
        <h3>
          {editingIndex !== null
            ? "Actualizar dirección"
            : "Agregar nueva dirección"}
        </h3>

        <form
          className="modern-address-form compact-address-form"
          onSubmit={handleAgregarOActualizarDireccion}
        >
          <div className="profile-field">
            <label htmlFor="pais">
              País / Región <span>*</span>
            </label>
            <select
              id="pais"
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="modern-select"
            >
              <option value="Costa Rica">Costa Rica</option>
            </select>
          </div>

          <div className="profile-field">
            <label htmlFor="provincia">
              Provincia <span>*</span>
            </label>
            <select
              id="provincia"
              value={provincia}
              onChange={(e) => {
                const nuevaProvincia = e.target.value;
                if (!isProvince(nuevaProvincia)) return;

                const cantonInicial = getCantones(nuevaProvincia)[0] || "";
                const nuevosDistritos = getDistritos(nuevaProvincia, cantonInicial);

                setProvincia(nuevaProvincia);
                setCanton(cantonInicial);
                setDistrito(nuevosDistritos[0] || "");
              }}
              className="modern-select"
            >
              {PROVINCIAS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="profile-field">
            <label htmlFor="canton">
              Cantón <span>*</span>
            </label>
            <select
              id="canton"
              value={canton}
              onChange={(e) => {
                const nuevoCanton = e.target.value;
                if (!isCanton(provincia, nuevoCanton)) return;

                const nuevosDistritos = getDistritos(provincia, nuevoCanton);

                setCanton(nuevoCanton);
                setDistrito(nuevosDistritos[0] || "");
              }}
              className="modern-select"
            >
              {cantonesDisponibles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="profile-field">
            <label htmlFor="distrito">
              Distrito <span>*</span>
            </label>
            <select
              id="distrito"
              value={distrito}
              onChange={(e) => setDistrito(e.target.value)}
              className="modern-select"
            >
              {distritosDisponibles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="profile-field">
            <label htmlFor="calle">
              Dirección de la calle <span>*</span>
            </label>
            <input
              id="calle"
              type="text"
              value={calle}
              onChange={(e) => setCalle(e.target.value)}
              placeholder="Dirección exacta"
              className="modern-input"
              required
            />
          </div>

          <div className="profile-field">
            <label htmlFor="codigoPostal">
              Código postal / ZIP{" "}
              <span className="optional-text">(opcional)</span>
            </label>
            <input
              id="codigoPostal"
              type="text"
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
              placeholder="Código postal"
              className="modern-input"
            />
          </div>

          <div className="address-form-actions">
            <button type="submit" className="account-btn" disabled={loading}>
              {loading
                ? editingIndex !== null
                  ? "ACTUALIZANDO..."
                  : "GUARDANDO..."
                : editingIndex !== null
                ? "ACTUALIZAR DIRECCIÓN"
                : "GUARDAR DIRECCIÓN"}
            </button>

            {editingIndex !== null && (
              <button
                type="button"
                className="account-btn secondary-btn"
                onClick={handleCancelarEdicion}
                disabled={loading}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default DireccionPage;