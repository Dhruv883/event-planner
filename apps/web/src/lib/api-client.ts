import axios, { type AxiosRequestConfig } from "axios";

const config = {
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
};

export async function apiRequest<T>(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<T> {
  const url = `${config.baseURL}${endpoint}`;

  try {
    const response = await axios({
      url,
      method: options.method || "GET",
      data: options.data,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      withCredentials: true,
      ...options,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = (error.response?.data as any)?.error || error.message;
      throw new Error(errorMessage);
    }
    throw error;
  }
}
