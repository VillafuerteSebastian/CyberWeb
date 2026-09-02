import { supabase } from "../lib/supabaseClient";

export interface Categoria {
  _id?: string;
  id?: string;
  categoria: string;
  nombre_categoria: string;
  subcategoria?: string;
  nombre_subcategoria?: string;
  tipo?: string;
  nombre_tipo?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface CategoriaCreate {
  categoria: string;
  nombre_categoria: string;
  subcategoria?: string;
  nombre_subcategoria?: string;
  tipo?: string;
  nombre_tipo?: string;
}

export interface CategoriaUpdate {
  categoria?: string;
  nombre_categoria?: string;
  subcategoria?: string;
  nombre_subcategoria?: string;
  tipo?: string;
  nombre_tipo?: string;
}

export interface CategoriaUnica {
  _id: string;
  nombre: string;
}

export interface SubcategoriaPorCategoria {
  _id: string;
  nombre: string;
}

export interface TipoPorCategoriaSubcategoria {
  _id: string;
  nombre: string;
}

export interface ArbolCategoria {
  categoria: string;
  nombre_categoria: string;
  subcategorias: {
    [key: string]: {
      nombre: string;
      tipos: {
        tipo: string;
        nombre: string;
      }[];
    };
  };
}

const TABLE = "categorias";

const rowToCategoria = (row: any): Categoria => ({
  _id: row.id,
  id: row.categoria,
  categoria: row.categoria,
  nombre_categoria: row.nombre_categoria,
  subcategoria: row.subcategoria || undefined,
  nombre_subcategoria: row.nombre_subcategoria || undefined,
  tipo: row.tipo || undefined,
  nombre_tipo: row.nombre_tipo || undefined,
  created_at: row.created_at,
  updated_at: row.updated_at,
  is_deleted: row.is_deleted,
});

/**
 * Agrupa las filas planas de `categorias` en el árbol categoria -> subcategorias -> tipos
 * que ya consume el resto del frontend (categoryData.tsx).
 */
const buildCategoryTree = (rows: Categoria[]): ArbolCategoria[] => {
  const byCategoria = new Map<string, Categoria[]>();

  rows.forEach((row) => {
    if (!byCategoria.has(row.categoria)) {
      byCategoria.set(row.categoria, []);
    }
    byCategoria.get(row.categoria)!.push(row);
  });

  const tree: ArbolCategoria[] = [];

  byCategoria.forEach((catRows, categoria) => {
    const nombre_categoria =
      catRows.find((r) => r.nombre_categoria)?.nombre_categoria || categoria;

    const subcategorias: ArbolCategoria["subcategorias"] = {};

    catRows.forEach((row) => {
      if (!row.subcategoria) return;

      if (!subcategorias[row.subcategoria]) {
        subcategorias[row.subcategoria] = {
          nombre: row.nombre_subcategoria || row.subcategoria,
          tipos: [],
        };
      } else if (row.nombre_subcategoria) {
        subcategorias[row.subcategoria].nombre = row.nombre_subcategoria;
      }

      if (row.tipo) {
        subcategorias[row.subcategoria].tipos.push({
          tipo: row.tipo,
          nombre: row.nombre_tipo || row.tipo,
        });
      }
    });

    tree.push({ categoria, nombre_categoria, subcategorias });
  });

  return tree;
};

class CategoryService {
  async getAllCategories(): Promise<Categoria[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map(rowToCategoria);
    } catch (error) {
      console.error("Error obteniendo todas las categorías:", error);
      throw this.handleError(error);
    }
  }

  async getCategoryTree(): Promise<ArbolCategoria[]> {
    try {
      const allCategories = await this.getAllCategories();
      return buildCategoryTree(allCategories);
    } catch (error) {
      console.error("Error obteniendo árbol de categorías:", error);
      throw this.handleError(error);
    }
  }

