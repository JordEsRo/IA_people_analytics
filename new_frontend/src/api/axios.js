// src/api/axios.js
import axios from "axios";

// Usa la variable de entorno VITE_API_BASE_URL o por defecto http://localhost:8000
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: false,
});

export default API;