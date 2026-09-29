import api from "./api";

export interface Cooperative {
  id: number;
  name: string;
  primary_color: string;
  secondary_color: string;
  logo: string;
}

export interface AllocationBreakdown {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type?: "PERCENTAGE" | "PHP";
  configured_value?: number;
  configured_percentage?: number;
  amount: number;
  actual_percentage: number;
  transaction_count: number;
}

export interface ServiceBreakdown {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  total: number;
  allocations: AllocationBreakdown[];
}

export interface AllocationSummary {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  amount: number;
}

export interface CooperativeSummary {
  year: number;
  service_filter: string;
  total_fund: number;
  total_transactions: number;
  services: ServiceBreakdown[];
  allocations: AllocationSummary[];
}

export interface CooperativeServiceOption {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

export const cooperativeService = {
  getCooperatives: async (): Promise<Cooperative[]> => {
    try {
      const { data } = await api.get("/cooperatives");
      return data;
    } catch (error: any) {
      console.error("Error fetching cooperatives:", error);
      return [];
    }
  },

  getYears: async (): Promise<string[]> => {
    const response = await api.get("/cooperative/years");
    return response.data.data || [];
  },

  getServices: async (): Promise<CooperativeServiceOption[]> => {
    const response = await api.get("/cooperative/services");
    return response.data.data || [];
  },

  getSummary: async (
    year: string | number,
    serviceSlug: string = "all",
  ): Promise<CooperativeSummary> => {
    const response = await api.get("/cooperative/summary", {
      params: { year, service: serviceSlug },
    });
    return response.data.data as CooperativeSummary;
  },

  getMyCooperative: async (): Promise<Cooperative | null> => {
    try {
      const { data } = await api.get("/profile/cooperative");
      return data;
    } catch (error: any) {
      console.error("Error fetching user's cooperative:", error);
      return null;
    }
  },
};
