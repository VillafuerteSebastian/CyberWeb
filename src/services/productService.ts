import { supabase, PRODUCT_IMAGES_BUCKET } from "../lib/supabaseClient";

export type ProductoTipo = {
  tipo: string;
};

export type ProductoVariante = {
  nombre: string;
  valor: string;
  precio_adicional?: number;
};

export interface ProductoRow {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  precio_oferta: number | null;
  categoria: string;
  marca: string;
  tipos: ProductoTipo[];
  stock: number;
  image: string;
  images: string[];
  available: boolean;
  bullets: string[];
  variantes: ProductoVariante[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductoCreate {
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_oferta?: number | null;
  categoria: string;
  marca?: string;
  tipos?: ProductoTipo[];
  stock?: number;
  image?: string;
  images?: string[];
  available?: boolean;
  bullets?: string[];
  variantes?: ProductoVariante[];
}

export type ProductoUpdate = Partial<ProductoCreate> & { available?: boolean };

export interface GetProductsParams {
  page?: number;
  limit?: number;
  categoria?: string;
}

export interface GetProductsResult {
  data: ProductoRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const TABLE = "productos";

/** true si el producto tiene un precio de oferta válido (menor al regular). */
export const isOnSale = (
  precio: number,
  precioOferta?: number | null
): boolean => precioOferta != null && precioOferta > 0 && precioOferta < precio;

/** Precio que se debe mostrar/cobrar: el de oferta si es válido, si no el regular. */
export const getEffectivePrice = (
  precio: number,
  precioOferta?: number | null
): number => (isOnSale(precio, precioOferta) ? (precioOferta as number) : precio);

class ProductService {
  async getProducts(params: GetProductsParams = {}): Promise<GetProductsResult> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.categoria) {
      query = query.eq("categoria", params.categoria);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error obteniendo productos:", error);
      throw new Error(error.message);
    }

    const rows = (data || []) as ProductoRow[];
    const total = count ?? rows.length;

    return {
      data: rows,
      total,
      page,
      limit,
      hasMore: from + rows.length < total,
    };
  }

  async getProductById(id: string): Promise<ProductoRow | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error) {
      console.error("Error obteniendo producto por ID:", error);
      throw new Error(error.message);
    }

    return (data as ProductoRow) || null;
  }

  async createProduct(payload: ProductoCreate): Promise<ProductoRow> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        nombre: payload.nombre,
        descripcion: payload.descripcion || "",
        precio: payload.precio,
        precio_oferta: payload.precio_oferta ?? null,
        categoria: payload.categoria,
        marca: payload.marca || "N/A",
        tipos: payload.tipos || [],
        stock: payload.stock ?? 0,
        image: payload.image || "",
        images: payload.images || [],
        available: payload.available !== false,
        bullets: payload.bullets || [],
        variantes: payload.variantes || [],
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creando producto:", error);
      throw new Error(error.message);
    }

    return data as ProductoRow;
  }

  async updateProduct(id: string, payload: ProductoUpdate): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando producto:", error);
      throw new Error(error.message);
    }
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error eliminando producto:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Sube una imagen de producto a Supabase Storage y devuelve su URL pública.
   */
  async uploadProductImage(file: File): Promise<string> {
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Error subiendo imagen de producto:", error);
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }
}

export default new ProductService();
