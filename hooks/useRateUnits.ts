import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/categories/api";
import { CACHE_TTL } from "@/categories/queryClient";

export interface RateUnit {
  value: string;
  labelEn: string;
  labelRu: string;
  labelHy: string;
}

export const useRateUnits = () => {
  return useQuery<RateUnit[]>({
    queryKey: ["rateUnits"],
    queryFn: async () => {
      const response = await apiService.getRateUnits();
      if (response.success && response.rateUnits) {
        return response.rateUnits;
      }
      return [];
    },
    staleTime: CACHE_TTL.STATIC,
    gcTime: CACHE_TTL.STATIC * 2, // Keep in cache for 2x the stale time
  });
};
