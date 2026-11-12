import axios, { AxiosError } from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export type ApiError = { code: string; message: string; details?: unknown };

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: ApiError }>) => {
    const apiError: ApiError = error.response?.data?.error ?? {
      code: 'NETWORK_ERROR',
      message: error.message || 'Request failed',
    };
    return Promise.reject(apiError);
  }
);

export const getData = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const res = await apiClient.get(url, { params });
  return res.data.data as T;
};

export default apiClient;
