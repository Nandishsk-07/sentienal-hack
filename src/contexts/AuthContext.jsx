import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session token
    const token = localStorage.getItem('sentinel_token');
    const role = localStorage.getItem('sentinel_role');
    const username = localStorage.getItem('sentinel_username');

    if (token && role) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser({ token, role, username });
    }
    setLoading(false);
  }, []);

  const login = async (username, password, role) => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/auth/login', {
        username,
        password,
        role
      });
      
      const token = response.data.access_token;
      
      localStorage.setItem('sentinel_token', token);
      localStorage.setItem('sentinel_role', role);
      localStorage.setItem('sentinel_username', username);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser({ token, role, username });
      return true;
    } catch (error) {
      console.error("Authentication failed", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('sentinel_token');
    localStorage.removeItem('sentinel_role');
    localStorage.removeItem('sentinel_username');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
