import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";

const ListadoPostulantes = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [postulantes, setPostulantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 15;
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (token) fetchPostulantes();
  }, [paginaActual, busqueda, token]);

  const fetchPostulantes = async () => {
    try {
      setCargando(true);
      const offset = (paginaActual - 1) * itemsPorPagina;
      const response = await API.get("/postulantes/", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          offset,
          limit: itemsPorPagina,
          search: busqueda || undefined,
        },
      });

      setPostulantes(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error("Error al obtener postulantes:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPaginaActual(1); // Reiniciar a la primera página
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Listado de Postulantes</h2>

      <input
        type="text"
        placeholder="Buscar por nombre, DNI o correo..."
        value={busqueda}
        onChange={handleBusqueda}
        className="mb-4 p-2 border border-gray-300 rounded w-full"
      />

      {cargando ? (
        <p>Cargando postulantes...</p>
      ) : postulantes.length === 0 ? (
        <p>No se encontraron postulantes.</p>
      ) : (
        <>
          <table className="w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">DNI</th>
                <th className="p-2 border">Nombre</th>
                <th className="p-2 border">Correo</th>
                <th className="p-2 border">Teléfono</th>
                <th className="p-2 border">Dirección</th>
                <th className="p-2 border">Registrado</th>
                <th className="p-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {postulantes.map((p) => (
                <tr key={p.dni} className="hover:bg-gray-50">
                  <td className="p-2 border">{p.dni}</td>
                  <td className="p-2 border">{p.name}</td>
                  <td className="p-2 border">{p.email || "-"}</td>
                  <td className="p-2 border">{p.telf || "-"}</td>
                  <td className="p-2 border">{p.address || "-"}</td>
                  <td className="p-2 border">
                    {new Date(p.regis_date).toLocaleDateString("es-PE")}
                  </td>
                  <td className="p-2 border">
                    <button
                      onClick={() => navigate(`/postulantes/${p.dni}/historial`)}
                      className="text-blue-600 hover:underline"
                    >
                      Ver historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: Math.ceil(total / itemsPorPagina) || 1 }, (_, i) => (
              <button
                key={i}
                onClick={() => setPaginaActual(i + 1)}
                className={`px-3 py-1 border rounded ${
                  paginaActual === i + 1
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ListadoPostulantes;
