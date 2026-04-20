import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sg_token'));
  const [loading, setLoading] = useState(true);

  // Set axios default auth header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Fetch user profile on mount if token exists
  useEffect(() => {
    if (token) {
      axios.get(`${API}/api/auth/me`)
        .then(res => setUser(res.data.user))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API}/api/auth/login`, { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('sg_token', t);
    setToken(t);
    setUser(u);
    return res.data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await axios.post(`${API}/api/auth/register`, { name, email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('sg_token', t);
    setToken(t);
    setUser(u);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sg_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
