import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { obtenerEvaluacionPorId } from "../services/cvService";

const DetalleEvaluacion = () => {
    const { id } = useParams();
    const { token } = useAuth();
    const [evalData, setEvalData] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEval = async () => {
        try {
            const data = await obtenerEvaluacionPorId(token, id);
            setEvalData(data);
        } catch (err) {
            setError("No se pudo obtener la evaluación");
        }
        };
        fetchEval();
    }, [id]);

    if (error) return <p className="p-4 text-red-500">{error}</p>;
    if (!evalData) return <p className="p-4">Cargando evaluación...</p>;

    return (
        <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Detalle de Evaluación</h2>
        <div className="bg-white shadow p-6 rounded space-y-3">
            <p><strong>Nombre:</strong> {evalData.name}</p>
            <p><strong>Match:</strong> {evalData.match}%</p>
            <p><strong>Skills detectadas:</strong> {evalData.skills}</p>
            <p><strong>Resumen:</strong> {evalData.summary}</p>
            <p><strong>Motivo:</strong> {evalData.reason}</p>
            <p><strong>Fecha:</strong> {new Date(evalData.date_create).toLocaleString()}</p>
            {/* <p><strong>Puesto ID:</strong> {evalData.puesto_id}</p> */}
            <button
                onClick={() => navigate(-1)}
                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
                ← Volver
            </button>
        </div>
        </div>
    );
};

export default DetalleEvaluacion;
