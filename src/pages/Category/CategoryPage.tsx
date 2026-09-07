import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { HiChevronDown } from "react-icons/hi2";
import { HiAdjustmentsHorizontal, HiXMark } from "react-icons/hi2";
import productService, { getEffectivePrice, isOnSale } from "../../services/productService";
import categoryService, { type ArbolCategoria } from "../../services/categoryService";
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
  // Todas las combinaciones subcategoría+tipo bajo las que este producto
  // aplica a la categoría que se está viendo: su asignación principal (si
  // `categoria` es la suya) más una entrada por cada categoría adicional que
  // coincida. Un producto puede tener varias bajo la misma categoría (ej.
  // "Instrumento" en dos subcategorías/tipos distintos a la vez), así que no
  // alcanza con guardar una sola — si no, los filtros de subcategoría/tipo
  // solo "ven" la primera y las demás quedan sin productos.
  asignaciones: ProductType[][];
  // Atributos filtrables de libre formato (ej: "Conexión" -> "USB"), ajenos
  // al árbol categoria/subcategoria/tipo. Varias entradas con el mismo
  // nombre representan varios valores a la vez (ej: un mouse con USB y
  // Bluetooth).
  atributos: { nombre: string; valor: string }[];
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

  // Árbol de categorías (categoria -> subcategorias -> tipos) con sus nombres
  // visibles (nombre_categoria, nombre_subcategoria, nombre_tipo), para
  // mostrar en pantalla el nombre real en vez del id/slug que se usa en la
  // URL de búsqueda (ej. "audio-video" en la URL, "Audio y Video" en pantalla).
  const [categoryTree, setCategoryTree] = useState<ArbolCategoria[]>([]);

  useEffect(() => {
    categoryService
      .getCategoryTree()
      .then(setCategoryTree)
      .catch((error) => {
        console.error("Error al cargar nombres de categorías:", error);
        setCategoryTree([]);
      });
  }, []);

  // Filtros dinámicos locales
  // Marca es multi-selección (checkboxes), igual que los atributos: podés
  // marcar varias marcas a la vez y ver productos de cualquiera de ellas.
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(subcategoria || "");
  const [selectedTipo, setSelectedTipo] = useState(tipo || "");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Valores marcados por atributo (ej: { "Conexión": ["USB", "Bluetooth"] }).
  // Multi-selección: dentro de un mismo atributo es "o" (cualquiera de los
  // marcados), entre atributos distintos es "y" (tiene que cumplir todos).
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});

  const toggleAttributeValue = (nombre: string, valor: string) => {
    setSelectedAttributes((prev) => {
      const current = prev[nombre] || [];
      const next = current.includes(valor)
        ? current.filter((v) => v !== valor)
        : [...current, valor];

      if (next.length === 0) {
        const { [nombre]: _omit, ...rest } = prev;
        return rest;
      }

      return { ...prev, [nombre]: next };
    });
  };

  const toggleBrand = (marca: string) => {
    setSelectedBrands((prev) =>
      prev.includes(marca) ? prev.filter((m) => m !== marca) : [...prev, marca]
    );
  };

  // Acordeón de secciones del sidebar de filtros
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    ordenar: true,
    marca: true,
    subcategoria: true,
    tipo: true,
    precio: true,
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

        let rawProducts: any[] = [];

        if (categoria) {
          // Trae los productos con esta categoría como principal Y los que
          // la tengan entre sus categorías adicionales.
          rawProducts = await productService.getProductsByCategoria(categoria);
        } else {
          const PAGE_SIZE = 100;
          let page = 1;

          while (true) {
            const response = await productService.getProducts({ page, limit: PAGE_SIZE });
            rawProducts = rawProducts.concat(response.data);

            if (!response.hasMore) break;
            page += 1;
          }
        }

        const formattedProducts: Product[] = rawProducts.map((product: any) => {
          // Reúne TODAS las asignaciones (subcategoría+tipo) del producto que
          // apliquen a la categoría que se está viendo: la principal (si es
          // suya) y cada categoría adicional que coincida — puede haber más
          // de una bajo la misma categoría.
          const categoriasExtra = Array.isArray(product.categorias_extra)
            ? product.categorias_extra
            : [];

          const asignaciones: ProductType[][] = [];

          if (!categoria || product.categoria === categoria) {
            asignaciones.push(Array.isArray(product.tipos) ? product.tipos : []);
          }

          if (categoria) {
            categoriasExtra
              .filter((extra: { categoria: string }) => extra.categoria === categoria)
              .forEach((extra: { tipos?: ProductType[] }) => {
                asignaciones.push(Array.isArray(extra.tipos) ? extra.tipos : []);
              });
          }

          // No debería pasar (el producto llegó filtrado por esta categoría),
          // pero por si acaso no se encontró ninguna asignación que coincida,
          // se usa su propio `tipos` como respaldo.
          if (asignaciones.length === 0) {
            asignaciones.push(Array.isArray(product.tipos) ? product.tipos : []);
          }

          return {
            id: String(product.id || product._id || ""),
            nombre: product.nombre || "",
            descripcion: product.descripcion || "",
            precio: Number(product.precio ?? 0),
            precio_oferta:
              product.precio_oferta !== null && product.precio_oferta !== undefined
                ? Number(product.precio_oferta)
                : null,
            categoria: categoria || product.categoria || "",
            marca: product.marca || "",
            asignaciones,
            atributos: Array.isArray(product.atributos) ? product.atributos : [],
            stock: Number(product.stock ?? 0),
            image: product.image || "/placeholder-product.png",
          };
        });

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

  // Atributos disponibles según los productos cargados, agrupados por
  // nombre con sus valores únicos (ej: { "Conexión": ["Bluetooth", "USB"] }).
  // Solo aparecen los atributos que realmente tiene algún producto de esta
  // categoría — no es una lista fija.
  const availableAttributes = useMemo(() => {
    const grouped: Record<string, Set<string>> = {};

    products.forEach((product) => {
      product.atributos.forEach(({ nombre, valor }) => {
        if (!nombre || !valor) return;
        if (!grouped[nombre]) grouped[nombre] = new Set();
        grouped[nombre].add(valor);
      });
    });

    return Object.fromEntries(
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([nombre, valores]) => [nombre, Array.from(valores).sort((a, b) => a.localeCompare(b))])
    );
  }, [products]);

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
          .flatMap((p) => p.asignaciones)
          .map((tipos) => tipos[0]?.tipo || "")
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const availableTipos = useMemo(() => {
    let asignaciones = products.flatMap((p) => p.asignaciones);

    if (selectedSubcategoria) {
      asignaciones = asignaciones.filter((tipos) => (tipos[0]?.tipo || "") === selectedSubcategoria);
    }

    return [
      ...new Set(asignaciones.map((tipos) => tipos[1]?.tipo || "").filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));
  }, [products, selectedSubcategoria]);

  // Nodo de la categoría actual dentro del árbol, y helpers para resolver el
  // nombre visible de una subcategoría/tipo a partir de su slug. El id/slug
  // de la URL es solo para buscar — en pantalla siempre debe verse el nombre
  // guardado en la tabla `categorias` (con fallback a una versión legible del
  // slug si esa categoría ya no existe en el árbol, ej. una borrada).
  const categoriaInfo = useMemo(
    () => categoryTree.find((c) => c.categoria === categoria),
    [categoryTree, categoria]
  );

  const categoriaNombre = categoriaInfo?.nombre_categoria || prettifySlug(categoria);

  const getSubcategoriaNombre = useCallback(
    (subcategoriaSlug: string) =>
      categoriaInfo?.subcategorias?.[subcategoriaSlug]?.nombre || prettifySlug(subcategoriaSlug),
    [categoriaInfo]
  );

  const getTipoNombre = useCallback(
    (tipoSlug: string, subcategoriaSlug?: string) => {
      if (!categoriaInfo) return prettifySlug(tipoSlug);

      const subcategoriasAConsultar = subcategoriaSlug
        ? [categoriaInfo.subcategorias[subcategoriaSlug]].filter(Boolean)
        : Object.values(categoriaInfo.subcategorias);

      for (const sub of subcategoriasAConsultar) {
        const encontrado = sub?.tipos.find((t) => t.tipo === tipoSlug);
        if (encontrado) return encontrado.nombre;
      }

      return prettifySlug(tipoSlug);
    },
    [categoriaInfo]
  );

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
      // El producto pasa el filtro de subcategoría/tipo si CUALQUIERA de sus
      // asignaciones a esta categoría calza (no solo la primera) — así una
      // categoría adicional que no sea la primera de la lista no queda
      // invisible para los filtros.
      const matchesAlgunaAsignacion = product.asignaciones.some((tipos) => {
        const productSubcategoria = tipos[0]?.tipo || "";
        const productTipoFinal = tipos[1]?.tipo || "";

        if (selectedSubcategoria && productSubcategoria !== selectedSubcategoria) return false;
        if (selectedTipo && productTipoFinal !== selectedTipo) return false;

        return true;
      });

      if (!matchesAlgunaAsignacion) {
        return false;
      }

      if (selectedBrands.length > 0 && !selectedBrands.includes(product.marca)) {
        return false;
      }

      // Por cada atributo con valores marcados, el producto tiene que tener
      // AL MENOS UNO de esos valores (dentro del atributo es "o"); tiene que
      // cumplir esto para TODOS los atributos con selección a la vez
      // (entre atributos distintos es "y").
      const matchesAttributes = Object.entries(selectedAttributes).every(
        ([nombre, valoresSeleccionados]) =>
          product.atributos.some(
            (a) => a.nombre === nombre && valoresSeleccionados.includes(a.valor)
          )
      );

      if (!matchesAttributes) {
        return false;
      }

      if (minPrice && product.precio < Number(minPrice)) {
        return false;
      }

      if (maxPrice && product.precio > Number(maxPrice)) {
        return false;
      }

      if (search) {
        const term = search.toLowerCase().trim();

        const matchesNombre = product.nombre.toLowerCase().includes(term);
        const matchesDescripcion = product.descripcion.toLowerCase().includes(term);
        const matchesMarca = product.marca.toLowerCase().includes(term);
        const matchesCategoria = product.categoria.toLowerCase().includes(term);
        const matchesTipos = product.asignaciones.some((tipos) =>
          tipos.some((item) => item.tipo.toLowerCase().includes(term))
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
    selectedBrands,
    selectedAttributes,
    minPrice,
    maxPrice,
    sortOrder,
    search,
  ]);

  const pageTitle = useMemo(() => {
    if (search) {
      return `Resultados para "${search}"`;
    }

    if (categoria && selectedSubcategoria && selectedTipo) {
      return `${categoriaNombre} - ${getTipoNombre(selectedTipo, selectedSubcategoria)}`;
    }

    if (categoria && selectedSubcategoria) {
      return `${categoriaNombre} - ${getSubcategoriaNombre(selectedSubcategoria)}`;
    }

    if (categoria) {
      return categoriaNombre;
    }

    return "Catálogo";
  }, [categoria, selectedSubcategoria, selectedTipo, search, categoriaNombre, getSubcategoriaNombre, getTipoNombre]);

  const breadcrumb = useMemo(() => {
    if (search) {
      return `Inicio / Búsqueda / ${search}`;
    }

    let text = "Inicio";

    if (categoria) text += ` / ${categoriaNombre}`;
    if (selectedSubcategoria) text += ` / ${getSubcategoriaNombre(selectedSubcategoria)}`;
    if (selectedTipo) text += ` / ${getTipoNombre(selectedTipo, selectedSubcategoria)}`;

    return text;
  }, [categoria, selectedSubcategoria, selectedTipo, search, categoriaNombre, getSubcategoriaNombre, getTipoNombre]);

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

  const selectedAttributeCount = Object.values(selectedAttributes).reduce(
    (total, valores) => total + valores.length,
    0
  );

  const activeFilterCount =
    [selectedSubcategoria, selectedTipo, minPrice, maxPrice, sortOrder].filter(Boolean).length +
    selectedBrands.length +
    selectedAttributeCount;

  const resetFilters = () => {
    setSelectedBrands([]);
    setSelectedSubcategoria(subcategoria || "");
    setSelectedTipo(tipo || "");
    setSelectedAttributes({});
    setMinPrice("");
    setMaxPrice("");
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
              <div className="filter-checkbox-list">
                {availableBrands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    className={`filter-option-btn ${selectedBrands.includes(brand) ? "active" : ""}`}
                    onClick={() => toggleBrand(brand)}
                  >
                    {brand}
                  </button>
                ))}
              </div>
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
                    {getSubcategoriaNombre(item)}
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
                    {getTipoNombre(item, selectedSubcategoria)}
                  </option>
                ))}
              </select>
            </FilterSection>
          )}

          {Object.entries(availableAttributes).map(([nombre, valores]) => (
            <FilterSection key={nombre} id={`attr-${nombre}`} title={nombre}>
              <div className="filter-checkbox-list">
                {valores.map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    className={`filter-option-btn ${
                      (selectedAttributes[nombre] || []).includes(valor) ? "active" : ""
                    }`}
                    onClick={() => toggleAttributeValue(nombre, valor)}
                  >
                    {valor}
                  </button>
                ))}
              </div>
            </FilterSection>
          ))}

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