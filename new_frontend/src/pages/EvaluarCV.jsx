import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { obtenerPuestos } from "../services/puestosService";
import { evaluarCV } from "../services/cvService";

const EvaluarCV = () => {
    const { token } = useAuth();
    const [puestos, setPuestos] = useState([]);
    const [archivo, setArchivo] = useState(null);
    const [puestoId, setPuestoId] = useState("");
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e) => {
    e.preventDefault();
    if (!archivo || !puestoId) return alert("Selecciona archivo y puesto");
    try {
        setCargando(true);
        const res = await evaluarCV(token, archivo, puestoId);
        setResultado(res);
    } catch (error) {
        alert("Ocurrió un error al evaluar el CV");
    } finally {
        setCargando(false);
    }
    };

    useEffect(() => {
        const fetchData = async () => {
        const data = await obtenerPuestos(token);
        setPuestos(data);
        };
        fetchData();
    }, []);

    return (
        <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Evaluar CV</h2>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <select
            value={puestoId}
            onChange={(e) => setPuestoId(e.target.value)}
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
            type="file"
            accept=".pdf"
            onChange={(e) => setArchivo(e.target.files[0])}
            className="border p-2 w-full"
            required
            />

            <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Evaluar
            </button>
        </form>

        {resultado && (
            <div className="bg-gray-100 p-4 rounded shadow">
            <h3 className="text-xl font-semibold mb-2">Resultado</h3>
            <p><strong>Nombre:</strong> {resultado.name}</p>
            <p><strong>Match:</strong> {resultado.match}%</p>
            <p><strong>Habilidades detectadas:</strong> {resultado.skills}</p>
            <p><strong>Resumen:</strong> {resultado.summary}</p>
            <p><strong>Motivo:</strong> {resultado.reason}</p>
            </div>
        )}
        
        {cargando && (
            <div className="flex items-center space-x-2 mb-4">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Evaluando CV...</span>
            </div>
            )}
        </div>
    );
};

export default EvaluarCV;
