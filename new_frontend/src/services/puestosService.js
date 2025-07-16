import API from "../api/axios";

export const obtenerPuestos = async (token) => {
    try {
        const response = await API.get("/puestos/", {
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        });

        return await response.data;
    } catch (error) {
        console.error("Error en obtenerPuestos:", error);
        return [];
    }
    };
/////////////////////////////////////////////////////////////////////////////////////${api}
export const crearPuesto = async (token, data) => {
  return await API.post("/puestos", data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
/////////////////////////////////////////////////////////////////////////////////////
export async function deshabilitarPuesto(id, token) {
    try {
        const response = await API.put(`/puestos/${id}/desactivar`, null, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        });

        return await response.data;
    } catch (error) {
        console.error("Error deshabilitando puesto:", error);
    }
}
/////////////////////////////////////////////////////////////////////////////////////
export async function editarPuesto(id, datos, token) {
    try {
        const response = await API.put(`/puestos/${id}`, datos, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(datos),
        });


        return await response.data;
    } catch (error) {
        console.error("Error al editar puesto:", error);
    }
}
/////////////////////////////////////////////////////////////////////////////////////
export async function obtenerTodosPuestos(token) {
    const res = await API.get("/puestos/todos", {
        headers: { Authorization: `Bearer ${token}` },
    });
    return await res.data;
}
/////////////////////////////////////////////////////////////////////////////////////
export async function reactivarPuesto(id, token) {
    const res = await API.put(`/puestos/${id}/activar`, null, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
    });
    return await res.data;
}