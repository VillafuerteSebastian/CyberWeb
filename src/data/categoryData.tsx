import type { ReactNode } from "react";
import {
  HiComputerDesktop,
  HiPuzzlePiece,
  HiSpeakerWave,
  HiDevicePhoneMobile,
  HiWifi,
  HiPrinter,
  HiShieldCheck,
} from "react-icons/hi2";
import categoryService, { type Categoria } from "../services/categoryService";

export type CategoryLink = {
  label: string;
  to: string;
  categoria: string;
  subcategoria?: string;
  tipo?: string;
  _id?: string;
  key?: string;
};

export type CategorySection = {
  title: string;
  to: string;
  categoria: string;
  subcategoria: string;
  links: CategoryLink[];
  _id?: string;
};

export type CategoryItem = {
  id: string;
  name: string;
  icon: ReactNode;
  sections: CategorySection[];
  _id?: string;
};

// Icon mapping
const iconMap: Record<string, ReactNode> = {
  computadoras: <HiComputerDesktop />,
  gaming: <HiPuzzlePiece />,
  "audio-video": <HiSpeakerWave />,
  celulares: <HiDevicePhoneMobile />,
  conectividad: <HiWifi />,
  impresion: <HiPrinter />,
  seguridad: <HiShieldCheck />,
};

// Fallback disabled (API only)
const fallbackCategoryData: CategoryItem[] = [];

// Cache settings
const CACHE_KEY = "categoryCache";
const CACHE_VERSION_KEY = "categoryCacheVersion";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

// Convert API data
const convertApiToCategoryData = (apiData: any[], allCategories: Categoria[]): CategoryItem[] => {
  console.log("Converting API data:", apiData);

  const categoryIdMap = new Map<string, string>();
  const sectionIdMap = new Map<string, string>();
  const linkIdMap = new Map<string, string>();

  allCategories.forEach((cat) => {
    const categoria = cat.categoria;
    const subcategoria = cat.subcategoria;
    const tipo = cat.tipo;

    if (categoria && !subcategoria && !tipo && cat._id) {
      categoryIdMap.set(categoria, cat._id);
    }

    if (categoria && subcategoria && !tipo && cat._id) {
      sectionIdMap.set(`${categoria}|${subcategoria}`, cat._id);
    }

    if (categoria && subcategoria && tipo && cat._id) {
      linkIdMap.set(`${categoria}|${subcategoria}|${tipo}`, cat._id);
    }
  });

  const allKeys = new Set<string>();

  return apiData.map((cat) => {
    const category: CategoryItem = {
      id: cat.categoria,
      name: cat.nombre_categoria,
      _id: categoryIdMap.get(cat.categoria),
      icon: iconMap[cat.categoria] || <HiComputerDesktop />,
      sections: [],
    };

    if (allKeys.has(cat.categoria)) {
      console.error(`DUPLICATE CATEGORY ID FOUND: ${cat.categoria}`);
    }
    allKeys.add(cat.categoria);

    if (cat.subcategorias && typeof cat.subcategorias === "object") {
      const sectionKeys = new Set<string>();

      category.sections = Object.entries(cat.subcategorias).map(
        ([subcatKey, subcatValue]: [string, any]) => {
          const sectionKey = `${cat.categoria}-${subcatKey}`;

          if (sectionKeys.has(sectionKey)) {
            console.error(`DUPLICATE SECTION KEY FOUND: ${sectionKey}`);
          }
          sectionKeys.add(sectionKey);

          const section: CategorySection = {
            title: subcatValue.nombre || subcatKey,
            to: `/catalogo?categoria=${cat.categoria}&subcategoria=${subcatKey}`,
            categoria: cat.categoria,
            subcategoria: subcatKey,
            _id: sectionIdMap.get(`${cat.categoria}|${subcatKey}`) || subcatValue?._id,
            links: [],
          };

          if (subcatValue.tipos && Array.isArray(subcatValue.tipos)) {
            const linkKeys = new Set<string>();

            section.links = subcatValue.tipos.map((tipo: any) => {
              const linkKey = `${cat.categoria}-${subcatKey}-${tipo.tipo}`;

              if (linkKeys.has(linkKey)) {
                console.error(`DUPLICATE LINK KEY FOUND: ${linkKey}`);
              }
              linkKeys.add(linkKey);

              return {
                label: tipo.nombre || tipo.tipo,
                to: `/catalogo?categoria=${cat.categoria}&subcategoria=${subcatKey}&tipo=${tipo.tipo}`,
                categoria: cat.categoria,
                subcategoria: subcatKey,
                tipo: tipo.tipo,
                _id: linkIdMap.get(`${cat.categoria}|${subcatKey}|${tipo.tipo}`) || tipo?._id,
                key: linkKey,
              };
            });
          }

          return section;
        }
      );
    }

    // Default section if no subcategories
    if (category.sections.length === 0) {
      category.sections = [
        {
          title: "General",
          to: `/catalogo?categoria=${cat.categoria}`,
          categoria: cat.categoria,
          subcategoria: `general-${cat.categoria}`,
          links: [],
        },
      ];
    }

    return category;
  });
};

