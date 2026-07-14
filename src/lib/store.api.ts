import api from "./api";

export interface StoreCampaign {
  id: number;
  store_name: string;
  campaign_id: number;
  created_at: string;
  updated_at: string;
}

export interface StoresResponse {
  success: boolean;
  stores: StoreCampaign[];
}

export const getStores = () => api.get<StoresResponse>("/store-management");

export const saveStore = (store_name: string, campaign_ids: number[]) =>
  api.post<{ success: boolean; message: string }>("/store-management", {
    store_name,
    campaign_ids,
  });

export const updateStore = (
  original_name: string,
  store_name: string,
  campaign_ids: number[]
) =>
  api.put<{ success: boolean; message: string }>("/store-management", {
    original_name,
    store_name,
    campaign_ids,
  });

export const deleteStore = (store_name: string) =>
  api.delete<{ success: boolean }>("/store-management", {
    params: { store_name },
  });
