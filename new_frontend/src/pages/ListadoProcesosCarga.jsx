import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { obtenerProcesos, activarProcesoCarga, desactivarProcesoCarga } from "../services/procesosService"; //, cambiarEstadoProceso
import { Link } from "react-router-dom";

const ListadoProcesosCarga = () => {
  const { token } = useAuth();
  const [procesos, setProcesos] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    fetchProcesos();
  }, [filtros]);

  const fetchProcesos = async () => {
    const data = await obtenerProcesos(token, filtros);
    setProcesos(data);
  };

  const desactivar = async (id) => {
    try {
      await desactivarProcesoCarga(id, token);
      fetchProcesos(); // recarga la lista
    } catch (error) {
      console.error("Error al desactivar proceso", error);
    } finally {
    setProcesando(false);
  }
  };

  const activar = async (id) => {
    try {
      await activarProcesoCarga(id, token);
      fetchProcesos(); // recarga la lista
    } catch (error) {
      console.error("Error al activar proceso", error);
    }finally {
    setProcesando(false);
  }
  };


 return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Procesos de Carga</h2>

      {/* Filtros simples */}
      <div className="mb-4 space-x-4">
        <input
          type="text"
          placeholder="Área..."
          className="border p-1"
          onChange={(e) => setFiltros((f) => ({ ...f, area: e.target.value }))}
        />
        <input
          type="date"
          className="border p-1"
          onChange={(e) => setFiltros((f) => ({ ...f, fecha: e.target.value }))}
        />
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Código</th>
            <th className="p-2 border">Área</th>
            {procesos.some(p => p.autor) && <th className="p-2 border">Autor</th>}
            {/* <th className="p-2 border">Autor</th> */}
            <th className="p-2 border">Estado</th>
            <th className="p-2 border">Fecha de Creación</th>
            <th className="p-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>


          {procesos.map((p) => (
            <tr key={p.id} className="border p-4 rounded shadow mb-3">
              {/* <td className="p-2"><p><strong>Código:</strong> {p.code}</p></td> */}
              <td className="p-2">
                <Link to={`/procesos/${p.id}`} className="text-blue-600 underline">
                  <strong>{p.code}</strong>
                </Link>
              </td>
              <td className="p-2"><p><strong>Área:</strong> {p.area}</p></td>
              {p.autor && <td className="p-2"><p><strong>Autor:</strong> {p.autor}</p></td>}
              {/* <td className="p-2"><p><strong>Autor:</strong>{p.autor}</p></td> */}
              <td className="p-2"><p><strong>Estado:</strong> {p.state ? "Activo" : "Inactivo"}</p></td>
              <td className="p-2">{new Date(p.create_date).toLocaleDateString()}</td>
              <td className="mt-2 flex gap-2">
                <a
                  href={p.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Ver carpeta
                </a>

                {p.state ? (
                        <button
                          onClick={() => desactivar(p.id)}
                          className="bg-yellow-500 text-white px-3 py-1 rounded"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => activar(p.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Activar
                        </button>
                      )}


              </td>
            </tr>

          ))}


          {procesos.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center p-4">
                No hay procesos registrados.
              </td>
            </tr>
          )}


        </tbody>
      </table>
    </div>
  );
};


export default ListadoProcesosCarga;
