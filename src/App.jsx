import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// Placeholder Components for Dashboard views
const Dashboard = () => <div className="p-6"><h1 className="text-3xl font-bold glow-cyan-text mb-4">Dashboard Overview</h1><p className="text-muted">System metrics and high-level anomaly detection status.</p></div>;
const Users = () => <div className="p-6"><h1 className="text-3xl font-bold glow-cyan-text mb-4">User Monitoring</h1><p className="text-muted">Track suspicious activity across individual accounts.</p></div>;
const Alerts = () => <div className="p-6"><h1 className="text-3xl font-bold glow-red-text mb-4">Critical Alerts</h1><p className="text-muted">Real-time fraud triggers and AI confidence scores.</p></div>;
const Graph = () => <div className="p-6"><h1 className="text-3xl font-bold glow-cyan-text mb-4">Knowledge Graph</h1><p className="text-muted">Visualize entity relationships and money movement vectors.</p></div>;
const Trajectory = () => <div className="p-6"><h1 className="text-3xl font-bold glow-cyan-text mb-4">Trajectory Analysis</h1><p className="text-muted">Predictive timeline mapping for flagged transactions.</p></div>;
const Blockchain = () => <div className="p-6"><h1 className="text-3xl font-bold glow-cyan-text mb-4">Blockchain Explorer</h1><p className="text-muted">Analyze crypto-to-fiat off-ramps and multi-sig wallets.</p></div>;

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
        <Route path="graph" element={<Graph />} />
        <Route path="trajectory" element={<Trajectory />} />
        <Route path="blockchain" element={<Blockchain />} />
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
