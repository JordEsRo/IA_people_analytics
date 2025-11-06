// src/pages/ApplyPage.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import ApplyForm from "../components/ApplyForm";

export default function ApplyPage() {
  const { processCode, formToken } = useParams();
  const [processData, setProcessData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProcess() {
      try {
        const res = await fetch(
          `http://localhost:8000/form/info/${processCode}/${formToken}`
        );
        if (!res.ok) {
          throw new Error("Error obteniendo datos del proceso");
        }
        const data = await res.json();
        setProcessData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProcess();
  }, [processCode, formToken]);

  if (loading) {
    return <div className="text-center mt-10">Cargando...</div>;
  }

  if (!processData) {
    return (
      <div className="text-center text-red-600 mt-10">
        No se encontró información del proceso.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <ApplyForm
        puesto={processData.process_name}
        processCode={processCode}
        processName={processData.process_name}
        driveFolderId={processData.drive_folder_id}
        formToken={formToken}
        submitUrl="http://localhost:8000/form/apply"
      />
    </div>
  );
}
