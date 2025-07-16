import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import ModalDetalleEvaluacion from "../components/ModalDetalleEvaluacion";

const HistorialPostulante = () => {
  const { dni } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [evaluaciones, setEvaluaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    if (!token || !dni) return;

    const fetchHistorial = async () => {
      try {
        const res = await API.get(`/postulantes/${dni}/historial`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEvaluaciones(res.data);
      } catch (error) {
        console.error("Error al obtener historial:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchHistorial();
  }, [token, dni]);

  const formatFecha = (fechaStr) => {
    try {
      return new Date(fechaStr).toLocaleString("es-PE");
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
      >
        ← Volver
      </button>

      <h2 className="text-2xl font-bold mb-4">Historial del Postulante: {dni}</h2>

      {cargando ? (
        <p>Cargando historial...</p>
      ) : evaluaciones.length === 0 ? (
        <p>No hay evaluaciones registradas para este postulante.</p>
      ) : (
        <table className="w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Proceso</th>
              <th className="p-2 border">Fecha</th>
              <th className="p-2 border">Match</th>
              <th className="p-2 border">Resumen</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {evaluaciones.map((ev, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-2 border">{ev.charge_process_id || "-"}</td>
                <td className="p-2 border">{formatFecha(ev.date_create)}</td>
                <td className="p-2 border">{ev.match}%</td>
                <td className="p-2 border truncate max-w-xs">{ev.summary}</td>
                <td className="p-2 border">
                  <button
                    onClick={() => setSeleccionada(ev)}
                    className="text-blue-600 hover:underline"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {seleccionada && (
        <ModalDetalleEvaluacion
          evaluacion={seleccionada}
          onClose={() => setSeleccionada(null)}
        />
      )}
    </div>
  );
};

export default HistorialPostulante;