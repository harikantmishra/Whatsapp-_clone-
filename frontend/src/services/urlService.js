import axios from "axios";

const apiUrl = `${import.meta.env.VITE_BACKEND_URI || "http://localhost:5000"}/api`;

const axiosInstance = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

export default axiosInstance;
export { axiosInstance };
