import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { obtenerPuestos } from "../services/puestosService";
import { crearProcesoCarga } from "../services/procesosService";
import { obtenerAreas } from "../services/areasService"; // Nuevo servicio para áreas

const CrearProcesoCarga = () => {
  const { token } = useAuth();

  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [puestos, setPuestos] = useState([]);
  const [filteredPuestos, setFilteredPuestos] = useState([]);
  const [jobId, setJobId] = useState("");
  const [reque, setReque] = useState("");
  const [funcs, setFuncs] = useState("");
  //const [area, setArea] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);


  // Cargar áreas y puestos al montar
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const areasData = await obtenerAreas(token);
        setAreas(areasData);
        const puestosData = await obtenerPuestos(token);
        setPuestos(puestosData);
      } catch (error) {
        console.error("Error al cargar datos de áreas o puestos", error);
      }
    };
    cargarDatos();
  }, [token]);

  // Filtrar puestos cuando cambia el área seleccionada
  useEffect(() => {
    if (selectedArea) {
      setFilteredPuestos(
        puestos.filter(p => p.area && p.area.id === parseInt(selectedArea))
      );
    } else {
      setFilteredPuestos([]);
    }
    // Resetear selección de puesto al cambiar área
    setJobId("");
  }, [selectedArea, puestos]);



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobId || !reque || !funcs) {
      alert("Todos los campos son obligatorios");
      return;
    }

    try {
      setCargando(true);
      const data = await crearProcesoCarga(token, {
        job_id: jobId,
        reque,
        funcs,
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
        {/* Select de áreas */}
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="border p-2 w-full"
          required
        >
          <option value="">-- Selecciona un área --</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* Select de puestos filtrados */}
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="border p-2 w-full"
          required
          disabled={!selectedArea}
        >
          <option value="">-- Selecciona un puesto --</option>
          {filteredPuestos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {selectedArea && filteredPuestos.length === 0 && (
          <p className="text-red-500 text-sm">No hay puestos disponibles para esta área.</p>
        )}
        
        <textarea
          placeholder="Requisitos del puesto"
          value={reque}
          onChange={(e) => setReque(e.target.value)}
          className="border p-2 w-full"
          rows={5}
          required
        />

        <textarea
          placeholder="Funciones del puesto"
          value={funcs}
          onChange={(e) => setFuncs(e.target.value)}
          className="border p-2 w-full"
          rows={8}
          required
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          type="submit"
          disabled={cargando}
        >
          {cargando ? "Creando..." : "Crear Proceso"}
        </button>
      </form>

  {resultado && (
      <div className="bg-green-100 border border-green-300 p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">
          ✅ Proceso creado correctamente
        </h3>

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

    {/* 👉 Nuevo: enlace al formulario de postulación */}
        {resultado.form_url && (
            <p className="mt-4">
              <strong>Formulario de postulación:</strong>{" "}
              <a
                href={resultado.form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                📝 Abrir formulario
              </a>
            </p>
          )}
        </div>
      )}

    </div>
  );
};

export default CrearProcesoCarga;
