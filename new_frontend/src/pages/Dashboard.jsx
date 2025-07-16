import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
    const { logout } = useAuth();

    return (
    <div className="p-6">
        <h1 className="text-2xl font-bold">Bienvenido</h1>
        <button
        onClick={logout}
        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
        >
        Cerrar sesión
        </button>
    </div>
    );
};

export default Dashboard;
