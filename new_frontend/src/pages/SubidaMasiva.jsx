import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

const SubidaMasiva = () => {
  const { token } = useAuth();
  const [archivos, setArchivos] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [puestoId, setPuestoId] = useState("");
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    API.get("/puestos/", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setPuestos(res.data));
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!puestoId || archivos.length === 0) {
      alert("Seleccione un puesto y al menos un archivo");
      return;
    }

    const formData = new FormData();
    archivos.forEach((file) => formData.append("archivos", file));
    formData.append("puesto_id", puestoId);

    try {
      setCargando(true);
      const res = await API.post("/evaluar-cvs", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      setResultados(res.data);
    } catch (err) {
      console.error("Error en la carga masiva", err);
      alert("No se pudo procesar los archivos");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Evaluar CVs en Lote</h2>

      <form onSubmit={handleUpload} className="space-y-4 mb-6">
        <select
          value={puestoId}
          onChange={(e) => setPuestoId(e.target.value)}
          className="border p-2 w-full"
          required
        >
          <option value="">-- Selecciona un puesto --</option>
          {puestos.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={(e) => setArchivos([...e.target.files])}
          className="border p-2 w-full"
          required
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Evaluar CVs
        </button>
      </form>

      {cargando && (
        <div className="flex items-center space-x-2 mb-4">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>Evaluando CVs...</span>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="bg-gray-100 p-4 rounded shadow space-y-4">
          <h3 className="text-xl font-semibold mb-2">Resultados</h3>
          {resultados.map((res, idx) => (
            <div key={idx} className="border-b pb-2">
              <p><strong>Nombre:</strong> {res.name}</p>
              <p><strong>Match:</strong> {res.match}%</p>
              <p><strong>Habilidades:</strong> {res.skills}</p>
              <p><strong>Resumen:</strong> {res.summary}</p>
              <p><strong>Motivo:</strong> {res.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubidaMasiva;
