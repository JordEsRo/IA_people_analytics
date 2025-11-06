// services/areasService.js
import API from "../api/axios";

export async function obtenerAreas(token) {
  try {
    const res = await API.get("/areas/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (error) {
    console.error("Error en obtenerAreas:", error);
    return [];
  }
}