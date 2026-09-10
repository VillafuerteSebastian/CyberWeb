import "./CategoryManager.css";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaArrowUp, FaArrowDown } from "react-icons/fa";
import categoryService from "../../services/categoryService";
import type {
  CategoriaCreate,
  CategoriaUpdate
} from "../../services/categoryService";
import { categoryData, getCategoryData, clearCategoryCache, getCategoryIcon } from "../../data/categoryData";
import { toastSuccess, toastError, confirmDialog } from "../../components/Notify/notify";

type CategoryLink = {
  label: string;
  to: string;
  categoria: string;
  subcategoria?: string;
  tipo?: string;
  _id?: string;
  key?: string;
};

type CategorySection = {
  title: string;
  to: string;
  categoria: string;
  subcategoria: string;
  links: CategoryLink[];
  _id?: string;
  key?: string;
};

type CategoryItem = {
  id: string;
  name: string;
  icono?: string;
  /** Orden manual frente a las demás categorías raíz (menor = primero). */
  orden: number;
  sections: CategorySection[];
  _id?: string;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// Genera autom\u00e1ticamente el id/slug de b\u00fasqueda a partir del nombre escrito:
// una sola palabra queda en min\u00fascula ("Computadoras" -> "computadoras"),
// y varias palabras se juntan sin espacios ("Parlantes de PC" -> "parlantesdepc")
// para que la b\u00fasqueda sea m\u00e1s r\u00e1pida y no haya que escribir el id a mano.
const generateSlug = (value: string) =>
  normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .join("");

const CategoryManager = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Load categories dynamically on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategoryData();

        const formattedCategories = categoriesData.map((category) => ({
          id: category.id,
          name: category.name,
          icono: category.icono,
          orden: category.orden ?? 0,
          _id: category._id,
          sections: category.sections.map((section, sectionIndex) => ({
            title: section.title,
            to: section.to,
            categoria: section.categoria,
            subcategoria: section.subcategoria,
            _id: section._id,
            links: section.links.map((link, linkIndex) => ({
              label: link.label,
              to: link.to,
              categoria: link.categoria,
              subcategoria: link.subcategoria,
              tipo: link.tipo,
              _id: link._id,
              key:
                link.key ||
                link._id ||
                `${category.id}-${section.subcategoria}-${linkIndex}`,
            })),
            key:
              section._id ||
              `${category.id}-${section.subcategoria || sectionIndex}`,
          })),
        }));

        setCategories(formattedCategories);
      } catch (error) {
        console.error("Error loading categories:", error);

        const fallbackCategories = categoryData.map((category) => ({
          id: category.id,
          name: category.name,
          icono: category.icono,
          orden: category.orden ?? 0,
          sections: category.sections.map((section, sectionIndex) => ({
            title: section.title,
            to: section.to,
            categoria: section.categoria,
            subcategoria: section.subcategoria,
            links: section.links.map((link, linkIndex) => ({
              label: link.label,
              to: link.to,
              categoria: link.categoria,
              subcategoria: link.subcategoria,
              tipo: link.tipo,
              key:
                link.key ||
                `${category.id}-${section.subcategoria || sectionIndex}-${linkIndex}`,
            })),
            key: `${category.id}-${section.subcategoria || sectionIndex}`,
          })),
        }));

        setCategories(fallbackCategories);
      }
    };

    loadCategories();
  }, []);

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [newCategory, setNewCategory] = useState({ name: "", id: "", icono: "" });
  const [newSection, setNewSection] = useState({
    title: "",
    subcategoria: "",
    categoryId: "",
  });
  const [newLink, setNewLink] = useState({
    label: "",
    tipo: "",
    sectionId: "",
    categoryId: "",
  });

  const allSubcategories = useMemo(() => {
    const subcategories = new Set<string>();
    categories.forEach((category) => {
      category.sections.forEach((section) => {
        subcategories.add(section.subcategoria);
      });
    });
    return Array.from(subcategories).sort();
  }, [categories]);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    categories.forEach((category) => {
      category.sections.forEach((section) => {
        section.links.forEach((link) => {
          if (link.tipo) {
            types.add(link.tipo);
          }
        });
      });
    });
    return Array.from(types).sort();
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      if (searchTerm) {
        const searchLower = normalizeText(searchTerm);
        const categoryText = normalizeText(
          [
            category.name,
            category.id,
            ...category.sections.flatMap((section) => [
              section.title,
              section.subcategoria,
              ...section.links.flatMap((link) => [link.label, link.tipo || ""]),
            ]),
          ].join(" ")
        );

        if (!categoryText.includes(searchLower)) {
          return false;
        }
      }

      if (categoryFilter && category.id !== categoryFilter) {
        return false;
      }

      if (subcategoryFilter) {
        const hasSubcategory = category.sections.some(
          (section) => section.subcategoria === subcategoryFilter
        );
        if (!hasSubcategory) return false;
      }

      if (typeFilter) {
        const hasType = category.sections.some((section) =>
          section.links.some((link) => link.tipo === typeFilter)
        );
        if (!hasType) return false;
      }

      return true;
    });
  }, [categories, searchTerm, categoryFilter, subcategoryFilter, typeFilter]);

  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCategories.slice(startIndex, endIndex);
  }, [filteredCategories, currentPage, itemsPerPage]);

  const totalPages = useMemo(
    () => Math.ceil(filteredCategories.length / itemsPerPage),
    [filteredCategories.length, itemsPerPage]
  );

  // El orden manual (flechas subir/bajar) mueve la categoría dentro de la
  // lista COMPLETA, sin filtrar — con un filtro/búsqueda activo la flecha
  // "siguiente" visible en pantalla podría no ser la vecina real en el
  // orden global, así que directamente se ocultan hasta limpiar filtros.
  const canReorder =
    !searchTerm && !categoryFilter && !subcategoryFilter && !typeFilter;

  const clearForms = () => {
    setEditingCategory(null);
    setEditingSection(null);
    setEditingLink(null);
    setNewCategory({ name: "", id: "", icono: "" });
    setNewSection({ title: "", subcategoria: "", categoryId: "" });
    setNewLink({ label: "", tipo: "", sectionId: "", categoryId: "" });
  };

  const refreshCache = async () => {
    try {
      clearCategoryCache();

      const freshData = await getCategoryData();

      const formattedCategories = freshData.map((cat) => ({
        id: cat.id,
        name: cat.name,
        icono: cat.icono,
        orden: cat.orden ?? 0,
        _id: cat._id,
        sections: cat.sections.map((section) => ({
          ...section,
          _id: section._id,
          links: section.links.map((link) => ({
            ...link,
            _id: link._id,
          })),
        })),
      }));

      setCategories(formattedCategories);
      toastSuccess("Categorías actualizadas correctamente");
    } catch (error) {
      console.error("Error refreshing cache:", error);
      toastError("Error al actualizar las categorías");
    }
  };

  const saveCategory = async () => {
    if (!newCategory.name.trim()) {
      toastError("Completa el nombre de la categoría");
      return;
    }

    // Al editar se conserva el id original (no se regenera desde el nombre)
    // para no romper las secciones/enlaces que ya dependen de él.
    const normalizedId = editingCategory
      ? newCategory.id.trim().toLowerCase().replace(/\s+/g, "-")
      : generateSlug(newCategory.name);

    const categoryPayload: CategoriaCreate = {
      categoria: normalizedId,
      nombre_categoria: newCategory.name.trim(),
      icono: newCategory.icono.trim() || undefined,
    };

    try {
      if (editingCategory) {
        const updatePayload: CategoriaUpdate = {
          categoria: normalizedId,
          nombre_categoria: newCategory.name.trim(),
          icono: newCategory.icono.trim() || null,
        };

        await categoryService.updateCategory(editingCategory, updatePayload);

        // Clear global cache to force refresh in all components
        clearCategoryCache();
        
        // Reload fresh data from API
        const freshData = await getCategoryData();
        const formattedCategories = freshData.map((cat) => ({
          id: cat.id,
          name: cat.name,
          icono: cat.icono,
          orden: cat.orden ?? 0,
          _id: cat._id,
          sections: cat.sections.map((section) => ({
            ...section,
            links: section.links.map((link) => ({ ...link })),
          })),
        }));

        setCategories(formattedCategories);
        toastSuccess("Categoría actualizada correctamente");
      } else {
        await categoryService.createCategory(categoryPayload);

        // Crea de una vez una sección "General" real para esta categoría,
        // para no depender del placeholder automático (que no es editable
        // ni eliminable porque no existe en la base de datos).
        await categoryService.createCategory({
          categoria: normalizedId,
          nombre_categoria: newCategory.name.trim(),
          subcategoria: "general",
          nombre_subcategoria: "General",
        });

        // Clear global cache to force refresh in all components
        clearCategoryCache();

        // Reload fresh data from API
        const freshData = await getCategoryData();
        const formattedCategories = freshData.map((cat) => ({
          id: cat.id,
          name: cat.name,
          icono: cat.icono,
          orden: cat.orden ?? 0,
          _id: cat._id,
          sections: cat.sections.map((section) => ({
            ...section,
            links: section.links.map((link) => ({ ...link })),
          })),
        }));

        setCategories(formattedCategories);
        toastSuccess("Categoría creada correctamente, con su sección \"General\" lista para editar.");
      }

      clearForms();
    } catch (error: any) {
      toastError(error.message || "Error al guardar categoría");
    }
  };

  const saveSection = async () => {
    if (!newSection.title.trim() || !newSection.categoryId) {
      toastError("Completa todos los campos de la sección");
      return;
    }

    // Igual que con la categoría: al editar se conserva el id original.
    const normalizedSubcategory = editingSection
      ? newSection.subcategoria.trim().toLowerCase().replace(/\s+/g, "-")
      : generateSlug(newSection.title);

    const parentCategory = categories.find(
      (cat) => cat.id === newSection.categoryId
    );

    if (!parentCategory) {
      toastError("Categoría padre no encontrada");
      return;
    }

    const sectionPayload: CategoriaCreate = {
      categoria: newSection.categoryId,
      nombre_categoria: parentCategory.name,
      subcategoria: normalizedSubcategory,
      nombre_subcategoria: newSection.title.trim(),
    };

    try {
      if (editingSection) {
        const updatePayload: CategoriaUpdate = {
          subcategoria: normalizedSubcategory,
          nombre_subcategoria: newSection.title.trim(),
        };

        await categoryService.updateCategory(editingSection, updatePayload);
        await refreshCache();

        toastSuccess("Sección actualizada correctamente");
      } else {
        await categoryService.createCategory(sectionPayload);
        await refreshCache();

        toastSuccess("Sección creada correctamente");
      }

      setEditingSection(null);
      setNewSection({ title: "", subcategoria: "", categoryId: "" });
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Error al guardar sección");
    }
  };

  const saveLink = async () => {
    if (!newLink.label.trim() || !newLink.sectionId || !newLink.categoryId) {
      toastError("Completa todos los campos del enlace");
      return;
    }

    // Igual que con categoría y sección: al editar se conserva el id original.
    const normalizedTipo = editingLink
      ? newLink.tipo.trim().toLowerCase().replace(/\s+/g, "-")
      : generateSlug(newLink.label);

    const parentCategory = categories.find(
      (cat) => cat.id === newLink.categoryId
    );

    const parentSection = parentCategory?.sections.find(
      (sec) => sec.subcategoria === newLink.sectionId
    );

    if (!parentCategory || !parentSection) {
      toastError("Categoría o sección padre no encontrada");
      return;
    }

    const linkPayload: CategoriaCreate = {
      categoria: newLink.categoryId,
      nombre_categoria: parentCategory.name,
      subcategoria: newLink.sectionId,
      nombre_subcategoria: parentSection.title,
      tipo: normalizedTipo,
      nombre_tipo: newLink.label.trim(),
    };

    try {
      if (editingLink) {
        const updatePayload: CategoriaUpdate = {
          tipo: normalizedTipo,
          nombre_tipo: newLink.label.trim(),
        };

        await categoryService.updateCategory(editingLink, updatePayload);
        await refreshCache();

        toastSuccess("Enlace actualizado correctamente");
      } else {
        await categoryService.createCategory(linkPayload);
        await refreshCache();

        toastSuccess("Enlace creado correctamente");
      }

      setEditingLink(null);
      setNewLink({
        label: "",
        tipo: "",
        sectionId: "",
        categoryId: "",
      });
    } catch (error: any) {
      toastError(error?.response?.data?.message || "Error al guardar enlace");
    }
  };

  // Mueve una categoría raíz un lugar hacia arriba/abajo en el orden en que
  // se muestran en el home ("Comprá por categoría") y el navbar. En vez de
  // solo intercambiar el `orden` de las dos categorías involucradas (que no
  // sirve de nada la primera vez, cuando todas arrancan en 0), renumera TODA
  // la lista según la posición que quedaría tras el swap — así funciona
  // siempre, sin depender de que ya existan valores de orden distintos.
  const moveCategory = async (categoryId: string, direction: "up" | "down") => {
    const index = categories.findIndex((c) => (c._id || c.id) === categoryId);
    if (index === -1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    const sinId = reordered.find((c) => !c._id);
    if (sinId) {
      toastError(
        `"${sinId.name}" todavía no tiene id en la base de datos (recargá la página con "Actualizar Caché" e intentá de nuevo).`
      );
      return;
    }

    try {
      await Promise.all(
        reordered.map((cat, i) => categoryService.updateCategory(cat._id as string, { orden: i }))
      );
      await refreshCache();
    } catch (error: any) {
      toastError(error.message || "Error al reordenar categorías");
    }
  };

  const deleteCategory = async (categoryId: string) => {
    const confirmado = await confirmDialog(
      "¿Estás seguro de eliminar esta categoría? Se eliminarán todas sus secciones y enlaces.",
      { title: "Eliminar categoría", confirmText: "Eliminar", danger: true }
    );
    if (!confirmado) return;

    try {
      await categoryService.deleteCategory(categoryId);
      clearCategoryCache();

      setCategories((prev) =>
        prev.filter((category) => (category._id || category.id) !== categoryId)
      );
      toastSuccess("Categoría eliminada correctamente");
    } catch (error: any) {
      toastError(error.message || "Error al eliminar categoría");
    }
  };

  const deleteSection = async (sectionId: string) => {
    const confirmado = await confirmDialog(
      "¿Estás seguro de eliminar esta sección? Se eliminarán todos sus enlaces.",
      { title: "Eliminar sección", confirmText: "Eliminar", danger: true }
    );
    if (!confirmado) return;

    try {
      await categoryService.deleteCategory(sectionId);
      clearCategoryCache();

      setCategories((prev) =>
        prev.map((category) => ({
          ...category,
          sections: category.sections.filter(
            (section) => (section._id || section.subcategoria) !== sectionId
          ),
        }))
      );

      toastSuccess("Sección eliminada correctamente");
    } catch (error: any) {
      toastError(error.message || "Error al eliminar sección");
    }
  };

  const deleteLink = async (linkId: string) => {
    const confirmado = await confirmDialog("¿Estás seguro de eliminar este enlace?", {
      title: "Eliminar enlace",
      confirmText: "Eliminar",
      danger: true,
    });
    if (!confirmado) return;

    try {
      await categoryService.deleteCategory(linkId);
      clearCategoryCache();

      setCategories((prev) =>
        prev.map((category) => ({
          ...category,
          sections: category.sections.map((section) => ({
            ...section,
            links: section.links.filter((link) => (link._id || link.tipo) !== linkId),
          })),
        }))
      );

      toastSuccess("Enlace eliminado correctamente");
    } catch (error: any) {
      toastError(error.message || "Error al eliminar enlace");
    }
  };

  return (
    <div className="category-manager-page">
      <div className="category-manager-container">
        <div className="category-manager-header">
          <div>
            <h1>Gestión de Categorías</h1>
            <p>Administra categorías, secciones y tipos con una vista más limpia y profesional.</p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={refreshCache}
              title="Actualizar caché de categorías"
            >
              <FaSave />
              Actualizar Caché
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/admin/add-product")}
            >
              Volver a Productos
            </button>
          </div>
        </div>

        <div className="category-manager-layout">
          <aside className="category-manager-sidebar">
            <div className="admin-form-card">
              <h2>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</h2>

              <div className="form-row column">
                <input
                  type="text"
                  placeholder="Nombre de categoría (ej: Computadoras)"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="Emoji (opcional, ej: 🖥️)"
                  title="Se usa como ícono de esta categoría. Si lo dejás vacío, se elige uno automático según el nombre."
                  value={newCategory.icono}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, icono: e.target.value })
                  }
                  className="form-input"
                  maxLength={8}
                />
                <button type="button" onClick={saveCategory} className="primary-btn">
                  {editingCategory ? <FaSave /> : <FaPlus />}
                  {editingCategory ? "Actualizar" : "Agregar"}
                </button>
                {(editingCategory || newCategory.name || newCategory.id) && (
                  <button type="button" onClick={clearForms} className="secondary-btn">
                    <FaTimes />
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <div className="admin-form-card filters-card">
              <h2>Filtros</h2>

              <div className="filter-stack">
                <div className="filter-field">
                  <label>Buscar</label>
                  <input
                    type="text"
                    placeholder="Categorías, secciones o tipos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="filter-field">
                  <label>Categoría</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Subcategoría</label>
                  <select
                    value={subcategoryFilter}
                    onChange={(e) => setSubcategoryFilter(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Todas las subcategorías</option>
                    {allSubcategories.map((subcategory) => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Tipo</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Todos los tipos</option>
                    {allTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("");
                    setSubcategoryFilter("");
                    setTypeFilter("");
                    setCurrentPage(1);
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </aside>

          <div className="category-manager-content">
            <div className="category-summary-bar">
              <span>{filteredCategories.length} categorías visibles</span>
            </div>

            {paginatedCategories.map((category) => {
              const categoryId = category._id || category.id;
              const globalIndex = categories.findIndex(
                (c) => (c._id || c.id) === categoryId
              );

              return (
              <div key={categoryId} className="category-section">
                <div className="category-header">
                  <div>
                    <h3>
                      <span className="category-icon-preview" aria-hidden="true">
                        {getCategoryIcon(category.name, category.id, category.icono)}
                      </span>
                      {category.name}
                    </h3>
                    <p>{category.id}</p>
                  </div>

                  <div className="category-actions">
                    {canReorder && (
                      <>
                        <button
                          type="button"
                          className="icon-btn move-btn"
                          title="Subir"
                          disabled={globalIndex <= 0}
                          onClick={() => moveCategory(categoryId, "up")}
                        >
                          <FaArrowUp />
                        </button>
                        <button
                          type="button"
                          className="icon-btn move-btn"
                          title="Bajar"
                          disabled={globalIndex < 0 || globalIndex >= categories.length - 1}
                          onClick={() => moveCategory(categoryId, "down")}
                        >
                          <FaArrowDown />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="icon-btn edit-btn"
                      onClick={() => {
                        const categoryId = category._id || category.id;
                        setEditingCategory(categoryId);
                        setNewCategory({
                          name: category.name,
                          id: category.id,
                          icono: category.icono || "",
                        });
                        setEditingSection(null);
                        setEditingLink(null);
                      }}
                    >
                      <FaEdit />
                    </button>

                    <button
                      type="button"
                      className="icon-btn delete-btn"
                      onClick={() => deleteCategory(category._id || category.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <div className="sub-form">
                  <h4>{editingSection ? "Editar Sección" : "Agregar Sección"}</h4>

                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Título de sección"
                      value={newSection.categoryId === category.id ? newSection.title : ""}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          title: e.target.value,
                          categoryId: category.id,
                        })
                      }
                      className="form-input small"
                    />
                  </div>

                  {newSection.categoryId === category.id &&
                    (newSection.title || newSection.subcategoria) && (
                      <div className="form-row actions-row">
                        <button
                          type="button"
                          onClick={saveSection}
                          className="primary-btn small"
                        >
                          <FaSave />
                          Guardar Sección
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSection(null);
                            setNewSection({
                              title: "",
                              subcategoria: "",
                              categoryId: "",
                            });
                          }}
                          className="secondary-btn small"
                        >
                          <FaTimes />
                          Cancelar
                        </button>
                      </div>
                    )}
                </div>

                <div className="sections-list">
                  {category.sections.map((section) => (
                    <div key={section._id || section.subcategoria} className="section-item">
                      <div className="section-header">
                        <div>
                          <h5>{section.title}</h5>
                          <p>{section.subcategoria}</p>
                        </div>

                        <div className="section-actions">
                          <button
                            type="button"
                            className="icon-btn edit-btn small"
                            onClick={() => {
                              if (!section._id) {
                                toastError(
                                  "Esta sección todavía no existe en la base de datos (es la sección \"General\" automática). Primero creála con el formulario \"Agregar Sección\" de esta categoría; luego sí vas a poder editarla o eliminarla."
                                );
                                return;
                              }

                              setEditingSection(section._id);
                              setNewSection({
                                title: section.title,
                                subcategoria: section.subcategoria,
                                categoryId: category.id,
                              });
                              setEditingLink(null);
                            }}
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            className="icon-btn delete-btn small"
                            onClick={() => {
                              if (!section._id) {
                                toastError(
                                  "Esta sección todavía no existe en la base de datos (es la sección \"General\" automática). Primero creála con el formulario \"Agregar Sección\" de esta categoría; luego sí vas a poder editarla o eliminarla."
                                );
                                return;
                              }

                              deleteSection(section._id);
                            }}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      <div className="sub-form inner-sub-form">
                        <h6>{editingLink ? "Editar Tipo" : "Agregar Tipo / Enlace"}</h6>

                        <div className="form-row">
                          <input
                            type="text"
                            placeholder="Label visible"
                            value={newLink.sectionId === section.subcategoria ? newLink.label : ""}
                            onChange={(e) =>
                              setNewLink({
                                ...newLink,
                                label: e.target.value,
                                sectionId: section.subcategoria,
                                categoryId: category.id,
                              })
                            }
                            className="form-input small"
                          />
                        </div>

                        {newLink.sectionId === section.subcategoria &&
                          (newLink.label || newLink.tipo) && (
                            <div className="form-row actions-row">
                              <button
                                type="button"
                                onClick={saveLink}
                                className="primary-btn small"
                              >
                                <FaSave />
                                Guardar Tipo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLink(null);
                                  setNewLink({
                                    label: "",
                                    tipo: "",
                                    sectionId: "",
                                    categoryId: "",
                                  });
                                }}
                                className="secondary-btn small"
                              >
                                <FaTimes />
                                Cancelar
                              </button>
                            </div>
                          )}
                      </div>

                      <div className="links-list">
                        {section.links.map((link) => (
                          <div key={link._id || link.tipo} className="link-item">
                            <div className="link-info">
                              <span className="link-label">{link.label}</span>
                              <span className="link-type">{link.tipo}</span>
                            </div>

                            <div className="link-actions">
                              <button
                                type="button"
                                className="icon-btn edit-btn tiny"
                                onClick={() => {
                                  if (!link._id) {
                                    toastError(
                                      "Este tipo todavía no existe en la base de datos. Primero creá la sección real (\"Agregar Sección\") y luego agregá el tipo con \"Agregar Tipo / Enlace\"."
                                    );
                                    return;
                                  }

                                  setEditingLink(link._id);

                                  setNewLink({
                                    label: link.label || "",
                                    tipo: link.tipo || "",
                                    sectionId: section.subcategoria,
                                    categoryId: category.id,
                                  });

                                  setEditingSection(null);
                                }}
                              >
                                <FaEdit />
                              </button>

                              <button
                                type="button"
                                className="icon-btn delete-btn tiny"
                                onClick={() => {
                                  if (!link._id) {
                                    toastError(
                                      "Este tipo todavía no existe en la base de datos. Primero creá la sección real (\"Agregar Sección\") y luego agregá el tipo con \"Agregar Tipo / Enlace\"."
                                    );
                                    return;
                                  }

                                  deleteLink(link._id);
                                }}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}

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
  );
};

export default CategoryManager;