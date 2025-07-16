import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";

const AuditoriaUsuario = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [auditoria, setAuditoria] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAuditoria = async () => {
      try {
        const res = await API.get(`/usuarios/${id}/auditoria`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAuditoria(res.data);
      } catch (err) {
        console.error("Error al obtener auditoría:", err);
        setError("No se pudo cargar la auditoría.");
      }
    };

    fetchAuditoria();
  }, [id, token]);

  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!auditoria) return <div className="p-4">Cargando auditoría...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Historial de Auditoría del Usuario #{id}</h2>

      <h3 className="text-xl font-semibold mt-6 mb-2">Cambios de nombre de usuario</h3>
      <table className="table-auto w-full border mb-6">
        <thead className="bg-gray-200">
          <tr>
            <th className="border px-4 py-2">Anterior</th>
            <th className="border px-4 py-2">Nuevo</th>
            <th className="border px-4 py-2">Modificado por</th>
            <th className="border px-4 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {auditoria.updates.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center py-2">Sin registros</td>
            </tr>
          ) : (
            auditoria.updates.map((u, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2">{u.username_old}</td>
                <td className="border px-4 py-2">{u.username_new}</td>
                <td className="border px-4 py-2">{u.updated_by}</td>
                <td className="border px-4 py-2">{new Date(u.date_update).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h3 className="text-xl font-semibold mt-6 mb-2">Cambios de contraseña</h3>
      <table className="table-auto w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th className="border px-4 py-2">Cambiado por</th>
            <th className="border px-4 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {auditoria.password_changes.length === 0 ? (
            <tr>
              <td colSpan="2" className="text-center py-2">Sin registros</td>
            </tr>
          ) : (
            auditoria.password_changes.map((p, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2">{p.changed_by}</td>
                <td className="border px-4 py-2">{new Date(p.date_changed).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditoriaUsuario;
