import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  BarChart, Bar, Cell 
} from 'recharts';
import { ShieldAlert, Users, Activity, ScanLine, Eye, AlertTriangle, Shield, Lock, Unlock, X, Zap, Monitor, Clock as ClockIcon } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { collectDeviceFingerprint } from '../utils/deviceFingerprint';
import { API_BASE_URL, WS_BASE_URL } from '../apiConfig';

// --- MOCK DATA ---
const alertVolumeData = [
  { day: 'Apr 10', alerts: 45 }, { day: 'Apr 11', alerts: 52 }, { day: 'Apr 12', alerts: 38 },
  { day: 'Apr 13', alerts: 65 }, { day: 'Apr 14', alerts: 48 }, { day: 'Apr 15', alerts: 55 },
  { day: 'Apr 16', alerts: 82 }, { day: 'Apr 17', alerts: 95 }, { day: 'Apr 18', alerts: 110 },
  { day: 'Apr 19', alerts: 105 }, { day: 'Apr 20', alerts: 130 }, { day: 'Apr 21', alerts: 145 },
  { day: 'Apr 22', alerts: 180 }, { day: 'Apr 23', alerts: 215 },
];

// Leaderboard, riskDistribution, and liveAlerts dynamic states moved inside component

// Generate 7x24 heatmap mock data (0 = none, 1 = low, 2 = med, 3 = high, 4 = critical)
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const heatmapData = days.map(day => ({
  day,
  hours: Array.from({ length: 24 }, () => {
    // Make off-hours (0-5, 22-23) usually 0 or 1, and work hours higher, but inject some random anomalies.
    return Math.random() > 0.9 ? Math.floor(Math.random() * 3) + 2 : Math.random() > 0.7 ? 1 : 0;
  })
}));

