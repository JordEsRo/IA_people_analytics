import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

const Areas = () => {
  const { token } = useAuth();
  const [areas, setAreas] = useState([]);
  const [nuevaArea, setNuevaArea] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const fetchAreas = async () => {
    try {
      const res = await API.get("/areas/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAreas(res.data);
    } catch (err) {
      console.error("Error al obtener áreas:", err);
      setError("No se pudieron cargar las áreas");
    }
  };

  useEffect(() => {
    fetchAreas();
  }, [token]);

  const handleCrearArea = async (e) => {
    e.preventDefault();
    if (!nuevaArea.trim()) return;

    setCargando(true);
    setError("");

    try {
      await API.post(
        "/areas/",
        { name: nuevaArea },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNuevaArea("");
      await fetchAreas();
    } catch (err) {
      console.error("Error al crear área:", err);
      setError("No se pudo crear el área. Verifica si ya existe.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Gestión de Áreas</h2>

      <form onSubmit={handleCrearArea} className="flex gap-2 mb-4">
        <input
          type="text"
          value={nuevaArea}
          onChange={(e) => setNuevaArea(e.target.value)}
          placeholder="Nombre del área"
          className="border p-2 flex-1"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={cargando}
        >
          {cargando ? "Creando..." : "Crear"}
        </button>
      </form>

      {error && (
        <div className="text-red-600 mb-4 font-medium">{error}</div>
      )}

      <ul className="border rounded divide-y">
        {areas.map((area) => (
          <li key={area.id} className="p-3">
            {area.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Areas;
