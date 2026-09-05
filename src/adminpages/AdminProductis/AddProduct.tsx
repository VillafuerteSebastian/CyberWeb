import "./AdminProduct.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUpload, FaTrash, FaEdit, FaStar } from "react-icons/fa";
import productService, { isOnSale } from "../../services/productService";
import { formatPrice } from "../../utils/format";
import {
  categoryData,
  getCategoryData,
  CATEGORIES_UPDATED_EVENT,
} from "../../data/categoryData";
import type { CategoryItem } from "../../data/categoryData";

type TipoProducto = {
  tipo: string;
};

type VarianteProducto = {
  nombre: string;
  valor: string;
};

type AdminProduct = {
  id: string;
  name: string;
  price: number;
  offerPrice?: number | null;
  image: string;
  images?: string[];
  description?: string;
  bullets?: string[];
  categoria: string;
  subcategoria: string;
  marca: string;
  tipos: TipoProducto[];
  variantes?: VarianteProducto[];
  available?: boolean;
};

const emptyForm = {
  name: "",
  price: "",
  description: "",
  categoria: "",
  subcategoria: "",
  tipoFinal: "",
  tipoEspecifico: "",
  marca: "N/A",
  bullets: "",
  nuevaMarca: "",
  varianteNombre: "",
  nuevoValorVariante: "",
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const AddProduct = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [allProducts, setAllProducts] = useState<AdminProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(12);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [variantes, setVariantes] = useState<VarianteProducto[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  // Solo se usa en pantallas angostas (ver CSS), donde el formulario y la
  // lista de productos se muestran de a uno para no tener que bajar todo
  // el formulario para ver los productos.
  const [mobileTab, setMobileTab] = useState<"form" | "products">("form");

  // El precio de oferta ya no se pone desde el formulario de alta: se
  // administra directo en la tarjeta del producto (junto a Disponible,
  // Editar y Eliminar), una vez que el producto ya existe.
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerDraft, setOfferDraft] = useState({
    mode: "amount" as "amount" | "percent",
    amount: "",
    percent: "",
  });
  const [savingOffer, setSavingOffer] = useState(false);

  // Evita que el scroll del mouse sobre un input numérico enfocado cambie
  // su valor por accidente (comportamiento nativo de Chrome).
  const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Carga las categorías al montar y se refresca sola cuando se invalida
  // el caché (alta/edición/borrado en /admin/categories), para no depender
  // de una recarga manual de la página.
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategoryData();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to static data
        setCategories(categoryData);
      }
    };

    loadCategories();

    window.addEventListener(CATEGORIES_UPDATED_EVENT, loadCategories);
    return () => {
      window.removeEventListener(CATEGORIES_UPDATED_EVENT, loadCategories);
    };
  }, []);

  const selectedCategory = useMemo(
    () => (categories.length > 0 ? categories : categoryData).find((cat) => cat.id === form.categoria),
    [form.categoria, categories]
  );

  const selectedSection = useMemo(
    () =>
      selectedCategory?.sections.find(
        (section) => section.subcategoria === form.subcategoria
      ),
    [selectedCategory, form.subcategoria]
  );

  const categoryOptions = useMemo(
    () =>
      (categories.length > 0 ? categories : categoryData).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories]
  );

  const subcategoryOptions = useMemo(() => {
    if (!categoryFilter) {
      const map = new Map<string, string>();

      (categories.length > 0 ? categories : categoryData).forEach((category) => {
        category.sections.forEach((section) => {
          map.set(section.subcategoria, section.title);
        });
      });

      return Array.from(map.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    const selected = (categories.length > 0 ? categories : categoryData).find((cat) => cat.id === categoryFilter);
    if (!selected) return [];

    return selected.sections
      .map((section) => ({
        value: section.subcategoria,
        label: section.title,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryFilter, categories]);

  const typeOptions = useMemo(() => {
    const typeMap = new Map<string, string>();

    (categories.length > 0 ? categories : categoryData).forEach((category) => {
      if (categoryFilter && category.id !== categoryFilter) return;

      category.sections.forEach((section) => {
        if (subcategoryFilter && section.subcategoria !== subcategoryFilter) return;

        section.links.forEach((link) => {
          if (link.tipo) {
            typeMap.set(link.tipo, link.label);
          }
        });
      });
    });

    return Array.from(typeMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryFilter, subcategoryFilter, categories]);

  const getCategoryLabel = (categoriaId: string) =>
    (categories.length > 0 ? categories : categoryData).find((category) => category.id === categoriaId)?.name || categoriaId;

  const getSubcategoryLabel = (categoriaId: string, subcategoriaId: string) => {
    const category = (categories.length > 0 ? categories : categoryData).find((item) => item.id === categoriaId);
    return (
      category?.sections.find((section) => section.subcategoria === subcategoriaId)?.title ||
      subcategoriaId
    );
  };

  const getTypeLabel = (
    categoriaId: string,
    subcategoriaId: string,
    tipoId: string
  ) => {
    const category = (categories.length > 0 ? categories : categoryData).find((item) => item.id === categoriaId);
    const section = category?.sections.find(
      (item) => item.subcategoria === subcategoriaId
    );

    return section?.links.find((link) => link.tipo === tipoId)?.label || tipoId;
  };

  const specificOptions = useMemo(() => {
    if (
      form.categoria === "computadoras" &&
      form.subcategoria === "perifericos" &&
      form.tipoFinal === "teclados"
    ) {
      return ["mecanico", "membrana"];
    }

    if (
      form.categoria === "computadoras" &&
      form.subcategoria === "perifericos" &&
      form.tipoFinal === "mouses"
    ) {
      return ["inalambrico", "cable"];
    }

    if (
      form.categoria === "computadoras" &&
      form.subcategoria === "componentes" &&
      form.tipoFinal === "ram"
    ) {
      return ["ddr4", "ddr5"];
    }

    if (form.categoria === "gaming" && form.subcategoria === "playstation") {
      if (form.tipoFinal === "juegos-playstation") {
        return ["ps4", "ps5"];
      }
      if (form.tipoFinal === "controles") {
        return ["ps4", "ps5"];
      }
    }

    if (form.categoria === "gaming" && form.subcategoria === "nintendo") {
      if (form.tipoFinal === "juegos-switch") {
        return ["switch-1", "switch-2"];
      }
      if (form.tipoFinal === "controles-switch") {
        return ["switch-1", "switch-2"];
      }
      if (form.tipoFinal === "estuche-switch") {
        return ["switch-1", "switch-2"];
      }
      if (form.tipoFinal === "accesorios-switch") {
        return ["switch-1", "switch-2"];
      }
    }

    return [];
  }, [form.categoria, form.subcategoria, form.tipoFinal]);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (categoryFilter) {
      filtered = filtered.filter((product) => product.categoria === categoryFilter);
    }

    if (subcategoryFilter) {
      filtered = filtered.filter(
        (product) => product.subcategoria === subcategoryFilter
      );
    }

    if (typeFilter) {
      filtered = filtered.filter((product) =>
        product.tipos?.some((tipo, index) => index > 0 && tipo.tipo === typeFilter)
      );
    }

    if (searchTerm) {
      const searchLower = normalizeText(searchTerm);

      filtered = filtered.filter((product) => {
        const productText = [
          product.name,
          product.description || "",
          product.marca,
          getCategoryLabel(product.categoria),
          getSubcategoryLabel(product.categoria, product.subcategoria),
          ...product.tipos.map((tipo, index) =>
            index === 0
              ? getSubcategoryLabel(product.categoria, tipo.tipo)
              : getTypeLabel(product.categoria, product.subcategoria, tipo.tipo)
          ),
        ]
          .join(" ")
          .toLowerCase();

        return normalizeText(productText).includes(searchLower);
      });
    }

    return filtered;
  }, [allProducts, categoryFilter, subcategoryFilter, typeFilter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, subcategoryFilter, typeFilter, searchTerm]);

  useEffect(() => {
    setSubcategoryFilter("");
    setTypeFilter("");
  }, [categoryFilter]);

  useEffect(() => {
    setTypeFilter("");
  }, [subcategoryFilter]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, productsPerPage]);

  const totalPages = useMemo(
    () => Math.ceil(filteredProducts.length / productsPerPage),
    [filteredProducts.length, productsPerPage]
  );

  const marcasDisponibles = useMemo(() => {
    const marcas = new Set<string>(["N/A"]);
    products.forEach((product) => {
      if (product.marca?.trim()) marcas.add(product.marca);
    });
    return Array.from(marcas).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const resetForm = () => {
    setForm(emptyForm);
    setVariantes([]);
    setImages([]);
    setEditingProductId(null);
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);

      const response = await productService.getProducts({
        page: 1,
        limit: 100,
      });

      const rawProducts = response.data;

      const mappedProducts: AdminProduct[] = rawProducts.map((product: any) => {
        const tipos = Array.isArray(product.tipos) ? product.tipos : [];
        const subcategoria = tipos[0]?.tipo || "";

        return {
          id: String(product.id || product._id || ""),
          name: product.nombre || "",
          price: Number(product.precio ?? 0),
          offerPrice:
            product.precio_oferta !== null && product.precio_oferta !== undefined
              ? Number(product.precio_oferta)
              : null,
          image: product.image || "",
          images: Array.isArray(product.images) ? product.images : [],
          description: product.descripcion || "",
          bullets: Array.isArray(product.bullets) ? product.bullets : [],
          categoria: product.categoria || "",
          subcategoria,
          marca: product.marca || "N/A",
          tipos,
          variantes: Array.isArray(product.variantes) ? product.variantes : [],
          available: product.available !== false,
        };
      });

      setAllProducts(mappedProducts);
      setProducts(mappedProducts);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setAllProducts([]);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleAvailable = async (product: AdminProduct) => {
    const newValue = !product.available;

    try {
      setTogglingId(product.id);
      await productService.updateProduct(product.id, { available: newValue });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, available: newValue } : p
        )
      );

      setAllProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, available: newValue } : p
        )
      );
    } catch (error: any) {
      const backendMessage =
        error?.message || "No se pudo actualizar la disponibilidad";
      alert(backendMessage);
    } finally {
      setTogglingId(null);
    }
  };

  const openOfferEditor = (product: AdminProduct) => {
    setEditingOfferId(product.id);
    setOfferDraft({
      mode: "amount",
      amount: product.offerPrice != null ? String(product.offerPrice) : "",
      percent: "",
    });
  };

  const handleSaveOffer = async (product: AdminProduct) => {
    let offerPriceNum: number | null = null;

    if (offerDraft.mode === "amount" && offerDraft.amount.trim()) {
      offerPriceNum = Number(offerDraft.amount);
    } else if (offerDraft.mode === "percent" && offerDraft.percent.trim()) {
      const pct = Number(offerDraft.percent);
      if (pct <= 0 || pct >= 100) {
        alert("El porcentaje de descuento debe estar entre 1 y 99");
        return;
      }
      offerPriceNum = Math.round(product.price * (1 - pct / 100));
    }

    if (
      offerPriceNum !== null &&
      (offerPriceNum <= 0 || offerPriceNum >= product.price)
    ) {
      alert("El precio de oferta debe ser mayor a 0 y menor al precio normal");
      return;
    }

    try {
      setSavingOffer(true);
      await productService.updateProduct(product.id, {
        precio_oferta: offerPriceNum,
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, offerPrice: offerPriceNum } : p))
      );
      setAllProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, offerPrice: offerPriceNum } : p))
      );

      setEditingOfferId(null);
    } catch (error: any) {
      alert(error?.message || "No se pudo actualizar el precio de oferta");
    } finally {
      setSavingOffer(false);
    }
  };

  const handleRemoveOffer = async (product: AdminProduct) => {
    try {
      setSavingOffer(true);
      await productService.updateProduct(product.id, { precio_oferta: null });

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, offerPrice: null } : p))
      );
      setAllProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, offerPrice: null } : p))
      );

      setEditingOfferId(null);
    } catch (error: any) {
      alert(error?.message || "No se pudo quitar el precio de oferta");
    } finally {
      setSavingOffer(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === "categoria") {
        return {
          ...prev,
          categoria: value,
          subcategoria: "",
          tipoFinal: "",
          tipoEspecifico: "",
        };
      }

      if (name === "subcategoria") {
        return {
          ...prev,
          subcategoria: value,
          tipoFinal: "",
          tipoEspecifico: "",
        };
      }

      if (name === "tipoFinal") {
        return {
          ...prev,
          tipoFinal: value,
          tipoEspecifico: "",
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const uploadImages = async (files: File[]) => {
    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (validFiles.length === 0) {
      if (files.length > 0) alert("Solo se permiten archivos de imagen");
      return;
    }

    setUploadingImage(true);

    try {
      for (const file of validFiles) {
        try {
          const publicUrl = await productService.uploadProductImage(file);
          setImages((prev) => [...prev, publicUrl]);
        } catch (error: any) {
          alert(error?.message || "No se pudo subir una de las imágenes");
        }
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    await uploadImages(files);
  };

  const handleImagePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length === 0) return;
    e.preventDefault();
    await uploadImages(files);
  };

  const handleImageDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingImage(true);
  };

  const handleImageDragLeave = () => {
    setIsDraggingImage(false);
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingImage(false);

    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;
    await uploadImages(files);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverImage = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      return [selected, ...next];
    });
  };

  const handleAddVariant = () => {
    if (!form.nuevoValorVariante.trim()) return;

    const exists = variantes.some(
      (item) =>
        item.nombre.toLowerCase() === form.varianteNombre.trim().toLowerCase() &&
        item.valor.toLowerCase() ===
          form.nuevoValorVariante.trim().toLowerCase()
    );

    if (exists) return;

    setVariantes((prev) => [
      ...prev,
      {
        nombre: form.varianteNombre.trim(),
        valor: form.nuevoValorVariante.trim(),
      },
    ]);

    setForm((prev) => ({
      ...prev,
      nuevoValorVariante: "",
    }));
  };

  const handleRemoveVariant = (indexToRemove: number) => {
    setVariantes((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleEdit = (product: AdminProduct) => {
    const subcategoria = product.tipos?.[0]?.tipo || "";
    const tipoFinal = product.tipos?.[1]?.tipo || "";
    const tipoEspecifico = product.tipos?.[2]?.tipo || "";

    setEditingProductId(product.id);
    setForm({
      name: product.name || "",
      price: String(product.price ?? ""),
      description: product.description || "",
      categoria: product.categoria || "",
      subcategoria,
      tipoFinal,
      tipoEspecifico,
      marca: product.marca || "N/A",
      bullets: product.bullets?.join("\n") || "",
      nuevaMarca: "",
      varianteNombre: "",
      nuevoValorVariante: "",
    });
    setVariantes(product.variantes || []);
    setImages(
      product.images?.length ? product.images : product.image ? [product.image] : []
    );

    setMobileTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.price.trim() ||
      images.length === 0 ||
      !form.categoria.trim() ||
      !form.subcategoria.trim() ||
      !form.tipoFinal.trim()
    ) {
      alert("Completa todos los campos obligatorios (incluida al menos una imagen)");
      return;
    }

    const precioNum = Number(form.price);

    // Acepta pegar una lista de características (una por línea, con o sin
    // viñetas como •, -, *) o el formato viejo separado por comas.
    const bulletsArray = form.bullets
      .split(/\r?\n/)
      .flatMap((line) => line.split(","))
      .map((item) => item.trim().replace(/^[•\-*·▪‣◦]\s*/, ""))
      .filter(Boolean);

    const tiposArray: TipoProducto[] = [
      { tipo: form.subcategoria },
      { tipo: form.tipoFinal },
      ...(form.tipoEspecifico ? [{ tipo: form.tipoEspecifico }] : []),
    ];

    const finalBrand =
      form.marca === "__new__"
        ? form.nuevaMarca.trim() || "N/A"
        : form.marca || "N/A";

    // El precio de oferta no se toca desde este formulario: en un producto
    // nuevo queda sin oferta (se agrega después desde la tarjeta) y en una
    // edición no se envía la clave para no pisar la oferta que ya tenía.
    const payload = {
      nombre: form.name.trim(),
      descripcion: form.description.trim() || "Sin descripción disponible",
      precio: precioNum,
      categoria: form.categoria,
      marca: finalBrand,
      image: images[0] || "",
      images,
      tipos: tiposArray,
      bullets: bulletsArray,
      variantes,
    };

    try {
      setSaving(true);

      if (editingProductId) {
        await productService.updateProduct(editingProductId, payload);
        alert("Producto actualizado correctamente");
      } else {
        await productService.createProduct(payload);
        alert("Producto agregado correctamente");
      }

      resetForm();
      fetchProducts();
      setMobileTab("products");
    } catch (error: any) {
      console.error("Error al guardar producto:", error);
      alert(error?.message || "No se pudo guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este producto?"
    );

    if (!confirmDelete) return;

    try {
      await productService.deleteProduct(id);
      setProducts((prev) => prev.filter((product) => product.id !== id));
      setAllProducts((prev) => prev.filter((product) => product.id !== id));

      if (editingProductId === id) {
        resetForm();
      }

      alert("Producto eliminado correctamente");
    } catch (error: any) {
      console.error("Error al eliminar producto:", error);
      alert(error?.message || "No se pudo eliminar el producto");
    }
  };

  return (
    <div className="add-product-page">
      <div className="add-product-container">
        <div className="add-product-header">
          <div>
            <h1>{editingProductId ? "Editar producto" : "Agregar producto"}</h1>
            <p>
              Administra productos desde el backend y actualiza su información.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/")}
            >
              Volver al inicio
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/admin/categories")}
            >
              Gestión de Categorías
            </button>

            {editingProductId && (
              <button
                type="button"
                className="warning-btn"
                onClick={resetForm}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>

        <div className="mobile-view-tabs">
          <button
            type="button"
            className={mobileTab === "form" ? "active" : ""}
            onClick={() => setMobileTab("form")}
          >
            {editingProductId ? "Editar producto" : "Agregar producto"}
          </button>
          <button
            type="button"
            className={mobileTab === "products" ? "active" : ""}
            onClick={() => setMobileTab("products")}
          >
            Productos ({filteredProducts.length})
          </button>
        </div>

        <div className="add-product-content" data-mobile-tab={mobileTab}>
          <div className="add-product-form-card">
            <h2>{editingProductId ? "Editar producto" : "Nuevo producto"}</h2>

            <form className="add-product-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Nombre del producto</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ej: Cable HDMI 4K"
                />
              </div>

              <div className="form-group">
                <label htmlFor="price">Precio</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={handleChange}
                  onWheel={blurOnWheel}
                  placeholder="Ej: 8500"
                />
              </div>

              <div className="form-group">
                <label htmlFor="categoria">Categoría</label>
                <select
                  id="categoria"
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                >
                  <option value="">Selecciona una categoría</option>
                  {(categories.length > 0 ? categories : categoryData).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subcategoria">Subcategoría / sección</label>
                <select
                  id="subcategoria"
                  name="subcategoria"
                  value={form.subcategoria}
                  onChange={handleChange}
                  disabled={!selectedCategory}
                >
                  <option value="">Selecciona una subcategoría</option>
                  {selectedCategory?.sections.map((section) => (
                    <option key={section.subcategoria} value={section.subcategoria}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tipoFinal">Tipo específico</label>
                <select
                  id="tipoFinal"
                  name="tipoFinal"
                  value={form.tipoFinal}
                  onChange={handleChange}
                  disabled={!selectedSection}
                >
                  <option value="">Selecciona un tipo</option>
                  {selectedSection?.links.map((link) => (
                    <option key={link.tipo} value={link.tipo}>
                      {link.label}
                    </option>
                  ))}
                </select>
              </div>

              {specificOptions.length > 0 && (
                <div className="form-group form-group-full">
                  <label className="radio-group-label">Subtipo específico</label>
                  <div className="radio-options-container">
                    {specificOptions.map((option) => (
                      <label key={option} className="radio-option-label">
                        <input
                          type="radio"
                          name="tipoEspecifico"
                          value={option}
                          checked={form.tipoEspecifico === option}
                          onChange={handleChange}
                          className="radio-input"
                        />
                        <span className="radio-text">
                          {option === "mecanico"
                            ? "Mecánico"
                            : option === "membrana"
                            ? "Membrana"
                            : option === "inalambrico"
                            ? "Inalámbrico"
                            : option === "cable"
                            ? "Cable"
                            : option === "ddr4"
                            ? "DDR4"
                            : option === "ddr5"
                            ? "DDR5"
                            : option === "ps4"
                            ? "PS4"
                            : option === "ps5"
                            ? "PS5"
                            : option === "switch-1"
                            ? "Switch 1"
                            : option === "switch-2"
                            ? "Switch 2"
                            : option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group form-group-full" onPaste={handleImagePaste}>
                <label>Imágenes del producto</label>

                <label
                  className={[
                    "image-dropzone",
                    isDraggingImage ? "dragging" : "",
                    uploadingImage ? "uploading" : "",
                    images.length > 0 ? "has-image" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onDrop={handleImageDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFile}
                    hidden
                  />

                  {images.length === 0 ? (
                    <div className="image-dropzone-empty">
                      <FaUpload className="image-dropzone-icon" />
                      <p>
                        <strong>Hacé clic para subir</strong> o arrastrá una o
                        varias imágenes aquí
                      </p>
                      <span>También podés pegarlas con Ctrl+V</span>
                    </div>
                  ) : (
                    <div className="image-dropzone-add-more">
                      <FaUpload /> Agregar más imágenes
                    </div>
                  )}

                  {uploadingImage && (
                    <div className="image-dropzone-loading">Subiendo...</div>
                  )}
                </label>

                {images.length > 0 && (
                  <>
                    <div className="image-gallery-grid">
                      {images.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className={`image-gallery-item ${
                            idx === 0 ? "is-cover" : ""
                          }`}
                        >
                          <img src={url} alt={`Imagen ${idx + 1}`} />

                          {idx === 0 && (
                            <span className="image-gallery-cover-badge">
                              Portada
                            </span>
                          )}

                          <div className="image-gallery-item-actions">
                            {idx !== 0 && (
                              <button
                                type="button"
                                title="Usar como portada"
                                onClick={() => handleSetCoverImage(idx)}
                              >
                                <FaStar />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Quitar imagen"
                              onClick={() => handleRemoveImage(idx)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="field-hint">
                      La primera imagen (con la estrella) es la portada que se
                      ve en las tarjetas de producto. Hacé clic en la estrella
                      de otra imagen para cambiarla.
                    </p>
                  </>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="marca">Marca</label>
                <select
                  id="marca"
                  name="marca"
                  value={form.marca}
                  onChange={handleChange}
                >
                  {marcasDisponibles.map((marca) => (
                    <option key={marca} value={marca}>
                      {marca}
                    </option>
                  ))}
                  <option value="__new__">Agregar nueva marca</option>
                </select>
              </div>

              {form.marca === "__new__" && (
                <div className="form-group">
                  <label htmlFor="nuevaMarca">Nueva marca</label>
                  <input
                    id="nuevaMarca"
                    name="nuevaMarca"
                    type="text"
                    value={form.nuevaMarca}
                    onChange={handleChange}
                    placeholder="Ej: Logitech"
                  />
                </div>
              )}

              <div className="form-group form-group-full">
                <label htmlFor="description">Descripción</label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Descripción general del producto"
                />
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="bullets">Características destacadas</label>
                <textarea
                  id="bullets"
                  name="bullets"
                  rows={2}
                  value={form.bullets}
                  onChange={handleChange}
                  placeholder={"Una característica por línea, por ejemplo:\n4K a 60Hz\nCable de 2 metros\nCompatible con HDR"}
                />
                <p className="field-hint">
                  Podés pegar una lista con viñetas (•, -, *) tal cual la
                  copiaste — cada línea se guarda como una característica
                  separada.
                </p>
              </div>

              <div className="variant-box">
                <h3>Variantes opcionales</h3>
                <p>
                  Agrega las opciones del producto (medidas, colores, tallas,
                  capacidades). Para un cable, por ejemplo, basta con el
                  valor: "2m", "3m", "5m".
                </p>

                <div className="variant-inline">
                  <div className="form-group variant-value-group">
                    <label htmlFor="nuevoValorVariante">Valor</label>
                    <input
                      id="nuevoValorVariante"
                      name="nuevoValorVariante"
                      type="text"
                      value={form.nuevoValorVariante}
                      onChange={handleChange}
                      placeholder="Ej: 2m, Rojo, XL"
                    />
                  </div>

                  <button
                    type="button"
                    className="add-variant-btn"
                    onClick={handleAddVariant}
                  >
                    Agregar
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="varianteNombre">
                    Nombre de grupo <span className="optional-text">(opcional)</span>
                  </label>
                  <input
                    id="varianteNombre"
                    name="varianteNombre"
                    type="text"
                    value={form.varianteNombre}
                    onChange={handleChange}
                    placeholder='Solo si querés agrupar valores, ej: "Longitud"'
                  />
                </div>

                {variantes.length > 0 && (
                  <div className="variant-chips-wrapper">
                    {variantes.map((variante, index) => (
                      <button
                        key={`${variante.nombre}-${variante.valor}-${index}`}
                        type="button"
                        className="variant-chip"
                        onClick={() => handleRemoveVariant(index)}
                        title="Eliminar variante"
                      >
                        <span>
                          {variante.nombre ? `${variante.nombre}: ${variante.valor}` : variante.valor}
                        </span>
                        <strong>×</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="primary-btn" disabled={saving || uploadingImage}>
                {uploadingImage
                  ? "SUBIENDO IMAGEN..."
                  : saving
                  ? editingProductId
                    ? "ACTUALIZANDO..."
                    : "GUARDANDO..."
                  : editingProductId
                  ? "Actualizar producto"
                  : "Guardar producto"}
              </button>
            </form>
          </div>

          <div className="products-preview-card">
            <div className="products-preview-top">
              <h2>Productos guardados</h2>
              <span>
                {loadingProducts ? "Cargando..." : `${filteredProducts.length} productos`}
              </span>
            </div>

            <div className="products-preview-content">
              <div className="admin-filters-sidebar">
                <div className="admin-filters-sidebar-header">
                  <h3>Filtros</h3>
                  <p>Organiza y encuentra productos más rápido.</p>
                </div>

                <div className="filter-group">
                  <label htmlFor="adminSearch">Buscar producto</label>
                  <div className="admin-search-box">
                    <input
                      id="adminSearch"
                      type="text"
                      placeholder="Nombre, marca o descripción..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>
                </div>

                <div className="filter-group">
                  <label htmlFor="categoryFilter">Categoría</label>
                  <select
                    id="categoryFilter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="admin-filter-select"
                  >
                    <option value="">Todas las categorías</option>
                    {categoryOptions.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="subcategoryFilter">Subcategoría</label>
                  <select
                    id="subcategoryFilter"
                    value={subcategoryFilter}
                    onChange={(e) => setSubcategoryFilter(e.target.value)}
                    className="admin-filter-select"
                    disabled={!subcategoryOptions.length}
                  >
                    <option value="">Todas las subcategorías</option>
                    {subcategoryOptions.map((subcategory) => (
                      <option key={subcategory.value} value={subcategory.value}>
                        {subcategory.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="typeFilter">Tipo</label>
                  <select
                    id="typeFilter"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="admin-filter-select"
                    disabled={!typeOptions.length}
                  >
                    <option value="">Todos los tipos</option>
                    {typeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="secondary-btn admin-clear-filters-btn"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("");
                    setSubcategoryFilter("");
                    setTypeFilter("");
                  }}
                >
                  Limpiar filtros
                </button>
              </div>

              <div className="products-main-content">
                <div className="admin-products-grid">
                  {paginatedProducts.map((product) => {
                    const subcategoria = product.tipos?.[0]?.tipo || product.subcategoria;
                    const tipoFinal = product.tipos?.[1]?.tipo || "";
                    const subtipo = product.tipos?.[2]?.tipo || "";
                    const onSale = isOnSale(product.price, product.offerPrice);

                    return (
                      <div key={product.id} className="admin-product-card">
                        {onSale && (
                          <span className="admin-sale-badge">
                            -
                            {Math.round(
                              ((product.price - (product.offerPrice as number)) /
                                product.price) *
                                100
                            )}
                            %
                          </span>
                        )}

                        <img
                          src={product.image || "/placeholder-product.png"}
                          alt={product.name}
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-product.png";
                          }}
                        />

                        <h3>{product.name}</h3>
                        {onSale ? (
                          <p className="admin-price">
                            <span className="admin-price-old">
                              {formatPrice(product.price)}
                            </span>{" "}
                            {formatPrice(product.offerPrice as number)}
                          </p>
                        ) : (
                          <p className="admin-price">{formatPrice(product.price)}</p>
                        )}
                        <p className="admin-meta">
                          {getCategoryLabel(product.categoria)} ·{" "}
                          {getSubcategoryLabel(product.categoria, subcategoria)} ·{" "}
                          {product.marca}
                        </p>

                        <div className="admin-tags">
                          <span>{getSubcategoryLabel(product.categoria, subcategoria)}</span>
                          {tipoFinal && (
                            <span>
                              {getTypeLabel(product.categoria, subcategoria, tipoFinal)}
                            </span>
                          )}
                          {subtipo && <span>{subtipo.toUpperCase()}</span>}
                        </div>

                        {product.variantes && product.variantes.length > 0 && (
                          <div className="admin-variants">
                            {product.variantes.map((variante, index) => (
                              <span key={`${product.id}-var-${index}`}>
                                {variante.nombre ? `${variante.nombre}: ${variante.valor}` : variante.valor}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="admin-card-actions">
                          <button
                            type="button"
                            className={
                              product.available
                                ? "secondary-btn full-btn"
                                : "warning-btn full-btn"
                            }
                            disabled={togglingId === product.id}
                            onClick={() => handleToggleAvailable(product)}
                          >
                            {togglingId === product.id
                              ? "Actualizando..."
                              : product.available
                              ? "✅ Disponible — deshabilitar"
                              : "❌ No disponible — habilitar"}
                          </button>

                          <button
                            type="button"
                            className={
                              onSale
                                ? "secondary-btn full-btn offer-toggle-active"
                                : "secondary-btn full-btn"
                            }
                            onClick={() =>
                              editingOfferId === product.id
                                ? setEditingOfferId(null)
                                : openOfferEditor(product)
                            }
                          >
                            {onSale
                              ? `🏷️ Oferta: ${formatPrice(product.offerPrice as number)}`
                              : "🏷️ Agregar precio de oferta"}
                          </button>

                          {editingOfferId === product.id && (
                            <div className="offer-editor">
                              <div className="toggle-switch toggle-switch-compact">
                                <button
                                  type="button"
                                  className={
                                    offerDraft.mode === "amount"
                                      ? "toggle-btn active"
                                      : "toggle-btn"
                                  }
                                  onClick={() =>
                                    setOfferDraft((prev) => ({ ...prev, mode: "amount" }))
                                  }
                                >
                                  Monto
                                </button>
                                <button
                                  type="button"
                                  className={
                                    offerDraft.mode === "percent"
                                      ? "toggle-btn active"
                                      : "toggle-btn"
                                  }
                                  onClick={() =>
                                    setOfferDraft((prev) => ({ ...prev, mode: "percent" }))
                                  }
                                >
                                  %
                                </button>
                              </div>

                              {offerDraft.mode === "amount" ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={offerDraft.amount}
                                  onChange={(e) =>
                                    setOfferDraft((prev) => ({
                                      ...prev,
                                      amount: e.target.value,
                                    }))
                                  }
                                  onWheel={blurOnWheel}
                                  placeholder="Ej: 6900"
                                  className="offer-editor-input"
                                />
                              ) : (
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  step="1"
                                  value={offerDraft.percent}
                                  onChange={(e) =>
                                    setOfferDraft((prev) => ({
                                      ...prev,
                                      percent: e.target.value,
                                    }))
                                  }
                                  onWheel={blurOnWheel}
                                  placeholder="Ej: 20 (%)"
                                  className="offer-editor-input"
                                />
                              )}

                              <div className="offer-editor-actions">
                                <button
                                  type="button"
                                  className="primary-btn"
                                  disabled={savingOffer}
                                  onClick={() => handleSaveOffer(product)}
                                >
                                  {savingOffer ? "Guardando..." : "Guardar"}
                                </button>

                                {onSale && (
                                  <button
                                    type="button"
                                    className="warning-btn"
                                    disabled={savingOffer}
                                    onClick={() => handleRemoveOffer(product)}
                                  >
                                    Quitar
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="secondary-btn"
                                  disabled={savingOffer}
                                  onClick={() => setEditingOfferId(null)}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="admin-card-buttons-row">
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => handleEdit(product)}
                            >
                              <FaEdit />
                              Editar
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDelete(product.id)}
                            >
                              <FaTrash />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      className="admin-pagination-btn"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>

                    <div className="admin-pagination-numbers">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          className={`admin-pagination-number ${
                            currentPage === page ? "active" : ""
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      className="admin-pagination-btn"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;