// --- COMPONENTS ---

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0A0E1A]/95 border border-[#00FFD1]/30 p-3 rounded-lg shadow-glow-cyan text-sm">
        <p className="text-gray-300 font-bold mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="flex grid-cols-2 gap-4 justify-between" style={{ color: entry.color || '#00FFD1' }}>
            <span className="uppercase tracking-wider">{entry.name}:</span>
            <span className="font-mono text-white">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Animated Number Component
const AnimatedCounter = ({ end, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span className="font-mono">{count}</span>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [riskDistributionData, setRiskDistributionData] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [suspendedAccounts, setSuspendedAccounts] = useState([]);
  const [restoreModal, setRestoreModal] = useState(null);
  const [restoreReason, setRestoreReason] = useState('');
  const [demoStatus, setDemoStatus] = useState('');

  useEffect(() => {
    // 1. Fetch initial Leaderboard & Risk Data
    axios.get(`${API_BASE_URL}/users/risk-scores`)
      .then(res => {
        const users = res.data;
        // Sort descending by score for leaderboard
        const sorted = [...users].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10);
        
        // Map backend schema to frontend table Schema
        setLeaderboardData(sorted.map(u => ({
          id: u.user_id,
          dept: u.department,
          score: Math.round(u.risk_score),
          lastAnomaly: u.last_active, // Use last_active as proxy
          status: u.status,
          // Extract trust logic
          lastDeviceTrust: u.risk_score > 70 ? 0 : 2
        })));
        
        // Build the Risk Distribution mathematically
        let low = 0, med = 0, crit = 0;
        users.forEach(u => {
          if (u.risk_score > 70) crit++;
          else if (u.risk_score >= 50) med++;
          else low++;
        });
        
        setRiskDistributionData([
          { name: 'Low', value: low, color: '#3B82F6' },
          { name: 'Medium', value: med, color: '#F59E0B' },
          { name: 'Critical', value: crit, color: '#FF3B3B' },
        ]);
      })
      .catch(console.error);

    // 2. Fetch Initial Alerts Timeline
    axios.get(`${API_BASE_URL}/alerts`)
      .then(res => {
        setLiveAlerts(res.data.slice(0, 10).map(a => ({
          id: a.id,
          severity: a.severity,
          user: a.user_id,
          desc: a.description,
          time: a.timestamp
        })));
      })
      .catch(console.error);

    // 3. Connect WebSocket for Live Alerts Feed
    const ws = new WebSocket(WS_BASE_URL);
    ws.onmessage = (event) => {
      const a = JSON.parse(event.data);
      const newAlert = {
        id: a.id,
        severity: a.severity,
        user: a.user_id,
        desc: a.description,
        time: a.timestamp
      };
      
      setLiveAlerts(prev => {
        const next = [newAlert, ...prev];
        return next.slice(0, 15); // Keep last 15 in UI
      });
    };

    return () => ws.close(); // Cleanup
  }, []);

  // Fetch suspended accounts for BRANCH_MANAGER
  useEffect(() => {
    if (user?.role === 'BRANCH_MANAGER') {
      axios.get(`${API_BASE_URL}/users/suspensions`)
        .then(res => setSuspendedAccounts(res.data))
        .catch(console.error);
    }
  }, [user]);

  const handleRestore = async (userId) => {
    if (!restoreReason.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/users/${userId}/restore-access`, { reason: restoreReason });
      setSuspendedAccounts(prev => prev.filter(s => s.user_id !== userId));
      setRestoreModal(null);
      setRestoreReason('');
    } catch (err) { console.error(err); }
  };

  const simulateDeviceMismatch = async (type) => {
    setDemoStatus(`Simulating ${type}...`);
    try {
      const fp = collectDeviceFingerprint();
      let spoofed = { ...fp };
      if (type === 'screen') {
        spoofed.screen = '1366x768';
      } else if (type === 'timezone') {
        spoofed.timezone = 'Europe/London';
      } else if (type === 'unknown') {
        spoofed.deviceId = `FP-UNKNOWN-${Math.random().toString(16).slice(2, 10)}`;
      }
      await axios.post(`${API_BASE_URL}/auth/login`, {
        username: 'USR-001B', password: 'test', role: 'FRAUD_INVESTIGATOR',
        deviceFingerprint: spoofed
      });
      setDemoStatus(`✅ ${type} — Login allowed (unexpected)`);
    } catch (err) {
      if (err.response?.status === 403) {
        setDemoStatus(`🚨 ${type} — ACCOUNT FROZEN! (403)`);
        // Refresh suspended list
        axios.get(`${API_BASE_URL}/users/suspensions`)
          .then(res => setSuspendedAccounts(res.data)).catch(() => {});
      } else {
        setDemoStatus(`❌ ${type} — Error: ${err.message}`);
      }
    }
    setTimeout(() => setDemoStatus(''), 5000);
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 lg:p-8 text-white relative font-sans overflow-x-hidden">
      
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-danger/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary/20 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-widest glow-cyan-text uppercase">System Overview</h1>
            <p className="text-muted text-sm uppercase tracking-widest flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Live Node Connection Active
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm font-mono bg-white/5 border border-white/10 px-4 py-2 rounded-lg backdrop-blur-md">
            <span className="text-muted">Network Load:</span>
            <span className="text-primary">84.2%</span>
            <span className="text-muted ml-4">Threat Level:</span>
            <span className="text-danger glow-red-text font-bold">ELEVATED</span>
          </div>
        </div>

        {/* --- METRICS ROW --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: AlertTriangle, label: 'Total Alerts (24h)', val: 215, color: 'text-[#FF3B3B]', border: 'border-[#FF3B3B]/30' },
            { icon: Users, label: 'High Risk Users', val: 38, color: 'text-[#F97316]', border: 'border-[#F97316]/30' },
            { icon: Activity, label: 'Avg Risk Score', val: 42, color: 'text-[#00FFD1]', border: 'border-primary/30' },
            { icon: ScanLine, label: 'Active Investigations', val: 12, color: 'text-white', border: 'border-white/20' },
          ].map((metric, i) => (
            <div key={i} className={clsx("glass-panel p-6 rounded-xl border relative overflow-hidden group transition-all hover:bg-white/5", metric.border)}>
              <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-50" style={{ color: metric.color.replace('text-[', '').replace(']', '') }} />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-muted text-xs font-bold uppercase tracking-widest mb-2">{metric.label}</p>
                  <h2 className={clsx("text-4xl font-extrabold font-mono", metric.color)}>
                    <AnimatedCounter end={metric.val} />
                  </h2>
                </div>
                <div className={clsx("p-3 rounded-lg bg-white/5", metric.color)}>
                  <metric.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left/Middle Column (Charts & Tables) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Alert Volume Chart */}
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6">Alert Volume (14 Days)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={alertVolumeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                      <XAxis dataKey="day" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="alerts" 
                        stroke="#00FFD1" 
                        strokeWidth={3} 
                        dot={{ fill: '#0A0E1A', stroke: '#00FFD1', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#00FFD1', stroke: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Risk Distribution Chart */}
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/40 transition-colors">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6">Risk Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                      <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff0a' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {riskDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Risk Leaderboard Table */}
            <div className="glass-panel rounded-xl border border-primary/20 overflow-hidden text-sm">
              <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF3B3B]" />
                  High Risk Entities Leaderboard
                </h3>
                <button className="text-xs text-primary hover:text-white uppercase tracking-wider transition-colors">
                  View All Directory
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 uppercase text-xs tracking-wider text-muted border-b border-white/10">
                      <th className="p-4 font-medium">User ID</th>
                      <th className="p-4 font-medium">Department</th>
                      <th className="p-4 font-medium">Risk Score</th>
                      <th className="p-4 font-medium">Last Anomaly</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium text-center">Last Device</th>
                      <th className="p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {leaderboardData.map((user) => (
                      <tr key={user.id} className={clsx("hover:bg-white/5 transition-colors group relative", user.lastDeviceTrust === 0 && "border-l-4 border-l-[#FF3B3B]/70")}>
                        <td className="p-4 font-mono font-bold text-white group-hover:text-primary transition-colors">{user.id}</td>
                        <td className="p-4 text-gray-300">{user.dept}</td>
                        <td className="p-4">
                          <span className={clsx(
                            "px-2 py-1 rounded text-xs font-bold font-mono",
                            user.score > 70 ? "bg-[#FF3B3B]/20 text-[#FF3B3B] border border-[#FF3B3B]/50" :
                            "bg-primary/20 text-primary border border-primary/50"
                          )}>
                            {user.score}/100
                          </span>
                        </td>
                        <td className="p-4 text-muted">{user.lastAnomaly}</td>
                        <td className="p-4">
                          <span className={clsx(
                            "flex items-center gap-2 text-xs uppercase tracking-wider",
                            user.status === 'Suspended' ? "text-[#FF3B3B]" :
                            user.status === 'Watchlist' ? "text-[#F59E0B]" : "text-[#00FFD1]"
                          )}>
                            <span className={clsx(
                              "w-1.5 h-1.5 rounded-full",
                              user.status === 'Suspended' ? "bg-[#FF3B3B] animate-pulse" :
                              user.status === 'Watchlist' ? "bg-[#F59E0B]" : "bg-[#00FFD1]"
                            )}></span>
                            {user.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {user.lastDeviceTrust === 2 ? (
                            <Shield className="w-4 h-4 mx-auto text-[#00FFD1]" title="Trusted Device" />
                          ) : user.lastDeviceTrust === 1 ? (
                            <Shield className="w-4 h-4 mx-auto text-[#F59E0B]" title="Partial Match" />
                          ) : (
                            <Shield className="w-4 h-4 mx-auto text-[#FF3B3B]" title="Unknown Device" />
                          )}
                        </td>
                        <td className="p-4">
                          <button className="flex items-center justify-center p-2 rounded bg-white/5 hover:bg-primary/20 text-gray-300 hover:text-primary border border-transparent hover:border-primary/50 transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Heatmap Section */}
            <div className="glass-panel p-6 rounded-xl border border-primary/20 text-sm">
              <h3 className="font-bold text-gray-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Access Pattern Anomaly Heatmap (Top Users)
              </h3>
              
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Hours Header */}
                  <div className="flex mb-2">
                    <div className="w-12"></div> {/* Empty corner */}
                    <div className="flex-1 flex justify-between text-[10px] text-muted font-mono px-1">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="flex-1 text-center">{i}h</div>
                      ))}
                    </div>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="space-y-1">
                    {heatmapData.map((row) => (
                      <div key={row.day} className="flex items-center gap-2">
                        <div className="w-10 text-xs text-muted uppercase tracking-wider font-bold text-right pt-0.5">
                          {row.day}
                        </div>
                        <div className="flex-1 flex gap-1">
                          {row.hours.map((intensity, idx) => (
                            <div 
                              key={`${row.day}-${idx}`}
                              className={clsx(
                                "flex-1 aspect-square rounded-[2px] transition-all hover:ring-1 hover:ring-white z-10 cursor-crosshair",
                                intensity === 4 ? "bg-[#FF3B3B] shadow-[0_0_8px_rgba(255,59,59,0.5)]" :
                                intensity === 3 ? "bg-[#F97316]" :
                                intensity === 2 ? "bg-[#F59E0B]" :
                                intensity === 1 ? "bg-primary/40" :
                                "bg-white/5"
                              )}
                              title={`${row.day} ${idx}:00 - Intensity: ${intensity}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex justify-end items-center mt-4 gap-2 text-xs text-muted">
                    <span>Nominal</span>
                    <div className="w-3 h-3 bg-white/5 rounded-sm"></div>
                    <div className="w-3 h-3 bg-primary/40 rounded-sm"></div>
                    <div className="w-3 h-3 bg-[#F59E0B] rounded-sm"></div>
                    <div className="w-3 h-3 bg-[#F97316] rounded-sm"></div>
                    <div className="w-3 h-3 bg-[#FF3B3B] shadow-[0_0_8px_rgba(255,59,59,0.5)] rounded-sm"></div>
                    <span>Critical</span>
                  </div>
                </div>
              </div>
            </div>

            {/* === AUTO-SUSPENDED ACCOUNTS (BRANCH_MANAGER ONLY) === */}
            {user?.role === 'BRANCH_MANAGER' && (
              <div className="glass-panel rounded-xl border-2 border-[#FF3B3B]/40 overflow-hidden text-sm shadow-[0_0_20px_rgba(255,59,59,0.1)]">
                <div className="p-5 border-b border-[#FF3B3B]/20 bg-[#FF3B3B]/5 flex justify-between items-center">
                  <h3 className="font-bold text-[#FF3B3B] uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Auto-Suspended Accounts
                  </h3>
                  <span className="text-[10px] bg-[#FF3B3B] text-white px-2 py-1 rounded font-bold uppercase tracking-wider animate-pulse">
                    {suspendedAccounts.length} Suspended
                  </span>
                </div>
                {suspendedAccounts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No auto-suspended accounts</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#FF3B3B]/5 uppercase text-xs tracking-wider text-[#FF3B3B]/70 border-b border-[#FF3B3B]/20">
                          <th className="p-4 font-medium">User ID</th>
                          <th className="p-4 font-medium">Suspension Time</th>
                          <th className="p-4 font-medium">Reason</th>
                          <th className="p-4 font-medium">Mismatch Fields</th>
                          <th className="p-4 font-medium">Attempted Device</th>
                          <th className="p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#FF3B3B]/10">
                        {suspendedAccounts.map((s, idx) => (
                          <tr key={idx} className="hover:bg-[#FF3B3B]/5 transition-colors">
                            <td className="p-4 font-mono font-bold text-white">{s.user_id}</td>
                            <td className="p-4 text-gray-400 font-mono text-xs">{s.timestamp}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 rounded text-[10px] font-bold bg-[#FF3B3B]/20 text-[#FF3B3B] border border-[#FF3B3B]/30">
                                {s.freeze_reason}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {(s.mismatch_fields || []).map((f, fi) => (
                                  <span key={fi} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 font-mono text-xs text-gray-400">{s.attempted_deviceId}</td>
                            <td className="p-4">
                              <button
                                onClick={() => setRestoreModal(s)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00FFD1]/10 hover:bg-[#00FFD1]/20 border border-[#00FFD1]/40 hover:border-[#00FFD1] text-[#00FFD1] text-xs font-bold uppercase tracking-wider transition-all"
                              >
                                <Unlock className="w-3 h-3" /> Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* === SECURITY DEMO PANEL === */}
            <div className="glass-panel rounded-xl border border-[#FF3B3B]/30 overflow-hidden">
              <div className="p-5 border-b border-[#FF3B3B]/20 bg-[#FF3B3B]/5">
                <h3 className="font-bold text-[#FF3B3B] uppercase tracking-widest flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4" />
                  Security Demo — Zero Tolerance Mode
                </h3>
                <p className="text-[10px] text-gray-500 mt-1">For judge demonstration only. Each button triggers an immediate account freeze.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => simulateDeviceMismatch('screen')}
                    className="p-4 rounded-lg bg-[#FF3B3B]/10 hover:bg-[#FF3B3B]/20 border border-[#FF3B3B]/30 hover:border-[#FF3B3B] text-[#FF3B3B] transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Simulate Screen Mismatch</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Sends same deviceId but different screen resolution → Immediate Freeze</p>
                  </button>
                  <button
                    onClick={() => simulateDeviceMismatch('timezone')}
                    className="p-4 rounded-lg bg-[#FF3B3B]/10 hover:bg-[#FF3B3B]/20 border border-[#FF3B3B]/30 hover:border-[#FF3B3B] text-[#FF3B3B] transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ClockIcon className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Simulate Timezone Change</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Sends same deviceId but timezone = Europe/London → Immediate Freeze</p>
                  </button>
                  <button
                    onClick={() => simulateDeviceMismatch('unknown')}
                    className="p-4 rounded-lg bg-[#FF3B3B]/10 hover:bg-[#FF3B3B]/20 border border-[#FF3B3B]/30 hover:border-[#FF3B3B] text-[#FF3B3B] transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Simulate Unknown Device</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Sends completely new deviceId → Immediate Freeze</p>
                  </button>
                </div>
                {demoStatus && (
                  <div className={clsx(
                    "p-3 rounded-lg border text-sm font-mono text-center animate-pulse",
                    demoStatus.includes('FROZEN') ? "bg-[#FF3B3B]/10 border-[#FF3B3B]/40 text-[#FF3B3B]" :
                    demoStatus.includes('✅') ? "bg-[#00FFD1]/10 border-[#00FFD1]/40 text-[#00FFD1]" :
                    "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]"
                  )}>
                    {demoStatus}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (Live Feed) */}
          <div className="glass-panel rounded-xl border border-[#FF3B3B]/20 overflow-hidden flex flex-col h-[calc(100vh-250px)] min-h-[600px] shadow-glow-red/10 relative">
            
            <div className="p-5 border-b border-white/10 bg-[#FF3B3B]/5 flex justify-between items-center relative z-10">
              <h3 className="font-bold text-gray-100 uppercase tracking-widest flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-[#FF3B3B] animate-pulse" />
                Live Alert Feed
              </h3>
              <span className="text-[10px] bg-[#FF3B3B] text-white px-2 py-1 rounded font-bold uppercase tracking-wider animate-pulse">
                Live
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 relative z-10 custom-scrollbar">
              <div className="space-y-2">
                {liveAlerts.map((alert, idx) => (
                  <div 
                    key={alert.id} 
                    className="p-4 rounded-lg bg-black/40 border border-white/5 hover:border-white/20 transition-all group flex flex-col gap-3"
                    style={{ animation: `fade-in-right 0.3s ease-out ${idx * 0.1}s backwards` }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          "w-2 h-2 rounded-full",
                          alert.severity === 'critical' ? 'bg-[#FF3B3B] shadow-[0_0_5px_rgba(255,59,59,0.8)]' :
                          alert.severity === 'high' ? 'bg-[#F97316]' :
                          alert.severity === 'medium' ? 'bg-[#F59E0B]' : 'bg-primary'
                        )}></span>
                        <span className="text-xs font-mono font-bold text-white group-hover:text-primary transition-colors">
                          {alert.user}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted font-mono">{alert.time}</span>
                    </div>

                    <p className="text-sm text-gray-300 leading-snug">
                      {alert.desc}
                    </p>

                    <button className={clsx(
                      "w-full py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded border transition-all",
                      alert.severity === 'critical' ? "border-[#FF3B3B]/30 text-[#FF3B3B] hover:bg-[#FF3B3B]/10 hover:border-[#FF3B3B]" :
                      "border-white/10 text-muted hover:text-white hover:bg-white/5"
                    )}>
                      Investigate <Eye className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Ambient vertical line logic */}
            <div className="absolute top-0 right-4 w-[1px] h-full bg-gradient-to-b from-transparent via-[#FF3B3B]/20 to-transparent z-0"></div>
          </div>

        </div>
      </div>

      {/* === RESTORE ACCESS MODAL === */}
      {restoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setRestoreModal(null)}>
          <div className="bg-[#0D1117] border border-[#00FFD1]/30 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()} style={{ animation: 'scale-in 0.25s ease-out' }}>
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Unlock className="w-5 h-5 text-[#00FFD1]" />
                Restore Access
              </h2>
              <button onClick={() => setRestoreModal(null)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="glass-panel p-4 rounded-xl border border-[#FF3B3B]/20 bg-[#FF3B3B]/5">
                <p className="text-sm text-gray-300 mb-2">Are you sure you want to restore access for <span className="text-white font-bold font-mono">{restoreModal.user_id}</span>?</p>
                <p className="text-xs text-gray-500">Suspension reason: <span className="text-[#FF3B3B] font-bold">{restoreModal.freeze_reason}</span></p>
                <p className="text-xs text-gray-500 mt-1">Mismatch detected in: <span className="text-[#F59E0B] font-mono">{(restoreModal.mismatch_fields || []).join(', ')}</span></p>
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Restoration Reason (mandatory)</label>
                <textarea
                  value={restoreReason}
                  onChange={e => setRestoreReason(e.target.value)}
                  placeholder="Provide justification for restoring access..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00FFD1]/50 focus:ring-1 focus:ring-[#00FFD1]/30 transition-all resize-none"
                />
              </div>
              <button
                onClick={() => handleRestore(restoreModal.user_id)}
                disabled={!restoreReason.trim()}
                className={clsx(
                  "w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider border transition-all",
                  restoreReason.trim()
                    ? "bg-[#00FFD1]/20 border-[#00FFD1]/50 text-[#00FFD1] hover:bg-[#00FFD1]/30"
                    : "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                )}
              >
                <Unlock className="w-4 h-4" /> Confirm Restore Access
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
