import API from "../api/axios";

export async function evaluarCV(token, archivo, puestoId) {
    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("puesto_id", puestoId);

    try {
        const res = await API.post(`/evaluar-cv/`, formData, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        });
        return res.data;
    } catch (error) {
        console.error("Error al evaluar CV:", error);
        throw error;
    }
}

export async function obtenerEvaluacionesPorPuesto(token, puestoId) {
  try {
    const res = await API.get(`/evaluaciones/${puestoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Error al obtener evaluaciones:", error);
    return [];
  }
}

export async function obtenerEvaluacionPorId(token, id) {
  try {
    const res = await API.get(`/evaluacion/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Error al obtener evaluación por ID:", error);
    return null;
  }
}