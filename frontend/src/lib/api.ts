/**
 * Axios instance configured for NoteHub API.
 * Handles JWT token injection and automatic refresh.
 */
import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor: attach access token and set content type
api.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('notehub_tokens');
    if (tokens) {
      const { access } = JSON.parse(tokens);
      if (access) {
        config.headers.Authorization = `Bearer ${access}`;
      }
    }
    // Let browser set Content-Type with boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and attempt token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const tokens = localStorage.getItem('notehub_tokens');
        if (tokens) {
          const { refresh } = JSON.parse(tokens);
          const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh });
          const newTokens = { access: res.data.access, refresh: res.data.refresh || refresh };
          localStorage.setItem('notehub_tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('notehub_tokens');
        localStorage.removeItem('notehub_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
