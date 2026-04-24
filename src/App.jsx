import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import UserMonitoring from './pages/UserMonitoring';
import CriticalAlerts from './pages/CriticalAlerts';
import CollusionGraph from './pages/CollusionGraph';
import RiskTrajectory from './pages/RiskTrajectory';
import BlockchainLog from './pages/BlockchainLog';
import MyNotifications from './pages/MyNotifications';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<UserMonitoring />} />
        <Route path="alerts" element={<CriticalAlerts />} />
        <Route path="graph" element={<CollusionGraph />} />
        <Route path="trajectory" element={<RiskTrajectory />} />
        <Route path="blockchain" element={<BlockchainLog />} />
        <Route path="notifications" element={<MyNotifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
