import api from "./api";

export interface WeeklyWeek {
  weekStart: string; // YYYY-MM-DD (Monday)
  label: string;
}

export interface WeeklySkuRow {
  sku: string;
  productName: string | null;
  productImage: string | null;
  units: Record<string, number>; // weekStart -> net units
  total: number;
}

export interface SkuWeeklyUnitsResponse {
  success: boolean;
  weeks: WeeklyWeek[];
  skus: WeeklySkuRow[];
  totals: Record<string, number>;
  range: { from: string; to: string };
}

export const getSkuWeeklyUnits = (dateFrom?: string, dateTo?: string) => {
  const params: Record<string, string> = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  return api.get<SkuWeeklyUnitsResponse>(
    "/checkout-campaign/analytics/sku-weekly-units",
    { params }
  );
};

export interface SyncSkuUnitsResponse {
  success: boolean;
  message: string;
  ordersScanned?: number;
  eventsInserted?: number;
  eventsSkipped?: number;
  windowStart?: string;
  windowEnd?: string;
}

// Manual sync. Optional date range (YYYY-MM-DD) to re-sync a specific period;
// omit both to sync the default recent window. Restricted server-side by email.
export const syncSkuUnits = (dateFrom?: string, dateTo?: string) => {
  const params: Record<string, string> = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  return api.post<SyncSkuUnitsResponse>(
    "/checkout-campaign/analytics/sync-sku-units",
    null,
    { params }
  );
};
