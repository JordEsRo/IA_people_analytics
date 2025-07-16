import API from "../api/axios";


export async function obtenerProcesos(token, filtros = {}) {
  const params = new URLSearchParams(filtros).toString();
  const res = await API.get(`/procesos/listar?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export const crearProcesoCarga = async (token, data) => {
  const formData = new FormData();
  formData.append("job_id", data.job_id);
  formData.append("reque", data.reque);
  formData.append("area", data.area);

  try {
      const res = await API.post(`/crear-proceso-carga/`, formData, {
      headers: {
          Authorization: `Bearer ${token}`,
      },
      });
      return res.data;
  } catch (error) {
      console.error("Error al procesar carga:", error);
      throw error;
  }

};

export async function activarProcesoCarga(id, token) {
  return await API.put(`/procesos/${id}/activar`, null, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    
  });
}

export async function desactivarProcesoCarga(id, token) {
  return await API.put(`/procesos/${id}/desactivar`, null, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function obtenerDetalleProceso(id, token) {
  const res = await API.get(`/procesos/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function procesarCVsProceso(id, token) {
  const res = await API.post(`/procesos/${id}/procesar-cvs`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}