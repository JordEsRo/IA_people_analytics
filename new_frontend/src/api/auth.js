import api from "./axios";

export const loginUser = async ({ username, password }) => {
  try {
    const response = await api.post(
      "/login",
      new URLSearchParams({ username, password }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    return null;
  }
};