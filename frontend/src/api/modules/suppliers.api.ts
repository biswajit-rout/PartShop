import { apiClient } from "../client";
import { Supplier, SparePart } from "@/types";
import { BackendSparePart, mapBackendPartToFrontend, PaginatedPartsResponse } from "./parts.api";

export interface BackendSupplier {
  id: number;
  name: string;
  contact_person?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  default_discount_percentage: string | number;
  total_parts_count: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function mapBackendSupplierToFrontend(s: BackendSupplier): Supplier {
  return {
    id: s.id,
    name: s.name,
    contactName: s.contact_person || "",
    contactPerson: s.contact_person || "",
    mobile: s.phone,
    phone: s.phone,
    email: s.email || "",
    address: s.address || "",
    gstNumber: s.gst_number || "Unregistered",
    defaultDiscountPercentage: Number(s.default_discount_percentage || 0),
    totalPartsCount: s.total_parts_count || 0,
    totalPurchases: s.total_parts_count || 0,
    isActive: s.is_active,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

export const suppliersApi = {
  /**
   * Fetch all wholesale suppliers and distributors.
   */
  async getAll(activeOnly: boolean = false): Promise<Supplier[]> {
    const data = await apiClient<BackendSupplier[]>("/suppliers", {
      params: { active_only: activeOnly ? "true" : undefined },
      cache: "no-store",
    });
    return (data || []).map(mapBackendSupplierToFrontend);
  },

  /**
   * Get single supplier details.
   */
  async getById(id: number | string): Promise<Supplier> {
    const data = await apiClient<BackendSupplier>(`/suppliers/${id}`, {
      cache: "no-store",
    });
    return mapBackendSupplierToFrontend(data);
  },

  /**
   * Register a new supplier partner.
   */
  async create(supplierData: {
    name: string;
    contact_person?: string;
    phone: string;
    email?: string;
    address?: string;
    gst_number?: string;
    default_discount_percentage?: number;
    is_active?: boolean;
  }): Promise<Supplier> {
    const data = await apiClient<BackendSupplier>("/suppliers", {
      method: "POST",
      body: JSON.stringify(supplierData),
    });
    return mapBackendSupplierToFrontend(data);
  },

  /**
   * Update supplier contact or default discount percentage.
   */
  async update(
    id: number | string,
    supplierData: {
      name?: string;
      contact_person?: string;
      phone?: string;
      email?: string;
      address?: string;
      gst_number?: string;
      default_discount_percentage?: number;
      is_active?: boolean;
    }
  ): Promise<Supplier> {
    const data = await apiClient<BackendSupplier>(`/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(supplierData),
    });
    return mapBackendSupplierToFrontend(data);
  },

  /**
   * Delete supplier.
   */
  async delete(id: number | string): Promise<void> {
    await apiClient<void>(`/suppliers/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Retrieve all spare parts mapped to a specific supplier.
   */
  async getSupplierParts(id: number | string): Promise<SparePart[]> {
    const data = await apiClient<PaginatedPartsResponse>(`/suppliers/${id}/parts`, {
      params: { limit: 500 },
      cache: "no-store",
    });
    return (data.items || []).map(mapBackendPartToFrontend);
  },
};
