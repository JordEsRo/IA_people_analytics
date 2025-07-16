import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerDetalleProceso, procesarCVsProceso } from "../services/procesosService";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import ModalDetalleEvaluacion from "../components/ModalDetalleEvaluacion";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const DetalleProcesoCarga = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [proceso, setProceso] = useState(null);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [evaluacionesHistorial, setEvaluacionesHistorial] = useState([]);
  const [evalSeleccionada, setEvalSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!id || !token) return;

    const fetchData = async () => {
      try {
        const detalle = await obtenerDetalleProceso(id, token);
        setProceso(detalle);
        await fetchHistorial(id);
      } catch (error) {
        console.error("Error al obtener detalle o historial:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchData();
  }, [id, token]);

  const fetchHistorial = async (id) => {
    try {
      const response = await API.get(`/procesos/${id}/evaluaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvaluacionesHistorial(response.data);
    } catch (error) {
      console.error("Error al obtener historial:", error);
    }
  };

  const handleProcesar = async () => {
    setProcesando(true);
    try {
      const data = await procesarCVsProceso(id, token);
      setEvaluaciones(data.evaluaciones || []);
      await fetchHistorial(id); // Refrescar historial después de procesar
    } catch (error) {
      console.error("Error al procesar CVs:", error);
      alert("Hubo un error al procesar los CVs.");
    } finally {
      setProcesando(false);
    }
  };

  const formatFecha = (fechaStr) => {
    try {
      const d = new Date(fechaStr);
      return d.toLocaleString("es-PE");
    } catch {
      return fechaStr;
    }
  };

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = resultados.map((item) => ({
      Nombre: item.name,
      Match: item.match + "%",
      Fecha: formatFecha(item.fecha),
      Motivo: item.reason || "", // puede venir vacío
      Resumen: item.summary || "",
      Habilidades: item.skills || ""
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Evaluaciones");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `evaluaciones_proceso_${proceso.code}.xlsx`);
  };

  const ordenarPorMatchDesc = (lista) => {
    return [...lista].sort((a, b) => parseInt(b.match) - parseInt(a.match));
  };

  // const resultados = evaluaciones.length > 0 ? evaluaciones : evaluacionesHistorial;
  const resultadosRaw = evaluacionesHistorial;
  const resultados = ordenarPorMatchDesc(resultadosRaw);


  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 15;
  const resultadosOrdenados = [...resultados].sort((a, b) => parseFloat(b.match) - parseFloat(a.match));
  const totalPaginas = Math.ceil(resultadosOrdenados.length / itemsPorPagina);
  const resultadosPaginados = resultadosOrdenados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  useEffect(() => {
    const table = document.getElementById("tabla-evaluaciones");
    if (table) table.scrollIntoView({ behavior: "smooth" });
  }, [paginaActual]);


  if (cargando) return <p className="p-6">Cargando detalles...</p>;
  if (!proceso) return <p className="p-6">Proceso no encontrado.</p>;


  console.log(resultados)
   return (
    <div className="p-6">

      <button
        onClick={() => navigate(-1)}
        className="mb-4 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
      >
        ← Volver
      </button>

      <h2 className="text-2xl font-bold mb-4">Detalle del Proceso</h2>
      {/* BLOQUE DATOS Y CARPETA */}
      <div className="mb-6 space-y-1">
        <p><strong>Código:</strong> {proceso.code}</p>
        <p><strong>Área:</strong> {proceso.area}</p>
        <p><strong>Requisitos:</strong> {proceso.reque}</p>
        <p><strong>Puesto:</strong> {proceso.job?.name}</p>
        <br></br>
        {proceso.drive_folder_url && (
          <a
            href={proceso.drive_folder_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Ver carpeta en Google Drive
          </a>
        )}
      </div>
      {/* BLOQUE BOTONES PROCESAR Y EXPORTAR */}
      <div className="flex gap-4 mb-6">
          <button
            onClick={handleProcesar}
            disabled={procesando}
            className={`mb-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded ${procesando ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {procesando ? "Procesando..." : "Procesar CVs"}
          </button>

            <button
              onClick={exportarExcel}
              disabled={resultados.length === 0}
              className="ml-4 mb-6 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
            >
              Exportar a Excel
            </button>
        </div>
        {/* PARTE INFERIOR.. */}
      <div>
        <h3 className="text-xl font-semibold mb-2">
          {evaluaciones.length > 0 ? "Resultados recientes" : "Historial de Evaluaciones"}
        </h3>
        {resultados.length === 0 ? (
          <p className="text-gray-500">No hay evaluaciones registradas.</p>
        ) : (
          <table id="tabla-evaluaciones" className="w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Nombre</th>
                <th className="p-2 border">Match</th>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {resultadosPaginados.map((evalItem, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-2 border">{evalItem.name}</td>
                  <td className="p-2 border">{evalItem.match}%</td>
                  <td className="p-2 border">{formatFecha(evalItem.fecha)}</td>
                  <td className="p-2 border">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => setEvalSeleccionada(evalItem)}
                    >
                      Ver detalle
                  </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )} 
        {evalSeleccionada && (
          <ModalDetalleEvaluacion
            evaluacion={evalSeleccionada}
            onClose={() => setEvalSeleccionada(null)}
          />
        )}
          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: totalPaginas }, (_, i) => (
              <button
                key={i}
                onClick={() => setPaginaActual(i + 1)}
                className={`px-3 py-1 border rounded ${paginaActual === i + 1 ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
      </div>
    </div>
  );
};

export default DetalleProcesoCarga;