// Cache validation
const isCacheValid = (): boolean => {
  if (typeof window === "undefined") return false;

  const cachedTime = localStorage.getItem(CACHE_VERSION_KEY);
  if (!cachedTime) return false;

  const cacheAge = Date.now() - parseInt(cachedTime);
  return cacheAge < CACHE_DURATION;
};

// Save cache
const saveToCache = (data: CategoryItem[]): void => {
  if (typeof window === "undefined") return;

  try {
    // Remove React elements before storing
    const serializableData = data.map(({ icon, ...category }) => ({
      ...category,
    }));

    localStorage.setItem(CACHE_KEY, JSON.stringify(serializableData));
    localStorage.setItem(CACHE_VERSION_KEY, Date.now().toString());
  } catch (error) {
    console.warn("Failed to save categories to cache:", error);
  }
};

// Load cache
const loadFromCache = (): CategoryItem[] | null => {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);

    if (!cached || !isCacheValid()) {
      return null;
    }

    const parsedData = JSON.parse(cached);

    // Restore icons
    return parsedData.map((category: any) => ({
      ...category,
      icon: iconMap[category.id] || <HiComputerDesktop />,
    }));
  } catch (error) {
    console.warn("Failed to load categories from cache:", error);
    return null;
  }
};

// Reset cache
export const resetCategoryCache = (): void => {
  categoryDataCache = null;
};

// Evento global: se dispara cada vez que se invalida el caché de
// categorías (alta, edición o borrado de categoría/sección/tipo desde
// cualquier parte de la app). El Navbar (y cualquier otro componente que
// muestre categorías) escucha esto para refrescarse solo, sin depender de
// que el usuario recargue la página a mano — los componentes ya montados
// no se enteran de otra forma de que el módulo de caché cambió por debajo.
export const CATEGORIES_UPDATED_EVENT = "categories:updated";

const notifyCategoriesUpdated = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CATEGORIES_UPDATED_EVENT));
};

// Clear cache
export const clearCategoryCache = (): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
    resetCategoryCache();
    console.log("Category cache cleared");
  } catch (error) {
    console.error("Error clearing cache:", error);
  } finally {
    notifyCategoriesUpdated();
  }
};

// Main loader
export const getCategoryData = async (): Promise<CategoryItem[]> => {
  try {
    console.log("Loading categories from API");

    const { categoryTree, allCategories } = await categoryService.getCategoriesData();

    if (!categoryTree || categoryTree.length === 0) {
      console.warn("API returned empty data, using fallback");
      return fallbackCategoryData;
    }

    const formattedData = convertApiToCategoryData(categoryTree, allCategories);

    saveToCache(formattedData);

    return formattedData;
  } catch (error) {
    console.error("Failed to load categories from API:", error);
    return fallbackCategoryData;
  }
};

// Runtime cache
let categoryDataCache: CategoryItem[] | null = null;

// Proxy export
export const categoryData: CategoryItem[] = new Proxy(fallbackCategoryData, {
  get(_target, prop) {
    if (!categoryDataCache) {
      const cached = loadFromCache();
      categoryDataCache = cached || fallbackCategoryData;

      // Refresh async
      getCategoryData()
        .then((data) => {
          categoryDataCache = data;
        })
        .catch((error) => {
          console.warn(
            "Failed to refresh categories, using existing cache:",
            error
          );
        });
    }

    const source = categoryDataCache || fallbackCategoryData;

    if (prop === "length") return source.length;
    if (prop === "map") return source.map.bind(source);
    if (prop === "filter") return source.filter.bind(source);
    if (prop === "find") return source.find.bind(source);

    if (typeof prop === "string" && /^\d+$/.test(prop)) {
      return source[parseInt(prop)];
    }

    return source[prop as keyof CategoryItem[]];
  },

  ownKeys() {
    const source = categoryDataCache || fallbackCategoryData;
    return Reflect.ownKeys(source);
  },

  has(_target, prop) {
    const source = categoryDataCache || fallbackCategoryData;
    return prop in source;
  },

  getOwnPropertyDescriptor(_target, prop) {
    const source = categoryDataCache || fallbackCategoryData;
    return Object.getOwnPropertyDescriptor(source, prop);
  },
});

export default fallbackCategoryData;