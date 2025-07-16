import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerPuestos } from "../services/puestosService";
import { obtenerEvaluacionesPorPuesto } from "../services/cvService";
import * as XLSX from "xlsx";

const HistorialEvaluaciones = () => {
    const { token } = useAuth();
    const [puestos, setPuestos] = useState([]);
    // const [puestoId, setPuestoId] = useState("");
    const [puestoId, setPuestoId] = useState(localStorage.getItem("puestoId") || "");
    const [evaluaciones, setEvaluaciones] = useState([]);

    const [filtroNombre, setFiltroNombre] = useState("");
    const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
    const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
    const [filtroMatchMin, setFiltroMatchMin] = useState("");
    const [filtroMatchMax, setFiltroMatchMax] = useState("");

    // const handlePuestoChange = async (e) => {
    //     const id = e.target.value;
    //     setPuestoId(id);
    //     if (id) {
    //     const data = await obtenerEvaluacionesPorPuesto(token, id);
    //     setEvaluaciones(data);
    //     } else {
    //     setEvaluaciones([]);
    //     }
    // };
/////////////////////////////////////////////////////////////////////////////////////////////////////
    const handlePuestoChange = async (e) => {
        const id = e.target.value;
        setPuestoId(id);
        localStorage.setItem("puestoId", id); // guardar selección

        if (id) {
            const data = await obtenerEvaluacionesPorPuesto(token, id);
            setEvaluaciones(data);
        } else {
            setEvaluaciones([]);
            localStorage.removeItem("puestoId"); // limpiar si no hay selección
        }
    };
///////////////////////////////////////////////////////////////////////////////////////////////////////
    //Carga los datos de puesto y evaluaciones
    useEffect(() => {
    const fetchPuestosYEvaluaciones = async () => {
        const puestosData = await obtenerPuestos(token);
        setPuestos(puestosData);

        const savedId = localStorage.getItem("puestoId");
        if (savedId) {
        setPuestoId(savedId);
        const evals = await obtenerEvaluacionesPorPuesto(token, savedId);
        setEvaluaciones(evals);
        }
    };

    fetchPuestosYEvaluaciones();
    }, []);
//////////////////////////////////////////////////////////////////////////////////////////////////
    //FILTROS
    const evaluacionesFiltradas = evaluaciones.filter((e) => {
        const nombreMatch = e.name.toLowerCase().includes(filtroNombre.toLowerCase());
        const matchNum = parseInt(e.match);
        const matchOk = (!filtroMatchMin || matchNum >= parseInt(filtroMatchMin)) &&
                        (!filtroMatchMax || matchNum <= parseInt(filtroMatchMax));

        const fecha = new Date(e.date_create);
        const desdeOk = !filtroFechaDesde || fecha >= new Date(filtroFechaDesde);
        const hastaOk = !filtroFechaHasta || fecha <= new Date(filtroFechaHasta + "T23:59:59");

        return nombreMatch && matchOk && desdeOk && hastaOk;
        });
//////////////////////////////////////////////////////////////////////////////////////////////
    //EXPORTAR CSV
    const exportarCSV = (data) => {
    if (!data.length) return alert("No hay datos para exportar");

    const headers = ["Nombre", "Match", "Skills", "Resumen", "Motivo", "Fecha"];
    const rows = data.map((e) => [
        `"${e.name}"`,
        `${e.match}%`,
        `"${e.skills}"`,
        `"${e.summary}"`,
        `"${e.reason}"`,
        new Date(e.date_create).toLocaleString(),
    ]);

    const csvContent =
        [headers, ...rows]
        .map((row) => row.join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "evaluaciones.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    };
//////////////////////////////////////////////////////////////////////////////////////////////////////////
    //EXPORTAR EXCEL
    const exportarExcel = (data) => {
        if (!data.length) return alert("No hay datos para exportar");

        const datosParaExcel = data.map((e) => ({
            Nombre: e.name,
            Match: `${e.match}%`,
            Skills: e.skills,
            Resumen: e.summary,
            Motivo: e.reason,
            Fecha: new Date(e.date_create).toLocaleString(),
        }));

        const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Evaluaciones");

        XLSX.writeFile(libro, "evaluaciones.xlsx");
    };
//////////////////////////////////////////////////////////////////////////////////////////////////////////
    //HTML
    return (
        <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Historial de Evaluaciones</h2>
        <button
            onClick={() => exportarCSV(evaluacionesFiltradas)}
            className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
            Exportar CSV
        </button>
        <button
            onClick={() => exportarExcel(evaluacionesFiltradas)}
            className="mb-4 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 ml-2"
            >
            Exportar Excel
        </button>
{/* Traer datos de puestos */}
        <select
            value={puestoId}
            onChange={handlePuestoChange}
            className="border p-2 w-full mb-4"
        >
            <option value="">-- Selecciona un puesto --</option>
            {puestos.map((p) => (
            <option key={p.id} value={p.id}>
                {p.name}
            </option>
            ))}
        </select>

{/* Tabla de filtros */}
        <div className="grid md:grid-cols-5 gap-2 mb-4">
        <input
            type="text"
            placeholder="Filtrar por nombre"
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            className="border p-2"
        />
        <input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="border p-2"
        />
        <input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="border p-2"
        />
        <input
            type="number"
            placeholder="Match mínimo"
            value={filtroMatchMin}
            onChange={(e) => setFiltroMatchMin(e.target.value)}
            className="border p-2"
        />
        <input
            type="number"
            placeholder="Match máximo"
            value={filtroMatchMax}
            onChange={(e) => setFiltroMatchMax(e.target.value)}
            className="border p-2"
        />
        </div>

{/* Llenado de tabla historial */}
        {evaluaciones.length > 0 ? (
            
            <table className="w-full table-auto border shadow">
            <thead className="bg-gray-200">
                <tr>
                <th className="px-4 py-2 border">Nombre</th>
                <th className="px-4 py-2 border">Match</th>
                {/* <th className="px-4 py-2 border">Skills</th>
                <th className="px-4 py-2 border">Resumen</th> */}
                <th className="px-4 py-2 border">Fecha</th>
                <th className="px-4 py-2 border"></th>
                </tr>
            </thead>
            <tbody>
                {evaluacionesFiltradas.map((e) => (
                <tr key={e.id}>
                    <td className="border px-4 py-2">{e.name}</td>
                    <td className="border px-4 py-2">{e.match}%</td>
                    {/* <td className="border px-4 py-2">{e.skills}</td>
                    <td className="border px-4 py-2">{e.summary}</td> */}
                    <td className="border px-4 py-2">
                        {new Date(e.date_create).toLocaleString()}
                    </td>
                    <td className="border px-4 py-2 text-blue-600 underline">
                        <Link to={`/evaluacion/${e.id}`}>Ver detalle</Link>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        ) : puestoId ? (
            <p>No hay evaluaciones registradas para este puesto.</p>
        ) : null}
        </div>
    );
};

export default HistorialEvaluaciones;
