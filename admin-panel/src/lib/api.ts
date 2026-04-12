import axios from "axios";

const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const baseURL = isProd 
  ? "https://api.a1carehospital.in/api" 
  : (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api");

export const api = axios.create({
  baseURL,
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
    }
    return Promise.reject(error);
  }
);

