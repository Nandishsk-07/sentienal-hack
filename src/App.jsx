import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import CollusionGraph from './pages/CollusionGraph';
import RiskTrajectory from './pages/RiskTrajectory';
import BlockchainLog from './pages/BlockchainLog';

// Placeholder Components for secondary views
const Users = () => <div className="p-6"><h1 className="text-3xl font-bold glow-cyan-text mb-4">User Monitoring</h1><p className="text-muted">Track suspicious activity across individual accounts.</p></div>;
const Alerts = () => <div className="p-6"><h1 className="text-3xl font-bold glow-red-text mb-4">Critical Alerts</h1><p className="text-muted">Real-time fraud triggers and AI confidence scores.</p></div>;

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
        <Route path="users" element={<Users />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="graph" element={<CollusionGraph />} />
        <Route path="trajectory" element={<RiskTrajectory />} />
        <Route path="blockchain" element={<BlockchainLog />} />
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
