export type ProductType = {
  tipo: string;
};

export type Product = {
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
  available?: boolean;
  bullets?: string[];
  variantes?: Array<{
    nombre: string;
    valor: string;
    precio_adicional?: number;
  }>;
  created_at?: string;
  updated_at?: string;
};

export type ProductFilter = {
  categoria?: string;
  subcategoria?: string;
  tipo?: string;
  marca?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyInStock?: boolean;
  search?: string;
  sortOrder?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';
};

export type ProductApiResponse = {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
