import api from "./api";

export interface WeeklyWeek {
  weekStart: string; // YYYY-MM-DD (Monday)
  label: string;
}

export interface WeeklySkuRow {
  sku: string;
  productName: string | null;
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
