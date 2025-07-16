import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
    //const { token, logout } = useAuth();
    const { isAuthenticated, logout, user } = useAuth();
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate("/");
    };

    if (!isAuthenticated) return null;
    if (!user) return null;

    return (
        <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex gap-4">
            <Link to="/dashboard" className="hover:underline">Inicio</Link>
            <Link to="/puestos" className="hover:underline">Puestos</Link>
            {/* <Link to="/evaluar" className="hover:underline">Evaluar CV</Link>
            <Link to="/evaluar-cvs" className="hover:underline">Evaluar CV's</Link> */}
            <Link to="/crear-proceso-carga" className="hover:underline">Crear Proceso</Link>
            <Link to="/procesos" className="hover:underline">Listar procesos</Link>
            <Link to="/postulantes" className="hover:underline">Listar postulantes</Link>
            <Link to="/historial-evaluaciones" className="hover:underline">Listar evaluaciones</Link>
            {/* <Link to="/historial" className="hover:underline">Historial de CVs</Link> */}
            {user?.role === "admin" && (
                <Link to="/usuarios" className="hover:underline">Gestión de usuarios</Link>
            )}
        </div>
        <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded">
            Cerrar sesión
        </button>
        </nav>
    );
};

export default Navbar;