  async getUniqueCategories(): Promise<CategoriaUnica[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("is_deleted", false)
        .is("subcategoria", null);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        _id: row.id,
        nombre: row.nombre_categoria,
      }));
    } catch (error) {
      console.error("Error obteniendo categorías únicas:", error);
      throw this.handleError(error);
    }
  }

  async getSubcategoriesByCategory(category: string): Promise<SubcategoriaPorCategoria[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("is_deleted", false)
        .eq("categoria", category)
        .not("subcategoria", "is", null)
        .is("tipo", null);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        _id: row.id,
        nombre: row.nombre_subcategoria,
      }));
    } catch (error) {
      console.error("Error obteniendo subcategorías:", error);
      throw this.handleError(error);
    }
  }

  async getTypesByCategoryAndSubcategory(
    category: string,
    subcategory: string
  ): Promise<TipoPorCategoriaSubcategoria[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("is_deleted", false)
        .eq("categoria", category)
        .eq("subcategoria", subcategory)
        .not("tipo", "is", null);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        _id: row.id,
        nombre: row.nombre_tipo,
      }));
    } catch (error) {
      console.error("Error obteniendo tipos:", error);
      throw this.handleError(error);
    }
  }

  async getCategoryById(categoryId: string): Promise<Categoria | null> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("id", categoryId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return rowToCategoria(data);
    } catch (error) {
      console.error("Error obteniendo categoría por ID:", error);
      throw this.handleError(error);
    }
  }

  async createCategory(categoryData: CategoriaCreate): Promise<{ id: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          categoria: categoryData.categoria,
          nombre_categoria: categoryData.nombre_categoria,
          subcategoria: categoryData.subcategoria || null,
          nombre_subcategoria: categoryData.nombre_subcategoria || null,
          tipo: categoryData.tipo || null,
          nombre_tipo: categoryData.nombre_tipo || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      return { id: data.id };
    } catch (error) {
      console.error("Error creando categoría:", error);
      throw this.handleError(error);
    }
  }

  async updateCategory(categoryId: string, data: CategoriaUpdate): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLE)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", categoryId);

      if (error) throw error;
    } catch (error) {
      console.error("Error actualizando categoría:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Elimina (soft delete) una categoría/sección/tipo y, en cascada, todo lo
   * que cuelgue de ella: si es una categoría raíz elimina toda su rama, si es
   * una sección elimina sus tipos, y si es un tipo elimina solo esa fila.
   */
  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const { data: target, error: fetchError } = await supabase
        .from(TABLE)
        .select("*")
        .eq("id", categoryId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!target) return;

      let error;

      if (target.tipo) {
        ({ error } = await supabase.from(TABLE).update({ is_deleted: true }).eq("id", categoryId));
      } else if (target.subcategoria) {
        ({ error } = await supabase
          .from(TABLE)
          .update({ is_deleted: true })
          .eq("categoria", target.categoria)
          .eq("subcategoria", target.subcategoria));
      } else {
        ({ error } = await supabase.from(TABLE).update({ is_deleted: true }).eq("categoria", target.categoria));
      }

      if (error) throw error;
    } catch (error) {
      console.error("Error eliminando categoría:", error);
      throw this.handleError(error);
    }
  }

  async getCategoriesData(): Promise<{
    categories: CategoriaUnica[];
    categoryTree: ArbolCategoria[];
    allCategories: Categoria[];
  }> {
    try {
      const [categories, categoryTree, allCategories] = await Promise.all([
        this.getUniqueCategories().catch((err) => {
          console.warn("Error getting unique categories, using empty array:", err);
          return [];
        }),
        this.getCategoryTree().catch((err) => {
          console.warn("Error getting category tree, using empty array:", err);
          return [];
        }),
        this.getAllCategories().catch((err) => {
          console.warn("Error getting all categories, using empty array:", err);
          return [];
        }),
      ]);

      return { categories, categoryTree, allCategories };
    } catch (error) {
      console.error("Error obteniendo datos combinados de categorías:", error);
      return { categories: [], categoryTree: [], allCategories: [] };
    }
  }

  private handleError(error: any): Error {
    const message = error?.message || "Error desconocido en el servicio de categorías";
    return new Error(message);
  }

  static formatCategoryForFrontend(category: Categoria): {
    id: string;
    name: string;
    sections?: Array<{
      subcategoria: string;
      links: Array<{ tipo: string; label: string }>;
    }>;
  } {
    const result: any = {
      id: category.categoria,
      name: category.nombre_categoria,
    };

    if (category.subcategoria && category.tipo) {
      result.sections = [
        {
          subcategoria: category.subcategoria,
          links: [{ tipo: category.tipo, label: category.nombre_tipo || category.tipo }],
        },
      ];
    }

    return result;
  }

  static convertTreeToCategoryData(tree: ArbolCategoria[]): Array<{
    id: string;
    name: string;
    sections: Array<{
      subcategoria: string;
      links: Array<{ tipo: string; label: string }>;
    }>;
  }> {
    return tree.map((category) => ({
      id: category.categoria,
      name: category.nombre_categoria,
      sections: Object.entries(category.subcategorias).map(([subcatKey, subcatValue]) => ({
        subcategoria: subcatKey,
        links: subcatValue.tipos.map((tipo) => ({
          tipo: tipo.tipo,
          label: tipo.nombre,
        })),
      })),
    }));
  }
}

export default new CategoryService();
