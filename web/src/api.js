import { API_BASE_URL } from "./config.js";

export const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

export const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message ?? "Запрос не выполнен");
    error.status = response.status;
    throw error;
  }

  return data;
};
