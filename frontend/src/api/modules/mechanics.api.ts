import { apiClient } from "../client";
import { Mechanic, MechanicItemRecord, MechanicSummary } from "@/types";

export interface BackendMechanicCommission {
  id: number;
  mechanic_id: number;
  brand_id: number;
  brand_name?: string | null;
  commission_percentage: string | number;
}

export interface BackendMechanic {
  id: number;
  name: string;
  phone: string;
  garage_name?: string | null;
  address?: string | null;
  default_commission_percentage: string | number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand_commissions?: BackendMechanicCommission[];
}

export function mapBackendMechanicToFrontend(m: BackendMechanic): Mechanic {
  const defaultPct = Number(m.default_commission_percentage || 5);
  return {
    id: String(m.id),
    name: m.name,
    garageName: m.garage_name || m.name,
    mobile: m.phone,
    phone: m.phone,
    address: m.address || "",
    defaultCommissionPercentage: defaultPct,
    commissionPercentage: defaultPct,
    pendingCommission: 0,
    isActive: m.is_active,
    brandCommissions: (m.brand_commissions || []).map((bc) => ({
      id: bc.id,
      mechanicId: bc.mechanic_id,
      brandId: bc.brand_id,
      brandName: bc.brand_name || undefined,
      commissionPercentage: Number(bc.commission_percentage),
    })),
  };
}

export const mechanicsApi = {
  async getAll(activeOnly: boolean = false): Promise<Mechanic[]> {
    const data = await apiClient<BackendMechanic[]>("/mechanics", {
      params: { active_only: activeOnly },
      cache: "no-store",
    });
    return (data || []).map(mapBackendMechanicToFrontend);
  },

  async getById(id: number | string): Promise<Mechanic> {
    const data = await apiClient<BackendMechanic>(`/mechanics/${id}`, {
      cache: "no-store",
    });
    return mapBackendMechanicToFrontend(data);
  },

  async create(payload: {
    name: string;
    phone: string;
    garage_name?: string;
    address?: string;
    default_commission_percentage: number;
    commissions?: { brand_id: number; commission_percentage: number }[];
  }): Promise<Mechanic> {
    const data = await apiClient<BackendMechanic>("/mechanics", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapBackendMechanicToFrontend(data);
  },

  async update(
    id: number | string,
    payload: {
      name?: string;
      phone?: string;
      garage_name?: string;
      address?: string;
      default_commission_percentage?: number;
      is_active?: boolean;
      commissions?: { brand_id: number; commission_percentage: number }[];
    }
  ): Promise<Mechanic> {
    const data = await apiClient<BackendMechanic>(`/mechanics/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return mapBackendMechanicToFrontend(data);
  },

  async delete(id: number | string): Promise<void> {
    await apiClient<void>(`/mechanics/${id}`, {
      method: "DELETE",
    });
  },

  async getItems(
    mechanicId: number | string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<MechanicItemRecord[]> {
    const data = await apiClient<any[]>(`/mechanics/${mechanicId}/items`, {
      params,
      cache: "no-store",
    });
    return (data || []).map((row) => ({
      saleId: row.sale_id,
      invoiceNumber: row.invoice_number,
      date: row.date,
      sparePartId: row.spare_part_id,
      itemName: row.item_name,
      partNumber: row.part_number,
      brandName: row.brand_name,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      totalPrice: Number(row.total_price),
      commissionPercentage: Number(row.commission_percentage),
      commissionAmount: Number(row.commission_amount),
      customerName: row.customer_name || undefined,
      customerPhone: row.customer_phone || undefined,
    }));
  },

  async getSummary(
    mechanicId: number | string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<MechanicSummary> {
    const data = await apiClient<any>(`/mechanics/${mechanicId}/summary`, {
      params,
      cache: "no-store",
    });
    return {
      mechanicId: data.mechanic_id,
      mechanicName: data.mechanic_name,
      garageName: data.garage_name || undefined,
      totalItemsTaken: Number(data.total_items_taken || 0),
      totalSalesVolume: Number(data.total_sales_volume || 0),
      totalCommissionEarned: Number(data.total_commission_earned || 0),
    };
  },
};
