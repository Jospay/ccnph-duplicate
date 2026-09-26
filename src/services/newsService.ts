import api from "./api";

export interface NewsItem {
  id: number;
  PostTitle: string;
  PostImage: string;
  PostUrl: string;
  PostingDate: string;
  CategoryName: string;
}

export interface NewsDetail extends NewsItem {
  PostDetails: string;
}

export const getNews = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}): Promise<NewsItem[]> => {
  const res = await api.get("/news", { params });
  // Handle both array response and wrapped res.data.data response
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
};

export const getNewsById = async (id: number): Promise<NewsDetail> => {
  const res = await api.get(`/news/${id}`);
  return res.data?.data ?? res.data;
};
