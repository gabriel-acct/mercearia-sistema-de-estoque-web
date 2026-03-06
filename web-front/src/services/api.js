import axios from "axios";

const BASE_URL = "http://127.0.0.1:5000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.msg ?? err.response?.data?.message;
    const isAuthError = status === 401 || (status === 422 && msg?.toLowerCase?.().includes("segment"));
    if (isAuthError) {
      localStorage.removeItem("token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=1";
      }
    }
    return Promise.reject(err);
  }
);

/**
 * Chamada GET - passa apenas o caminho
 * @param {string} path - Ex: "/user", "/produtos", "/estoque"
 * @returns {Promise}
 */
export async function get(path, config = {}) {
  const { data } = await api.get(path, config);
  return data;
}


/**
 * Chamada POST
 * @param {string} path - Ex: "/user", "/login"
 * @param {object} body - Dados a enviar
 */
export async function post(path, body = {}, config = {}) {
  const { data } = await api.post(path, body, config);
  return data;
}

/**
 * Chamada PUT
 * @param {string} path - Ex: "/user/1"
 * @param {object} body - Dados a enviar
 */
export async function put(path, body = {}) {
  const { data } = await api.put(path, body);
  return data;
}

/**
 * Chamada DELETE
 * @param {string} path - Ex: "/user/1"
 */
export async function del(path) {
  const { data } = await api.delete(path);
  return data;
}

export default api;
