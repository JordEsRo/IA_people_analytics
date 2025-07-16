import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { useNavigate } from "react-router-dom"; 

const GestionUsuarios = () => {
    const { token } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [mensaje, setMensaje] = useState("");
    const navigate = useNavigate();

    const fetchUsuarios = async () => {
    try {
        const res = await API.get(`/usuarios/`, {
        headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;

        // Asegurarse de que sea un array, si no lo es, lo conviertes o lo dejas vacío
        if (Array.isArray(data)) {
        setUsuarios(data);
        } else {
        console.error("Respuesta inesperada del backend:", data);
        setUsuarios([]);  // fallback para evitar crash
        }
    } catch (err) {
        console.error("Error al obtener usuarios", err);
        setUsuarios([]);
    }
    };

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const cambiarRol = async (id, nuevoRol) => {
        try {
        await API.put(
            `/usuarios/${id}/rol`,
            { new_role: nuevoRol },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchUsuarios();
        setMensaje("Rol actualizado correctamente");
        } catch (err) {
        console.error(err);
        }
    };

    const editarUsuario = async (id) => {
        const nuevoUsername = prompt("Nuevo nombre de usuario:");
        if (!nuevoUsername) return;
        try {
        await API.put(
            `/usuarios/${id}/editar`,
            { new_username: nuevoUsername },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchUsuarios();
        setMensaje("Usuario editado exitosamente");
        } catch (err) {
        console.error(err);
        }
    };

    const cambiarPassword = async (id) => {
        const nueva = prompt("Nueva contraseña:");
        const confirmar = prompt("Confirme la nueva contraseña:");
        if (nueva !== confirmar) {
        alert("Las contraseñas no coinciden");
        return;
        }
        try {
        await API.put(
            `/usuarios/${id}/password`,
            { nueva_password: nueva, confirmacion: confirmar },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setMensaje("Contraseña actualizada");
        } catch (err) {
        console.error(err);
        }
    };

    const cambiarEstado = async (id, activar) => {
        try {
        const ruta = activar ? "activar" : "desactivar";
        await API.put(
            `/usuarios/${id}/${ruta}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchUsuarios();
        setMensaje(
            activar ? "Usuario activado" : "Usuario desactivado"
        );
        } catch (err) {
        console.error(err);
        }
    };
    return (
        <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Gestión de Usuarios</h2>
        {mensaje && <div className="mb-4 text-green-600">{mensaje}</div>}

        <table className="table-auto w-full border">
            <thead className="bg-gray-200">
            <tr>
                <th className="px-4 py-2 border">Usuario</th>
                <th className="px-4 py-2 border">Rol</th>
                <th className="px-4 py-2 border">Estado</th>
                <th className="px-4 py-2 border">Acciones</th>
            </tr>
            </thead>
            <tbody>
            {usuarios.map((u) => (
                <tr key={u.id}>
                <td className="border px-4 py-2">{u.username}</td>
                <td className="border px-4 py-2">
                    <select
                    value={u.role}
                    onChange={(e) => cambiarRol(u.id, e.target.value)}
                    className="border p-1"
                    >
                    <option value="admin">admin</option>
                    <option value="usuario">usuario</option>
                    </select>
                </td>
                <td className="border px-4 py-2">
                    {u.state ? "Activo" : "Inactivo"}
                </td>
                <td className="border px-4 py-2 space-x-2">
                    <button
                    onClick={() => editarUsuario(u.id)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                    >
                    Editar
                    </button>
                    <button
                    onClick={() => cambiarPassword(u.id)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                    >
                    Contraseña
                    </button>
                    <button
                    onClick={() => cambiarEstado(u.id, !u.state)}
                    className={`${
                        u.state ? "bg-red-500" : "bg-green-500"
                    } text-white px-2 py-1 rounded`}
                    >
                    {u.state ? "Desactivar" : "Activar"}
                    </button>
                    <button
                    onClick={() => navigate(`/usuarios/${u.id}/auditoria`)}
                    className="bg-gray-600 text-white px-2 py-1 rounded"
                    >
                    Auditoría
                    </button>
                </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    );
};

export default GestionUsuarios;
