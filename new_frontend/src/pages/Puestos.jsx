import { useEffect, useState, useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { obtenerPuestos, crearPuesto, deshabilitarPuesto, editarPuesto, obtenerTodosPuestos, reactivarPuesto } from "../services/puestosService";
import { obtenerAreas } from "../services/areasService"; // Nuevo servicio para áreas

const Puestos = () => {
    const { token } = useAuth();
    const [puestos, setPuestos] = useState([]);
    const [form, setForm] = useState({ name: "", area_id: "" });
    const [areas, setAreas] = useState([]);
    const [editando, setEditando] = useState(null);
    
    const [verTodos, setVerTodos] = useState(false);

    const fetchPuestos = async () => {
        const data = await obtenerPuestos(token);
        setPuestos(data);
    };

    const fetchAreas = async () => {
      try {
        const res = await obtenerAreas(token);
        const lista = res?.data ?? res; // Soporte para servicios que devuelven directo un array
        if (Array.isArray(lista)) {
          setAreas(lista);
        } else {
          console.error("Respuesta inesperada de áreas:", res);
        }
      } catch (error) {
        console.error("Error al obtener áreas:", error);
      }
    };

    
    useEffect(() => {
        fetchPuestos();
        fetchAreas();
    }, []);

    
    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await crearPuesto(token, form);
        setForm({ name: "", area_id: "" });
        fetchPuestos();
    };

    return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Puestos de Trabajo</h2>

      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nombre del Puesto"
          className="border p-2 w-full"
          required
        />
        <select
          name="area_id"
          value={form.area_id}
          onChange={handleChange}
          className="border p-2 w-full"
          required
        >
          <option value="">Seleccione un Área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Registrar Puesto
        </button>
      </form>

      <label className="flex items-center mb-4">
        <input
          type="checkbox"
          className="mr-2"
          checked={verTodos}
          onChange={async (e) => {
            const checked = e.target.checked;
            setVerTodos(checked);
            const data = checked
              ? await obtenerTodosPuestos(token)
              : await obtenerPuestos(token);
            setPuestos(data);
          }}
        />
        Ver puestos deshabilitados
      </label>

      <table className="table-auto w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="px-4 py-2 border">ID</th>
            <th className="px-4 py-2 border">Nombre</th>
            <th className="px-4 py-2 border">Área</th>
            <th className="px-4 py-2 border"></th>
          </tr>
        </thead>
        <tbody>
          {puestos.map((p) => (
            <tr key={p.id}>
              <td className="border px-4 py-2">{p.id}</td>
              <td className="border px-4 py-2">{p.name}</td>
              <td className="border px-4 py-2">{p.area?.name}</td>
              <td className="py-2 px-4 border">
                <button
                  className="text-blue-600 hover:underline mr-2"
                  onClick={() => setEditando(p)}
                >
                  Editar
                </button>
                {p.state ? (
                  <button
                    className="text-red-600 hover:underline"
                    onClick={async () => {
                      if (
                        confirm("¿Seguro que deseas deshabilitar este puesto?")
                      ) {
                        await deshabilitarPuesto(p.id, token);
                        const data = verTodos
                          ? await obtenerTodosPuestos(token)
                          : await obtenerPuestos(token);
                        setPuestos(data);
                      }
                    }}
                  >
                    Deshabilitar
                  </button>
                ) : (
                  <button
                    className="text-green-600 hover:underline"
                    onClick={async () => {
                      const res = await reactivarPuesto(p.id, token);
                      alert(res.msg || "Puesto reactivado correctamente");
                      const data = await obtenerTodosPuestos(token);
                      setPuestos(data);
                    }}
                  >
                    Reactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editando && (
        <div className="mt-6 bg-gray-50 p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Editar Puesto</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await editarPuesto(editando.id, editando, token);
              const data = await obtenerPuestos(token);
              setPuestos(data);
              setEditando(null);
            }}
          >
            <input
              type="text"
              placeholder="Nombre"
              className="border p-1 mr-2"
              value={editando.name}
              onChange={(e) =>
                setEditando({ ...editando, name: e.target.value })
              }
              required
            />
            <select
              value={editando.area_id}
              onChange={(e) =>
                setEditando({ ...editando, area_id: e.target.value })
              }
              className="border p-1 mr-2"
              required
            >
              <option value="">Seleccione un Área</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <button
              className="bg-blue-500 text-white px-4 py-1 rounded mr-2"
              type="submit"
            >
              Guardar
            </button>
            <button
              className="bg-gray-400 text-white px-4 py-1 rounded"
              type="button"
              onClick={() => setEditando(null)}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Puestos;
