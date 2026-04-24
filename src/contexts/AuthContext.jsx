import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
      setUser({ token, role, username });
    }
    setLoading(false);
  }, []);

  const login = async (username, password, role) => {
    // Mock login logic for hackathon scaffold
    // In production, this would be an API call returning a JWT
    const mockToken = `mock.jwt.token.${Date.now()}`;
    
    localStorage.setItem('sentinel_token', mockToken);
    localStorage.setItem('sentinel_role', role);
    localStorage.setItem('sentinel_username', username);
    
    setUser({ token: mockToken, role, username });
    return true;
  };

  const logout = () => {
    localStorage.removeItem('sentinel_token');
    localStorage.removeItem('sentinel_role');
    localStorage.removeItem('sentinel_username');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
