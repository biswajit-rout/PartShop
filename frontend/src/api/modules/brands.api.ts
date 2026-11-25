import { apiClient } from "../client";
import { Brand } from "@/types";

export interface BackendBrand {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export function mapBackendBrandToFrontend(b: BackendBrand): Brand {
  return {
    id: b.id,
    name: b.name,
    code: b.code || "",
    description: b.description || "",
    createdAt: b.created_at,
  };
}

export const brandsApi = {
  async getAll(): Promise<Brand[]> {
    const data = await apiClient<BackendBrand[]>("/brands", {
      cache: "no-store",
    });
    return (data || []).map(mapBackendBrandToFrontend);
  },

  async create(payload: { name: string; code?: string; description?: string }): Promise<Brand> {
    const data = await apiClient<BackendBrand>("/brands", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapBackendBrandToFrontend(data);
  },

  async update(id: number, payload: { name?: string; code?: string; description?: string }): Promise<Brand> {
    const data = await apiClient<BackendBrand>(`/brands/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return mapBackendBrandToFrontend(data);
  },

  async delete(id: number): Promise<void> {
    await apiClient<void>(`/brands/${id}`, {
      method: "DELETE",
    });
  },
};
