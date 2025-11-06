import API from "../api/axios";

export const obtenerPuestos = async (token) => {
  try {
    const response = await API.get("/puestos/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error en obtenerPuestos:", error);
    return [];
  }
};

export const crearPuesto = async (token, data) => {
  try {
    const response = await API.post("/puestos", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error al crear puesto:", error);
    throw error;
  }
};

export const deshabilitarPuesto = async (id, token) => {
  try {
    const response = await API.put(`/puestos/${id}/desactivar`, null, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error deshabilitando puesto:", error);
    throw error;
  }
};

export const editarPuesto = async (id, datos, token) => {
  try {
    const response = await API.put(`/puestos/${id}`, datos, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error al editar puesto:", error);
    throw error;
  }
};

export const obtenerTodosPuestos = async (token) => {
  try {
    const response = await API.get("/puestos/todos", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error en obtenerTodosPuestos:", error);
    return [];
  }
};

export const reactivarPuesto = async (id, token) => {
  try {
    const response = await API.put(`/puestos/${id}/activar`, null, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error reactivando puesto:", error);
    throw error;
  }
};
