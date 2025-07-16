import { useEffect, useState } from "react";
import { obtenerTodosPuestos } from "../services/puestosService";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import ModalDetalleEvaluacion from "../components/ModalDetalleEvaluacion";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const HistorialEvaluaciones = () => {
  const { token } = useAuth();

  const [evaluaciones, setEvaluaciones] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtros, setFiltros] = useState({
    search: '',         
    puesto_id: "",      
    fecha_desde: "",    
    fecha_hasta: "",    
    min_match: "",      
    max_match: "",      
  });
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);

  const itemsPorPagina = 10;

  useEffect(() => {
    const fetchPuestos = async () => {
      const data = await obtenerTodosPuestos(token);
      setPuestos(data || []);
    };
    fetchPuestos();
  }, [token]);

  useEffect(() => {
    fetchEvaluaciones();
  }, [pagina, filtros]);

  const filtrosLimpios = Object.fromEntries(
    Object.entries({
      ...filtros,
      offset: (pagina - 1) * itemsPorPagina,
      limit: itemsPorPagina
    }).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );

  const fetchEvaluaciones = async () => {
    setCargando(true);
    try {
      const params = {
        offset: (pagina - 1) * itemsPorPagina,
        limit: itemsPorPagina,
        ...filtros,
      };

      const response = await API.get("/evaluaciones/historial", {
        headers: { Authorization: `Bearer ${token}` },
        params: filtrosLimpios,
      });

      const { resultados, total } = response.data;
      setEvaluaciones(resultados);
      setTotalPaginas(Math.ceil(total / itemsPorPagina));
    } catch (error) {
      console.error("Error al obtener historial:", error);
    } finally {
      setCargando(false);
    }
  };

  const formatFecha = (str) => {
    try {
      return new Date(str).toLocaleString("es-PE");
    } catch {
      return str;
    }
  };

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = evaluaciones.map((item) => ({
      Nombre: item.name,
      Puesto: item.puesto,
      Match: item.match + "%",
      Fecha: formatFecha(item.fecha),
      Motivo: item.reason,
      Resumen: item.summary,
      Habilidades: item.skills,
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Evaluaciones");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `historial_evaluaciones.xlsx`);
  };

  console.log(evaluaciones)

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Historial General de Evaluaciones</h2>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Nombre"
          value={filtros.search}
          onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
          className="border p-2 rounded"
        />
        <select
          value={filtros.puesto_id}
          onChange={(e) => setFiltros({ ...filtros, puesto_id: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">-- Puesto --</option>
          {puestos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={filtros.fecha_desde}
            onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
            className="border p-2 rounded w-full"
          />
          <input
            type="date"
            value={filtros.fecha_hasta}
            onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
            className="border p-2 rounded w-full"
          />
        </div>
          <input
            type="number"
            placeholder="Match mínimo"
            value={filtros.min_match}
            onChange={(e) => setFiltros({ ...filtros, min_match: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Match máximo"
            value={filtros.max_match}
            onChange={(e) => setFiltros({ ...filtros, max_match: e.target.value })}
            className="border p-2 rounded"
          />
      </div>

      <div className="mb-4">
        <button
          onClick={exportarExcel}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
        >
          Exportar a Excel
        </button>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p>Cargando...</p>
      ) : evaluaciones.length === 0 ? (
        <p className="text-gray-500">No hay resultados.</p>
      ) : (
        <div>
          <table className="w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Nombre</th>
                <th className="p-2 border">Puesto</th>
                <th className="p-2 border">Match</th>
                <th className="p-2 border">Proceso</th>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {evaluaciones.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-2 border">{e.name}</td>
                  <td className="p-2 border">{e.puesto}</td>
                  <td className="p-2 border">{e.match}%</td>
                  <td className="p-2 border">{e.proceso}</td>
                  <td className="p-2 border">{formatFecha(e.fecha)}</td>
                  <td className="p-2 border">
                    <button
                      onClick={() => setDetalleSeleccionado(e)}
                      className="text-blue-600 hover:underline"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: totalPaginas }, (_, i) => (
              <button
                key={i}
                onClick={() => setPagina(i + 1)}
                className={`px-3 py-1 border rounded ${pagina === i + 1 ? "bg-blue-600 text-white" : "bg-white text-blue-600"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {detalleSeleccionado && (
        <ModalDetalleEvaluacion
          evaluacion={detalleSeleccionado}
          onClose={() => setDetalleSeleccionado(null)}
        />
      )}
    </div>
  );
};

export default HistorialEvaluaciones;
