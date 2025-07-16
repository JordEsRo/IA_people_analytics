import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import Puestos from "./pages/Puestos";
import EvaluarCV from "./pages/EvaluarCV";
import Navbar from "./components/Navbar";
import HistorialEvaluaciones from "./pages/HistorialEvaluaciones";
import DetalleEvaluacion from "./pages/DetalleEvaluacion";
import { AuthProvider } from './context/AuthContext.jsx';
import GestionUsuarios from "./pages/GestionUsuarios.jsx";
import AuditoriaUsuario from "./pages/AuditoriaUsuario";
import SubidaMasiva from "./pages/SubidaMasiva";
import CrearProcesoCarga from "./pages/CrearProcesoCarga";
import ListadoProcesosCarga from "./pages/ListadoProcesosCarga";
import DetalleProcesoCarga from "./pages/DetalleProcesoCarga";
import ListadoPostulantes from "./pages/ListadoPostulantes";
import HistorialPostulante from "./pages/HistorialPostulante";
import HistorialEvaluacionesProcesos from "./pages/HistorialEvaluacionesProcesos";

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/puestos" element={<Puestos />} />
        {/* <Route path="/evaluar" element={<EvaluarCV />} />
        <Route path="/evaluar-cvs" element={<SubidaMasiva />} /> */}
        {/* <Route path="/historial" element={<HistorialEvaluaciones />} /> */}
        <Route path="/evaluacion/:id" element={<DetalleEvaluacion />} />
        <Route path="/crear-proceso-carga" element={<CrearProcesoCarga />} />
        <Route path="/procesos/" element={<ListadoProcesosCarga />} />
        <Route path="/procesos/:id" element={<DetalleProcesoCarga />} />
        <Route path="/postulantes" element={<ListadoPostulantes />} />
        <Route path="/postulantes/:dni/historial" element={<HistorialPostulante />} />
        <Route path="/historial-evaluaciones" element={<HistorialEvaluacionesProcesos />} />
         <Route
          path="/usuarios"
          element={
            <PrivateRoute>
              <GestionUsuarios />
            </PrivateRoute>
          }
        />
        <Route
          path="/usuarios/:id/auditoria"
          element={
            <PrivateRoute>
              <AuditoriaUsuario />
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
