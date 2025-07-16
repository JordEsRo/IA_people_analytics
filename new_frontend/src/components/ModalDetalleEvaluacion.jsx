import React from "react";

const ModalDetalleEvaluacion = ({ evaluacion, onClose }) => {
  if (!evaluacion) return null;

  // console.log(evaluacion)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-red-600 text-xl"
        >
          ✖
        </button>
        <h2 className="text-2xl font-bold mb-4">Detalle de Evaluación</h2>
        <div className="space-y-3 text-sm text-gray-800">
          <p><strong>Nombre:</strong> {evaluacion.name}</p>
          <p><strong>Match:</strong> {evaluacion.match}%</p>

          {evaluacion.summary && (
            <>
              <p className="font-semibold">Resumen:</p>
              <p className="whitespace-pre-wrap text-gray-700">{evaluacion.summary}</p>
            </>
          )}

          {evaluacion.reason && (
            <>
              <p className="font-semibold mb-1">Motivo:</p>
              <table className="w-full text-sm text-left border border-gray-300 mb-4">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    {evaluacion.reason.split("\n")[0].split("\t").map((col, idx) => (
                      <th key={idx} className="border px-2 py-1">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evaluacion.reason
                    .split("\n")
                    .slice(1)
                    .filter(row => row.trim() !== "")
                    .map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        {row.split("\t").map((cell, cellIndex) => (
                          <td key={cellIndex} className="border px-2 py-1">{cell}</td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}

          {evaluacion.skills && (
            <>
              <p className="font-semibold">Skills detectados:</p>
              <ul className="list-disc list-inside text-gray-700">
                {evaluacion.skills.split(",").map((skill, idx) => (
                  <li key={idx}>{skill.trim()}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleEvaluacion;