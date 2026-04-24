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
    const deviceId = localStorage.getItem('sentinel_device_id');
    const deviceTrustLevel = localStorage.getItem('sentinel_trust_level');

    if (token && role) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser({ token, role, username, deviceId, deviceTrustLevel });
    }
    setLoading(false);
  }, []);

  const login = async (username, password, role, deviceFingerprint) => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/auth/login', {
        username,
        password,
        role,
        deviceFingerprint
      });
      
      const token = response.data.access_token;
      const deviceTrustLevel = response.data.trust_level;
      
      localStorage.setItem('sentinel_token', token);
      localStorage.setItem('sentinel_role', role);
      localStorage.setItem('sentinel_username', username);
      if (deviceFingerprint) {
        localStorage.setItem('sentinel_device_id', deviceFingerprint.deviceId);
        localStorage.setItem('sentinel_trust_level', deviceTrustLevel);
      }
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser({ token, role, username, deviceId: deviceFingerprint?.deviceId, deviceTrustLevel, deviceFingerprint });
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
    localStorage.removeItem('sentinel_device_id');
    localStorage.removeItem('sentinel_trust_level');
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
