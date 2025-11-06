import { useEffect, useState } from "react"; //, useRef
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerDetalleProceso, procesarCVsProceso, finalizarProcesoCarga, reactivarProceso } from "../services/procesosService";
// import { connectWS } from "../services/WebsocketService";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import ModalDetalleEvaluacion from "../components/ModalDetalleEvaluacion";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { usePrompt } from "../hooks/usePrompt";

const DetalleProcesoCarga = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  //const wsRef = useRef(null);

  const [proceso, setProceso] = useState(null);
  const [evaluacionesHistorial, setEvaluacionesHistorial] = useState([]);
  const [evalSeleccionada, setEvalSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const [mostrarProcesados, setMostrarProcesados] = useState(true);
  const [mostrarNoProcesados, setMostrarNoProcesados] = useState(false);
  const [filtros, setFiltros] = useState({
    name: "",             
  });
  const [mostrarSombreados, setMostrarSombreados] = useState(false);
  const [savingMap, setSavingMap] = useState({});
  const [tieneCambios, setTieneCambios] = useState(false);
  // const [progress, setProgress] = useState({
  //   current: 0,
  //   total: 0,
  //   file: "",
  //   completed: false,
  // });


  const fetchData = async () => {
    try {
      const detalle = await obtenerDetalleProceso(id, token);
      setProceso(detalle);
      setFinalizado(detalle.end_process === true);
      setProcesando(detalle.is_processing === true); // 🚩 importante
      await fetchHistorial(id);
    } catch (error) {
      console.error("Error al obtener detalle o historial:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!id || !token) return;
    fetchData();
  }, [id, token]);

  const fetchHistorial = async (id) => {
    try {
      const response = await API.get(`/procesos/${id}/evaluaciones`, {
        headers: { Authorization: `Bearer ${token}` }, //llevarlo a services
      });
      setEvaluacionesHistorial(response.data || []);
    } catch (error) {
      console.error("Error al obtener historial:", error);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (tieneCambios) {
        e.preventDefault();
        e.returnValue = "Tienes cambios sin guardar. ¿Seguro que quieres salir?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [tieneCambios]);

  usePrompt("Tienes cambios sin guardar. ¿Seguro que quieres salir?", tieneCambios);

  const parseNumber = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace("%", "").trim();
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  };

  const computeMatchTotal = (match, match_eval) => {
    const m = parseNumber(match);
    const me = parseNumber(match_eval);
    return Math.round((0.5 * m + 0.5 * me) * 100) / 100;
  };

    const handleLocalChangeMatchEval = (evalId, newVal) => {
      let value = newVal === "" ? "" : Number(newVal);
      if (value !== "") {
        if (value < 0) value = 0;
        if (value > 100) value = 100;
      }

      setEvaluacionesHistorial(prev =>
        prev.map(e => {
          if (e.id !== evalId) return e;
          return {
            ...e,
            match_eval: value === "" ? null : value,
            match_total: value === "" ? null : computeMatchTotal(e.match, value)
          };
        })
      );

      // marcar que hay cambios sin guardar
      setTieneCambios(true);
    };

    
  const handleSaveMatchEval = async (evalId) => {
      const item = evaluacionesHistorial.find(e => e.id === evalId);
      if (!item) return;
      const me = item.match_eval;
      if (me === null || me === undefined || me === "") {
        alert("Ingresa un valor de match_eval entre 0 y 100 antes de guardar.");
        return;
      }

      if (isNaN(me) || me < 0 || me > 100) {
        alert("match_eval debe ser un número entre 0 y 100.");
        return;
      }

      setSavingMap(prev => ({ ...prev, [evalId]: true }));
      try {
        const payload = { match_eval: Number(me) };
        const resp = await API.put(`/procesos/evaluaciones/${evalId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // actualizar con la respuesta del backend (match_total confirmado)
        const updated = resp.data;
        setEvaluacionesHistorial(prev => prev.map(e => e.id === evalId ? {
          ...e,
          match_eval: updated.match_eval,
          match_total: updated.match_total
        } : e));
      } catch (err) {
        console.error("Error guardando match_eval:", err?.response?.data || err);
        alert("No se pudo guardar el match. Revisa la consola.");
      } finally {
        setSavingMap(prev => ({ ...prev, [evalId]: false }));
      }
    };
  //
  // useEffect(() => {
  //   if (!id || !token) return;

  //   // Si ya hay conexión, no crear otra
  //   if (wsRef.current) return;

  //   const onMessage = (data) => {
  //     if (data.error === "token_invalid") {
  //       console.warn("WS: token inválido recibido");
  //       return;
  //     }
  //     setProgress((prev) => ({
  //       current: data.current ?? prev.current,
  //       total: data.total ?? prev.total,
  //       file: data.file ?? prev.file,
  //       completed: data.completed ?? prev.completed,
  //     }));
  //   };

  //   const onOpen = () => {
  //     console.log("WS abierta (DetalleProcesoCarga)");
  //   };

  //   const onClose = (ev) => {
  //     // si el cierre indica token inválido (4401) loguear y limpiar
  //     if (ev && ev.code === 4401) {
  //       console.warn("WS cerrado: token inválido o no autorizado (4401).");
  //     }
  //     wsRef.current = null;
  //   };

  //   try {
  //     const ws = connectWS(id, token, onMessage, onOpen, onClose);
  //     wsRef.current = ws;
  //   } catch (e) {
  //     console.error("No se pudo conectar al WS:", e);
  //   }

  //   // cleanup al desmontar o cambiar id/token
  //   return () => {
  //     try {
  //       if (wsRef.current) {
  //         wsRef.current.close();
  //         wsRef.current = null;
  //       }
  //     } catch {}
  //   };
  // }, [id, token]);
  //
  const handleSaveAll = async () => {
    const cambios = evaluacionesHistorial.filter(e => e.match_eval !== null);
    if (cambios.length === 0) {
      alert("No hay cambios para guardar.");
      return;
    }

    try {
      await Promise.all(cambios.map(e => {
        const payload = { match_eval: e.match_eval };
        return API.put(`/procesos/evaluaciones/${e.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }));
      setTieneCambios(false);
      alert("Cambios guardados correctamente.");
      fetchHistorial(id); // refrescar tabla con datos actualizados
    } catch (err) {
      console.error("Error guardando cambios en lote:", err);
      alert("Ocurrió un error al guardar los cambios. Revisa la consola.");
    }
  };


  const handleProcesar = async () => {
    if (!id || !token) return;
    setProcesando(true);
    // setProgress({ current: 0, total: 0, file: "", completed: false });
    try {
      const data = await procesarCVsProceso(id, token);
      alert("CVs procesados correctamente.");
      await fetchHistorial(id);
      //setProgress((p) => ({ ...p, completed: true }));
    } catch (error) {
      console.error("Error al procesar CVs:", error?.response?.data || error);
      alert("Hubo un error al procesar los CVs.");
    } finally {
      setProcesando(false);
    }
  };

  const formatFecha = (fechaStr) => {
    try {
      const d = new Date(fechaStr);
      return d.toLocaleString("es-PE", {
      timeZone: "America/Lima", // fuerza UTC-5
      dateStyle: "short",
      timeStyle: "short",
    });
    } catch {
      return fechaStr;
    }
  };

  const exportarExcel = () => {
    const datosFiltrados = resultadosFiltrados.map((item) => ({
      Nombre: item.name,
      Match: `${item.match}%`,
      MatchEval: item.match_eval !== null && item.match_eval !== undefined ? `${item.match_eval}%` : "",
      MatchTotal: item.match_total !== null && item.match_total !== undefined ? `${item.match_total}%` : "",
      Fecha: formatFecha(item.fecha),
      Motivo: item.reason || "",
      Funciones: item.functions || "",
      Resumen: item.summary || "",
      Habilidades: item.skills || "",
      Estado: item.cv_procesado ? "Procesado" : "No procesado"
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosFiltrados);
    XLSX.utils.book_append_sheet(wb, ws, "Evaluaciones");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `evaluaciones_proceso_${proceso.code}.xlsx`);
  };

  const handleFinalizar = async () => {
    if (!window.confirm("¿Finalizar el proceso? Esta acción es irreversible.")) return;
    setProcesando(true);
    try {
      const respuesta = await finalizarProcesoCarga(id, token); // ← Esta función debe retornar el JSON completo
      alert(respuesta.mensaje || "Proceso finalizado correctamente.");
      await fetchData();
    } catch (error) {
      console.error("Error al finalizar proceso:", error);
      alert("Ocurrió un error.");
    } finally {
      setProcesando(false);
    }
  };

  const resultadosFiltrados = evaluacionesHistorial.filter((e) =>
    (mostrarProcesados && e.cv_procesado === true) ||
    (mostrarNoProcesados && e.cv_procesado === false)
  )
  .filter((e) =>
    filtros.name === "" ||
    e.name?.toLowerCase().includes(filtros.name.toLowerCase())
  )
  .filter((e) =>
    !mostrarSombreados || e.flag_shade === true
  );

  const resultadosOrdenados = [...resultadosFiltrados].sort((a, b) => parseFloat(b.match) - parseFloat(a.match));
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 15;
  const totalPaginas = Math.ceil(resultadosOrdenados.length / itemsPorPagina);
  const resultadosPaginados = resultadosOrdenados.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  // cuando cambian filtros/datos, resetear a página 1 (esta está bien)
  useEffect(() => {
    setPaginaActual(1);
  }, [filtros.name, mostrarProcesados, mostrarNoProcesados, mostrarSombreados, evaluacionesHistorial]);

  // asegurar que la página actual sea válida — SOLO depende de totalPaginas
  useEffect(() => {
    setPaginaActual(prev => {
      const tp = Math.max(0, totalPaginas); // si quieres forzar >=1, usa Math.max(1, totalPaginas)
      if (tp === 0) return 1; // opcional: si no hay páginas, vuelve a 1 (evita 0)
      if (prev > tp) return tp;
      if (prev < 1) return 1;
      return prev; // si no cambia, React no volverá a renderizar
    });
  }, [totalPaginas]);


  if (cargando) return <p className="p-6">Cargando detalles...</p>;
  if (!proceso) return <p className="p-6">Proceso no encontrado.</p>;

  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="mb-4 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded">← Volver</button>
      <h2 className="text-2xl font-bold mb-4">Detalle del Proceso</h2>
      <div className="mb-6 space-y-1">
        <p><strong>Código:</strong> {proceso.code} ({proceso.id})</p>
        <p><strong>Área:</strong> {proceso.area}</p>
        <p><strong>Requisitos:</strong> {proceso.reque}</p>
        <p><strong>Puesto:</strong> {proceso.puesto}</p>
        <p><strong>Funciones:</strong> {proceso.functions}</p>
        <br></br>
        {proceso.end_process && <p className="text-red-600 font-semibold">Este proceso ha sido finalizado.</p>}
        <div className="flex flex-wrap gap-4 mb-6">
          {proceso.drive_folder_url && (
            <a href={proceso.drive_folder_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
              Ver carpeta en Google Drive
            </a>
          )}
          {proceso.url_form && (
            <a href={proceso.url_form} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
              Link del formulario
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <button onClick={handleProcesar} disabled={procesando || finalizado} className={`px-4 py-2 rounded text-white ${
          finalizado ? "bg-gray-400" : procesando ? "bg-green-400" : "bg-green-600 hover:bg-green-700"
        }`}>
          {procesando ? "Procesando..." : finalizado ? "Proceso Finalizado" : "Procesar CVs"}
        </button>

        <button onClick={exportarExcel} disabled={resultadosFiltrados.length === 0} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded">
          Exportar a Excel
        </button>

        {!finalizado ? (
          <button onClick={handleFinalizar} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
            Finalizar Proceso
          </button>
        ) : (
          <button onClick={async () => {
            if (window.confirm("¿Deseas reactivar este proceso?")) {
              try {
                await reactivarProceso(id, token);
                alert("Proceso reactivado.");
                await fetchData();
              } catch (err) {
                console.error(err);
                alert("Error al reactivar el proceso.");
              }
            }
          }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Reactivar Proceso
          </button>
        )}

        <button
          onClick={handleSaveAll}
          disabled={!tieneCambios}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Guardar todos los cambios
        </button>
      </div>

      {/* {progress.total > 0 && (
        <div className="w-full mt-4">
          <div className="w-full bg-gray-200 rounded h-4">
            <div
              className="bg-green-500 h-4 rounded"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {progress.current}/{progress.total} archivos
            {progress.file && ` → procesando: ${progress.file}`}
          </p>
          {progress.completed && (
            <p className="text-green-600 font-semibold mt-2">✅ Proceso completado</p>
          )}
        </div>
      )} */}

      <div className="flex items-center space-x-4 mb-4">
        <label>
          <input type="checkbox" checked={mostrarProcesados} onChange={() => setMostrarProcesados(!mostrarProcesados)} />
          <span className="ml-1">Procesados</span>
        </label>
        <label>
          <input type="checkbox" checked={mostrarNoProcesados} onChange={() => setMostrarNoProcesados(!mostrarNoProcesados)} />
          <span className="ml-1">No procesados</span>
        </label>
        <label>
          <input type="checkbox" checked={mostrarSombreados} onChange={() => setMostrarSombreados(!mostrarSombreados)} />
          <span className="ml-1">Sombreados</span>
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Nombre"
          value={filtros.name}
          onChange={(e) => setFiltros({ ...filtros, name: e.target.value })}
          className="border p-2 rounded"
        />
      </div>
      <h3 className="text-xl font-semibold mb-2">Historial de Evaluaciones</h3>

      {resultadosPaginados.length === 0 ? (
        <p className="text-gray-500">No hay evaluaciones que coincidan con el filtro.</p>
      ) : (
        <table id="tabla-evaluaciones" className="w-full border-collapse border">
          <thead>
            <tr>
              <th className="p-2 border">#</th>
              <th className="p-2 border">Postulante</th>
              <th className="p-2 border">Match IA</th>
              <th className="p-2 border">Match Expert</th>
              <th className="p-2 border">Match Total</th>
              <th className="p-2 border">Fecha del proceso</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resultadosPaginados.map((evalItem, index) => (
              <tr key={evalItem.id ?? index} className={`${evalItem.flag_shade ? "bg-yellow-100" : "bg-white"} hover:bg-gray-50`}>
                <td className="p-2 border text-center">
                  {(paginaActual - 1) * itemsPorPagina + index + 1}
                </td>
                <td className="p-2 border">{evalItem.name}</td>
                <td className="p-2 border">{evalItem.match}%</td>
                <td className="p-2 border">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={evalItem.match_eval ?? ""}
                    onChange={(e) => handleLocalChangeMatchEval(evalItem.id, e.target.value)}
                    className="border p-1 rounded w-24"
                  />%
                </td>
                <td className="p-2 border">{ (evalItem.match_total !== null && evalItem.match_total !== undefined) ? `${evalItem.match_total}%` : "-" }</td>
                <td className="p-2 border">{evalItem.fecha}</td>
                <td className="p-2 border space-x-3">
                  <button
                    onClick={() => setEvalSeleccionada(evalItem)}
                    className="text-blue-600 hover:underline"
                  >
                    Ver detalle
                  </button>
                  {evalItem.url_cv && (
                    <a
                      href={evalItem.url_cv}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline"
                    >
                      Ver CV
                    </a>
                  )}
                  {/* <button
                    onClick={() => handleSaveMatchEval(evalItem.id)}
                    disabled={savingMap[evalItem.id]}
                    className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                  >
                    {savingMap[evalItem.id] ? "Guardando..." : "Guardar"}
                  </button> */}
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
  );
};

export default DetalleProcesoCarga;
