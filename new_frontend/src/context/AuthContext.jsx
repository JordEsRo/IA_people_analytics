import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; 
import { injectStore } from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refresh_token"));
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        injectStore({ logout, refreshToken, setToken }); // ⬅ inyecta en axios

        if (token) {
        try {
            const decoded = jwtDecode(token);
            setUser(decoded);
        } catch (e) {
            logout();
        }
        } else {
        setUser(null);
        }
    }, [token]);

    const login = (newToken, newRefreshToken) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem("refresh_token", newRefreshToken);
        setToken(newToken);
        setRefreshToken(newRefreshToken);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        navigate("/login");
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ token, login, logout, isAuthenticated, user }}>
        {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
