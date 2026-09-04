import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { HiChevronDown } from "react-icons/hi2";
import { HiAdjustmentsHorizontal, HiXMark } from "react-icons/hi2";
import productService, { getEffectivePrice, isOnSale } from "../../services/productService";
import { formatPrice } from "../../utils/format";
import "./CategoryPage.css";

type ProductType = {
  tipo: string;
};

type Product = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  precio_oferta?: number | null;
  categoria: string;
  marca: string;
  tipos: ProductType[];
  stock: number;
  image?: string;
};

const prettifySlug = (value?: string) => {
  if (!value) return "";
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const CategoryPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const categoria = searchParams.get("categoria") || "";
  const subcategoria = searchParams.get("subcategoria") || "";
  const tipo = searchParams.get("tipo") || "";
  const search = searchParams.get("search") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros dinámicos locales
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(subcategoria || "");
  const [selectedTipo, setSelectedTipo] = useState(tipo || "");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortOrder, setSortOrder] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Acordeón de secciones del sidebar de filtros
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    ordenar: true,
    marca: true,
    subcategoria: true,
    tipo: true,
    precio: true,
    disponibilidad: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    setSelectedSubcategoria(subcategoria || "");
  }, [subcategoria]);

  useEffect(() => {
    setSelectedTipo(tipo || "");
  }, [tipo]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const response = await productService.getProducts({
          page: 1,
          limit: 100,
          categoria: categoria || undefined,
        });

        const rawProducts = response.data;

        const formattedProducts: Product[] = rawProducts.map((product: any) => ({
          id: String(product.id || product._id || ""),
          nombre: product.nombre || "",
          descripcion: product.descripcion || "",
          precio: Number(product.precio ?? 0),
          precio_oferta:
            product.precio_oferta !== null && product.precio_oferta !== undefined
              ? Number(product.precio_oferta)
              : null,
          categoria: product.categoria || "",
          marca: product.marca || "",
          tipos: Array.isArray(product.tipos) ? product.tipos : [],
          stock: Number(product.stock ?? 0),
          image: product.image || "/placeholder-product.png",
        }));

        setProducts(formattedProducts);
      } catch (error) {
        console.error("Error al cargar productos:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoria]);

  // Opciones dinámicas de filtros según productos cargados
  const availableBrands = useMemo(() => {
    return [...new Set(products.map((p) => p.marca).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [products]);

  const availableSubcategorias = useMemo(() => {
    return [
      ...new Set(
        products
          .map((p) => (Array.isArray(p.tipos) ? p.tipos[0]?.tipo : ""))
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const availableTipos = useMemo(() => {
    let baseProducts = [...products];

    if (selectedSubcategoria) {
      baseProducts = baseProducts.filter(
        (p) => (Array.isArray(p.tipos) ? p.tipos[0]?.tipo : "") === selectedSubcategoria
      );
    }

    return [
      ...new Set(
        baseProducts
          .map((p) => (Array.isArray(p.tipos) ? p.tipos[1]?.tipo : ""))
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [products, selectedSubcategoria]);

  const priceRange = useMemo(() => {
    if (!products.length) {
      return { min: 0, max: 0 };
    }

    const prices = products.map((p) => p.precio).filter((price) => !isNaN(price));
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    result = result.filter((product) => {
      const tipos = Array.isArray(product.tipos) ? product.tipos : [];
      const productSubcategoria = tipos[0]?.tipo || "";
      const productTipoFinal = tipos[1]?.tipo || "";

      // filtros que vienen desde URL o seleccionados
      if (selectedSubcategoria && productSubcategoria !== selectedSubcategoria) {
        return false;
      }

      if (selectedTipo && productTipoFinal !== selectedTipo) {
        return false;
      }

      if (selectedBrand && product.marca !== selectedBrand) {
        return false;
      }

      if (minPrice && product.precio < Number(minPrice)) {
        return false;
      }

      if (maxPrice && product.precio > Number(maxPrice)) {
        return false;
      }

      if (onlyInStock && product.stock <= 0) {
        return false;
      }

      if (search) {
        const term = search.toLowerCase().trim();

        const matchesNombre = product.nombre.toLowerCase().includes(term);
        const matchesDescripcion = product.descripcion.toLowerCase().includes(term);
        const matchesMarca = product.marca.toLowerCase().includes(term);
        const matchesCategoria = product.categoria.toLowerCase().includes(term);
        const matchesTipos = tipos.some((item) =>
          item.tipo.toLowerCase().includes(term)
        );

        if (
          !matchesNombre &&
          !matchesDescripcion &&
          !matchesMarca &&
          !matchesCategoria &&
          !matchesTipos
        ) {
          return false;
        }
      }

      return true;
    });

    if (sortOrder === "price-asc") {
      result.sort((a, b) => a.precio - b.precio);
    } else if (sortOrder === "price-desc") {
      result.sort((a, b) => b.precio - a.precio);
    } else if (sortOrder === "name-asc") {
      result.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (sortOrder === "name-desc") {
      result.sort((a, b) => b.nombre.localeCompare(a.nombre));
    }

    return result;
  }, [
    products,
    selectedSubcategoria,
    selectedTipo,
    selectedBrand,
    minPrice,
    maxPrice,
    onlyInStock,
    sortOrder,
    search,
  ]);

  const pageTitle = useMemo(() => {
    if (search) {
      return `Resultados para "${search}"`;
    }

    if (categoria && selectedSubcategoria && selectedTipo) {
      return `${prettifySlug(categoria)} - ${prettifySlug(selectedTipo)}`;
    }

    if (categoria && selectedSubcategoria) {
      return `${prettifySlug(categoria)} - ${prettifySlug(selectedSubcategoria)}`;
    }

    if (categoria) {
      return prettifySlug(categoria);
    }

    return "Catálogo";
  }, [categoria, selectedSubcategoria, selectedTipo, search]);

  const breadcrumb = useMemo(() => {
    if (search) {
      return `Inicio / Búsqueda / ${search}`;
    }

    let text = "Inicio";

    if (categoria) text += ` / ${prettifySlug(categoria)}`;
    if (selectedSubcategoria) text += ` / ${prettifySlug(selectedSubcategoria)}`;
    if (selectedTipo) text += ` / ${prettifySlug(selectedTipo)}`;

    return text;
  }, [categoria, selectedSubcategoria, selectedTipo, search]);

  const FilterSection = ({
    id,
    title,
    children,
  }: {
    id: string;
    title: string;
    children: ReactNode;
  }) => {
    const isOpen = openSections[id] !== false;

    return (
      <div className={`filter-section ${isOpen ? "open" : ""}`}>
        <button
          type="button"
          className="filter-section-toggle"
          onClick={() => toggleSection(id)}
          aria-expanded={isOpen}
        >
          <span>{title}</span>
          <HiChevronDown className="filter-section-chevron" />
        </button>

        {isOpen && <div className="filter-section-body">{children}</div>}
      </div>
    );
  };

  const activeFilterCount = [
    selectedBrand,
    selectedSubcategoria,
    selectedTipo,
    minPrice,
    maxPrice,
    sortOrder,
    onlyInStock ? "stock" : "",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedBrand("");
    setSelectedSubcategoria(subcategoria || "");
    setSelectedTipo(tipo || "");
    setMinPrice("");
    setMaxPrice("");
    setOnlyInStock(false);
    setSortOrder("");
  };

return (
  <div className="category-page">
    <div className="category-page-header">
      <p className="category-breadcrumb">{breadcrumb}</p>
      <h1>{pageTitle}</h1>
      <p className="category-count">
        {loading
          ? "Cargando productos..."
          : `${filteredProducts.length} producto${
              filteredProducts.length !== 1 ? "s" : ""
            }`}
      </p>
    </div>

    {!loading && products.length > 0 && (
      <div className="mobile-filters-bar">
        <button
          type="button"
          className="mobile-filters-toggle"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <HiAdjustmentsHorizontal />
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span className="mobile-filters-count">{activeFilterCount}</span>
          )}
        </button>

        <select
          className="mobile-sort-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          aria-label="Ordenar por"
        >
          <option value="">Ordenar: relevancia</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="name-asc">Nombre: A-Z</option>
          <option value="name-desc">Nombre: Z-A</option>
        </select>
      </div>
    )}

    {mobileFiltersOpen && (
      <div
        className="mobile-filters-backdrop"
        onClick={() => setMobileFiltersOpen(false)}
      />
    )}

    <div className="category-layout">
      {!loading && products.length > 0 && (
        <aside className={`filters-sidebar ${mobileFiltersOpen ? "mobile-open" : ""}`}>
          <div className="filters-sidebar-header">
            <h3>Filtros</h3>
            <div className="filters-sidebar-header-actions">
              <button className="reset-filters-btn" onClick={resetFilters}>
                Limpiar
              </button>
              <button
                type="button"
                className="mobile-filters-close"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Cerrar filtros"
              >
                <HiXMark />
              </button>
            </div>
          </div>

          <FilterSection id="ordenar" title="Ordenar por">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="">Sin ordenar</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="name-asc">Nombre: A-Z</option>
              <option value="name-desc">Nombre: Z-A</option>
            </select>
          </FilterSection>

          {availableBrands.length > 0 && (
            <FilterSection id="marca" title="Marca">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <option value="">Todas</option>
                {availableBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </FilterSection>
          )}

          {availableSubcategorias.length > 0 && (
            <FilterSection id="subcategoria" title="Subcategoría">
              <select
                value={selectedSubcategoria}
                onChange={(e) => {
                  setSelectedSubcategoria(e.target.value);
                  setSelectedTipo("");
                }}
              >
                <option value="">Todas</option>
                {availableSubcategorias.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterSection>
          )}

          {availableTipos.length > 0 && (
            <FilterSection id="tipo" title="Tipo">
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
              >
                <option value="">Todos</option>
                {availableTipos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterSection>
          )}

          <FilterSection id="precio" title="Precio">
            <div className="filter-price-row">
              <input
                type="number"
                min={priceRange.min}
                max={priceRange.max}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder={formatPrice(priceRange.min)}
              />
              <span className="filter-price-sep">–</span>
              <input
                type="number"
                min={priceRange.min}
                max={priceRange.max}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={formatPrice(priceRange.max)}
              />
            </div>
          </FilterSection>

          <FilterSection id="disponibilidad" title="Disponibilidad">
            <label className="filter-check-inline">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
              />
              Solo disponibles
            </label>
          </FilterSection>

          <button
            type="button"
            className="mobile-filters-apply"
            onClick={() => setMobileFiltersOpen(false)}
          >
            Ver {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
          </button>
        </aside>
      )}

      <div className="category-content">
        {loading ? (
          <div className="empty-category">
            <h2>Cargando productos...</h2>
            <p>Espera un momento mientras se obtiene el catálogo.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-category">
            <h2>No hay productos con esos filtros</h2>
            <p>Prueba con otra combinación de marca, precio o tipo.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => {
              const onSale = isOnSale(product.precio, product.precio_oferta);
              const effectivePrice = getEffectivePrice(product.precio, product.precio_oferta);

              return (
                <Link
                  to={`/product/${product.id}`}
                  state={{ from: location.pathname + location.search }}
                  className="product-card"
                  key={product.id}
                >
                  <div className="product-card-image-wrap">
                    {onSale && (
                      <span className="product-sale-badge">
                        -{Math.round(((product.precio - effectivePrice) / product.precio) * 100)}%
                      </span>
                    )}
                    <img
                      src={product.image || "/placeholder-product.png"}
                      alt={product.nombre}
                      className="product-card-image"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-product.png";
                      }}
                    />
                  </div>

                  <p className="product-brand">{product.marca}</p>
                  <h3>{product.nombre}</h3>
                  {onSale ? (
                    <p className="product-price">
                      <span className="product-price-old">
                        {formatPrice(product.precio)}
                      </span>{" "}
                      {formatPrice(effectivePrice)}
                    </p>
                  ) : (
                    <p className="product-price">
                      {formatPrice(product.precio)}
                    </p>
                  )}

                  <span className="add-cart-btn">Ver producto</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default CategoryPage;