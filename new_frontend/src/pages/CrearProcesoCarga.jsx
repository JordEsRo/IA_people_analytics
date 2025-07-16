import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { obtenerPuestos } from "../services/puestosService";
import { crearProcesoCarga } from "../services/procesosService";

const CrearProcesoCarga = () => {
  const { token } = useAuth();

  const [puestos, setPuestos] = useState([]);
  const [jobId, setJobId] = useState("");
  const [reque, setReque] = useState("");
  const [area, setArea] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarPuestos = async () => {
      const data = await obtenerPuestos(token);
      setPuestos(data);
    };
    cargarPuestos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobId || !reque || !area) {
      alert("Todos los campos son obligatorios");
      return;
    }

    try {
      setCargando(true);
      const data = await crearProcesoCarga(token, {
        job_id: jobId,
        reque,
        area,
      });
      setResultado(data);
    } catch (err) {
      console.error("Error al crear proceso", err);
      alert("Error al crear el proceso");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Crear Proceso de Carga</h2>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="border p-2 w-full"
          required
        >
          <option value="">-- Selecciona un puesto --</option>
          {puestos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Área (Ej. Marketing)"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="border p-2 w-full"
          required
        />

        <textarea
          placeholder="Requisitos del puesto"
          value={reque}
          onChange={(e) => setReque(e.target.value)}
          className="border p-2 w-full"
          rows={4}
          required
        />

        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">
          Crear Proceso
        </button>
      </form>

      {cargando && <p>Creando proceso...</p>}

      {resultado && (
        <div className="bg-green-100 border border-green-300 p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Proceso creado correctamente</h3>
          <p><strong>Código:</strong> {resultado.code}</p>
          <p><strong>ID Carpeta:</strong> {resultado.drive_folder_id}</p>
          <p>
            <strong>Enlace a carpeta:</strong>{" "}
            <a
              href={resultado.drive_folder_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              📂 Abrir carpeta en Google Drive
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default CrearProcesoCarga;
