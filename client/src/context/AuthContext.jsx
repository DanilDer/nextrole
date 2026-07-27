import { createContext, useContext, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token'));

  function persist(userData, tokenValue) {
    setUser(userData);
    setToken(tokenValue);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', tokenValue);
  }

  async function login(email, password) {
    const data = await api.post('/api/auth/login', { email, password });
    persist(data.user, data.token);
    return data;
  }

  async function register(name, email, password) {
    const data = await api.post('/api/auth/register', { name, email, password });
    persist(data.user, data.token);
    return data;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
