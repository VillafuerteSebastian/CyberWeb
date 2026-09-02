import { supabase } from "../lib/supabaseClient";

export type OrderStatus = "PENDING" | "ACCEPTED" | "SHIPPED" | "CANCELLED";

export interface OrdenItemRow {
  id: string;
  orden_id: string;
  product_id: string | null;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  available: boolean | null;
}

export interface OrdenRow {
  id: string;
  order_number: number;
  user_id: string;
  customer_name: string;
  customer_email: string;
  phone: string | null;
  address: string | null;
  delivery_method: string | null;
  zona_entrega: string | null;
  status: OrderStatus;
  motivo: string | null;
  shipping_cost: number;
  subtotal: number;
  total: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
  orden_items: OrdenItemRow[];
}

export interface CreateOrderInput {
  productos: Array<{ product_id: string; cantidad: number }>;
  delivery_method: string;
  zona_entrega: string | null;
  address: string;
  shipping_cost: number;
}

export interface CreateOrderResult {
  order_id: string;
  order_number: number;
  total: number;
}

type Address = {
  direccion: string;
  predeterminada?: boolean;
};

class OrderService {
  /**
   * Crea una orden vía RPC (el precio se calcula en el servidor a partir
   * del product_id, el cliente nunca decide el precio final).
   */
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const { data, error } = await supabase.rpc("create_order", {
      items: input.productos,
      delivery_method: input.delivery_method,
      zona_entrega: input.zona_entrega,
      address: input.address,
      shipping_cost: input.shipping_cost,
    });

    if (error) {
      console.error("Error creando la orden:", error);
      throw new Error(error.message);
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      order_id: row?.order_id,
      order_number: row?.order_number,
      total: Number(row?.total ?? 0),
    };
  }

  async getMyOrders(): Promise<OrdenRow[]> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;

    if (!uid) return [];

    const { data, error } = await supabase
      .from("ordenes")
      .select("*, orden_items(*)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error obteniendo mis pedidos:", error);
      throw new Error(error.message);
    }

    return (data as OrdenRow[]) || [];
  }

  async getAllOrders(): Promise<OrdenRow[]> {
    const { data, error } = await supabase
      .from("ordenes")
      .select("*, orden_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error obteniendo pedidos:", error);
      throw new Error(error.message);
    }

    return (data as OrdenRow[]) || [];
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    motivo?: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from("ordenes")
      .update({
        status,
        motivo: motivo ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Error actualizando estado del pedido:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Actualiza la disponibilidad de items de una orden.
   * `itemsAvailability` está indexado por el id del orden_item.
   */
  async updateItemsAvailability(
    itemsAvailability: Record<string, boolean>
  ): Promise<void> {
    const entries = Object.entries(itemsAvailability);

    const results = await Promise.all(
      entries.map(([itemId, available]) =>
        supabase.from("orden_items").update({ available }).eq("id", itemId)
      )
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error("Error actualizando disponibilidad:", failed.error);
      throw new Error(failed.error.message);
    }
  }

  /**
   * Actualiza las direcciones guardadas del perfil del usuario autenticado.
   */
  async updateAddresses(direcciones: Address[]): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;

    if (!uid) {
      throw new Error("Debes iniciar sesión");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ direcciones, updated_at: new Date().toISOString() })
      .eq("id", uid);

    if (error) {
      console.error("Error actualizando direcciones:", error);
      throw new Error(error.message);
    }
  }
}

export default new OrderService();
