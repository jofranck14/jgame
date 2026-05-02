import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ Remplace par l'IP locale de ton PC (ipconfig → IPv4)
export const BASE_URL = "http://192.168.43.66:5000/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("jgame_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      AsyncStorage.multiRemove(["jgame_token", "jgame_user"]);
    }
    return Promise.reject(err);
  }
);

export default api;