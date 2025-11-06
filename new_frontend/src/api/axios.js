// src/api/axios.js
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// Usa la variable de entorno VITE_API_URL o por defecto http://localhost:8000
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: false,
});

let store; // Para acceder a auth fuera del React Context

export const injectStore = (_store) => {
  store = _store;
};


// Función para verificar si el token está expirado
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const { exp } = jwtDecode(token);
    return exp * 1000 < Date.now();
  } catch (err) {
    return true;
  }
}

// INTERCEPTOR DE RESPUESTA
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es un 401 y no hemos intentado ya renovar
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      store?.refreshToken
    ) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API.defaults.baseURL}/refresh`, {
          refresh_token: store.refreshToken,
        });

        const newToken = res.data.access_token;
        store.setToken(newToken); // actualiza en el contexto
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

        return API(originalRequest); // reintenta
      } catch (err) {
        store.logout(); // refresh inválido
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
