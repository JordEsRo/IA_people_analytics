import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" />;
    if (user === null) return <div className="p-4">Cargando permisos...</div>;
    if (user?.role !== "admin") return <Navigate to="/dashboard" />;

    return children;
};

        
export default PrivateRoute;
