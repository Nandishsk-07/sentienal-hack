import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid
} from 'recharts';
import {
  Users, Search, Filter, ChevronDown, ChevronUp, Eye, Shield, ShieldAlert, Fingerprint, ShieldCheck, ShieldX,
  AlertTriangle, Activity, Clock, Database, TrendingUp, X, ExternalLink, Wifi, Monitor, Globe, Cpu, MemoryStick
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { collectDeviceFingerprint } from '../utils/deviceFingerprint';
import { API_BASE_URL } from '../apiConfig';

/* ─── helpers ─── */
const riskColor = (score) =>
  score > 70 ? '#FF3B3B' : score >= 50 ? '#F59E0B' : '#00FFD1';

const riskLabel = (score) =>
  score > 70 ? 'CRITICAL' : score >= 50 ? 'MEDIUM' : 'LOW';

const statusStyle = (s) => {
  switch (s) {
    case 'Suspended': return { dot: 'bg-[#FF3B3B] animate-pulse', text: 'text-[#FF3B3B]' };
    case 'Watchlist': return { dot: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' };
    default: return { dot: 'bg-[#00FFD1]', text: 'text-[#00FFD1]' };
  }
};

// Fake sparkline data generator for each user (deterministic from risk_score)
const genSparkline = (score) => {
  const pts = [];
  let val = score * 0.6;
  for (let i = 0; i < 14; i++) {
    val = Math.max(0, Math.min(100, val + (Math.random() - 0.45) * 15));
    pts.push({ d: i, v: Math.round(val) });
  }
  pts.push({ d: 14, v: Math.round(score) });
  return pts;
};

/* ─── Mini Sparkline ─── */
const Sparkline = ({ data, color }) => (
  <ResponsiveContainer width="100%" height={40}>
    <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
        fill={`url(#spark-${color.replace('#', '')})`} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
);

/* ─── Custom Tooltip ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0A0E1A]/95 border border-[#00FFD1]/30 p-3 rounded-lg shadow-glow-cyan text-sm">
        <p className="text-gray-300 font-bold mb-1">{label}</p>
        {payload.map((e, i) => (
          <p key={i} className="flex justify-between gap-4" style={{ color: e.color || '#00FFD1' }}>
            <span className="uppercase tracking-wider">{e.name}:</span>
            <span className="font-mono text-white">{typeof e.value === 'number' ? e.value.toFixed(2) : e.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const UserDetailPanel = ({ user, transactions, onClose }) => {
  const { user: currentUser } = useAuth();
  const [devices, setDevices] = useState([]);
  
  useEffect(() => {
    const token = localStorage.getItem('sentinel_token');
    if (token) {
      axios.get(`${API_BASE_URL}/devices/${user.user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setDevices(res.data))
      .catch(console.error);
    }
  }, [user.user_id]);

  const removeDevice = (deviceId) => {
    const token = localStorage.getItem('sentinel_token');
    if (token) {
      axios.delete(`${API_BASE_URL}/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(() => {
        setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
      });
    }
  };

  const sparkData = useMemo(() => genSparkline(user.risk_score), [user.risk_score]);
  const anomTxs = transactions.filter(t => t.is_anomaly);
  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-[#0D1117] border border-primary/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/40 flex items-center justify-center text-primary font-bold text-lg font-mono">
              {user.user_id.slice(-4)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mono">{user.user_id}</h2>
              <p className="text-sm text-muted">{user.department}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
          {[
            { label: 'Risk Score', value: Math.round(user.risk_score), color: riskColor(user.risk_score), icon: Shield },
            { label: 'Anomalies', value: user.anomaly_count, color: '#F97316', icon: AlertTriangle },
            { label: 'Transactions', value: transactions.length, color: '#3B82F6', icon: Database },
            { label: 'Flagged Txns', value: anomTxs.length, color: '#FF3B3B', icon: Activity },
          ].map((s, i) => (
            <div key={i} className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="text-xs text-muted uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Risk Trend */}
        <div className="px-6 pb-4">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3">Risk Trend (14 Days)</h3>
          <div className="glass-panel rounded-xl border border-primary/20 p-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={riskColor(user.risk_score)} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={riskColor(user.risk_score)} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="d" stroke="#ffffff30" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={v => `D${v + 1}`} />
                <YAxis stroke="#ffffff30" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="v" name="Risk" stroke={riskColor(user.risk_score)}
                  strokeWidth={2} fill="url(#riskGrad)"
                  dot={{ fill: '#0A0E1A', stroke: riskColor(user.risk_score), strokeWidth: 2, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3">Recent Transactions</h3>
          <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto max-h-64 custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#0D1117]">
                  <tr className="bg-white/5 text-xs text-muted uppercase tracking-wider border-b border-white/10">
                    <th className="p-3 font-medium">TX ID</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Merchant</th>
                    <th className="p-3 font-medium">Timestamp</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.slice(0, 20).map((tx) => (
                    <tr key={tx.tx_id} className={clsx(
                      "hover:bg-white/5 transition-colors",
                      tx.is_anomaly && "bg-[#FF3B3B]/5"
                    )}>
                      <td className="p-3 font-mono text-white">{tx.tx_id}</td>
                      <td className={clsx("p-3 font-mono font-bold",
                        tx.is_anomaly ? "text-[#FF3B3B]" : "text-gray-300"
                      )}>
                        ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        {tx.is_anomaly && <span className="ml-2 text-[10px] bg-[#FF3B3B]/20 text-[#FF3B3B] px-1.5 py-0.5 rounded border border-[#FF3B3B]/30">ANOMALY</span>}
                      </td>
                      <td className="p-3 text-gray-400">{tx.merchant}</td>
                      <td className="p-3 text-muted font-mono text-xs">{tx.timestamp}</td>
                      <td className="p-3">
                        <span className="text-xs text-primary uppercase">{tx.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Registered Devices */}
        <div className="px-6 pb-6 mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Registered Devices
            </h3>
            {currentUser?.role === 'BRANCH_MANAGER' && (
              <button className="text-xs text-[#00FFD1] border border-[#00FFD1]/30 hover:bg-[#00FFD1]/10 px-3 py-1 rounded transition-colors uppercase font-bold tracking-wider">
                Register New Device
              </button>
            )}
          </div>
          
          {devices.length === 0 ? (
            <div className="bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#FF3B3B]" />
              <span className="text-sm text-[#FF3B3B] font-bold">No trusted devices registered — all logins will be flagged.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((d, i) => (
                <div key={i} className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-white text-sm">{d.deviceId}</span>
                      {d.trust_level === 2 ? (
                        <span className="text-[10px] bg-[#00FFD1]/15 text-[#00FFD1] border border-[#00FFD1]/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1"><Shield className="w-3 h-3"/> TRUSTED</span>
                      ) : d.trust_level === 1 ? (
                        <span className="text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> PARTIAL</span>
                      ) : (
                        <span className="text-[10px] bg-[#FF3B3B]/15 text-[#FF3B3B] border border-[#FF3B3B]/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> UNKNOWN</span>
                      )}
                    </div>
                    <p className="text-xs text-muted flex gap-3">
                      <span>{d.userAgent ? "Win32" : "Unknown OS"}</span>
                      <span>{d.screen || "1920x1080"}</span>
                      <span>{d.timezone || "UTC"}</span>
                      <span>Last seen: {d.last_seen}</span>
                    </p>
                  </div>
                  {currentUser?.role === 'BRANCH_MANAGER' && (
                    <button onClick={() => removeDevice(d.deviceId)} className="text-[10px] text-[#FF3B3B] border border-[#FF3B3B]/30 hover:bg-[#FF3B3B]/10 px-2 py-1.5 rounded transition-colors uppercase font-bold tracking-wider whitespace-nowrap">
                      Remove Device
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Device Security Verification ─── */}
        <DeviceSecurityPanel userId={user.user_id} devices={devices} riskScore={user.risk_score} />

      </div>
    </div>
  );
};

/* ─── Device Security Verification Panel ─── */
const DeviceSecurityPanel = ({ userId, devices, riskScore }) => {
  console.log('DeviceSecurityPanel Props:', { userId, riskScore });
  const score = Number(riskScore || 0);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [spoofMode, setSpoofMode] = useState(false);

  const runDeviceCheck = async () => {
    setVerifying(true);
    setVerifyResult(null);
    const token = localStorage.getItem('sentinel_token');
    try {
      let fp = collectDeviceFingerprint();
      if (spoofMode) {
        fp = { ...fp, deviceId: `FP-UNKNOWN-${Math.random().toString(16).slice(2, 10)}` };
      }
      const res = await axios.post(`${API_BASE_URL}/devices/verify`, {
        user_id: userId,
        fingerprint: fp
      }, { headers: { Authorization: `Bearer ${token}` } });
      setVerifyResult({ ...res.data, fingerprint: fp });
    } catch (err) {
      setVerifyResult({ trust_level: -1, message: err.response?.data?.detail || 'Verification failed', is_registered: false, risk_contribution: 100 });
    }
    setVerifying(false);
  };

  const isFailed = verifyResult && verifyResult.trust_level < 2;
  const isTrusted = verifyResult && verifyResult.trust_level === 2;

  return (
    <div className="px-6 pb-6 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-[#F59E0B]" /> Device Security Verification
          <span className="ml-2 text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-muted font-mono">
            USER RISK: {score}
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={spoofMode} onChange={e => setSpoofMode(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#FF3B3B] cursor-pointer" />
            <span className="text-[10px] text-[#FF3B3B] font-bold uppercase tracking-widest">[Demo] Spoof Device</span>
          </label>
          <button onClick={runDeviceCheck} disabled={verifying}
            className="text-xs text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/10 px-3 py-1.5 rounded transition-colors uppercase font-bold tracking-wider disabled:opacity-50 flex items-center gap-1.5">
            {verifying ? <><Fingerprint className="w-3 h-3 animate-spin" /> Scanning...</> : <><Shield className="w-3 h-3" /> Run Check</>}
          </button>
        </div>
      </div>

      {!verifyResult && !verifying && (
        <div className="glass-panel rounded-xl border border-white/10 p-6 text-center">
          <Fingerprint className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Click "Run Check" to verify device trust for this user</p>
        </div>
      )}

      {verifying && (
        <div className="glass-panel rounded-xl border border-[#F59E0B]/30 p-8 text-center animate-pulse">
          <Fingerprint className="w-10 h-10 text-[#F59E0B] mx-auto mb-3 animate-spin" />
          <p className="text-sm text-[#F59E0B] font-bold uppercase tracking-widest">Scanning Device Fingerprint...</p>
        </div>
      )}

      {isFailed && score > 70 && (
        <div className="rounded-xl border-2 border-[#FF3B3B] bg-[#FF3B3B]/5 overflow-hidden shadow-[0_0_30px_rgba(255,59,59,0.15)]">
          <div className="bg-[#FF3B3B]/10 p-5 flex items-center gap-4 border-b border-[#FF3B3B]/20">
            <div className="w-14 h-14 bg-[#FF3B3B]/20 border border-[#FF3B3B] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,59,59,0.4)] animate-pulse">
              <ShieldAlert className="w-7 h-7 text-[#FF3B3B]" />
            </div>
            <div>
              <h4 className="text-xl font-extrabold text-[#FF3B3B] tracking-widest uppercase">Account Suspended</h4>
              <p className="text-xs text-gray-400 mt-1">Device mismatch detected for <span className="text-white font-mono">{userId}</span></p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-300 mb-3">
              Login from an <span className="text-[#FF3B3B] font-bold">unrecognized or mismatched device</span> detected.
            </p>
            <div className="bg-black/40 rounded-lg border border-white/10 p-3 mb-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-2">Verification Result</p>
              <p className="text-sm text-white font-mono">{verifyResult.message}</p>
              <p className="text-xs text-gray-500 mt-1">Risk contribution: <span className="text-[#FF3B3B] font-bold">+{verifyResult.risk_contribution}</span></p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg p-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                <span className="text-xs text-[#F59E0B] font-bold">Branch manager notified automatically.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {(isTrusted || (isFailed && score <= 70)) && (
        <div className="rounded-xl border-2 border-[#00FFD1] bg-[#00FFD1]/5 p-5 flex items-center gap-4 shadow-[0_0_20px_rgba(0,255,209,0.1)]">
          <div className="w-12 h-12 bg-[#00FFD1]/20 border border-[#00FFD1] rounded-full flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#00FFD1]" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-[#00FFD1] uppercase tracking-wider">Device Trusted</h4>
            <p className="text-xs text-gray-400 mt-1">
              {isFailed ? "Device verified successfully (Low Risk Profile)." : verifyResult.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════ MAIN PAGE ═══════════════════ */
const UserMonitoring = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/users/risk-scores`)
      .then(res => { setUsers(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const openProfile = async (user) => {
    setSelectedUser(user);
    try {
      const res = await axios.get(`${API_BASE_URL}/users/${user.user_id}/transactions`);
      setTransactions(res.data);
    } catch {
      setTransactions([]);
    }
  };

  /* ─── Derived Data ─── */
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.user_id.toLowerCase().includes(q) || u.department.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(u => u.status === statusFilter);
    if (riskFilter !== 'all') {
      list = list.filter(u => {
        if (riskFilter === 'critical') return u.risk_score > 70;
        if (riskFilter === 'medium') return u.risk_score >= 50 && u.risk_score <= 70;
        return u.risk_score < 50;
      });
    }

    list.sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'risk_score') return dir * (a.risk_score - b.risk_score);
      if (sortBy === 'anomaly_count') return dir * (a.anomaly_count - b.anomaly_count);
      if (sortBy === 'user_id') return dir * a.user_id.localeCompare(b.user_id);
      return 0;
    });

    return list;
  }, [users, search, statusFilter, riskFilter, sortBy, sortDir]);

  const stats = useMemo(() => ({
    total: users.length,
    critical: users.filter(u => u.risk_score >= 90).length,
    watchlist: users.filter(u => u.status === 'Watchlist').length,
    suspended: users.filter(u => u.status === 'Suspended').length,
  }), [users]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-primary" />
      : <ChevronUp className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 lg:p-8 text-white relative font-sans overflow-x-hidden">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#F97316]/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-primary/20 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-widest glow-cyan-text uppercase">User Monitoring</h1>
            <p className="text-muted text-sm uppercase tracking-widest flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {stats.total} Entities Under Surveillance
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="bg-[#FF3B3B]/10 text-[#FF3B3B] border border-[#FF3B3B]/30 px-3 py-1.5 rounded-lg text-xs font-bold">
              {stats.critical} CRITICAL
            </span>
            <span className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 px-3 py-1.5 rounded-lg text-xs font-bold">
              {stats.watchlist} WATCHLIST
            </span>
            <span className="bg-white/5 text-gray-400 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold">
              {stats.suspended} SUSPENDED
            </span>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="glass-panel rounded-xl border border-primary/20 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by User ID or Department..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all",
                  showFilters ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                )}
              >
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
              {statusFilter !== 'all' && (
                <button onClick={() => setStatusFilter('all')}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-bold">
                  Status: {statusFilter} <X className="w-3 h-3" />
                </button>
              )}
              {riskFilter !== 'all' && (
                <button onClick={() => setRiskFilter('all')}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[#FF3B3B] text-xs font-bold">
                  Risk: {riskFilter} <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Expanded Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Status</label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'Active', 'Watchlist', 'Suspended'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                        statusFilter === s
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                      )}>
                      {s === 'all' ? 'All' : s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Risk Level</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'all', label: 'All', color: 'white' },
                    { key: 'critical', label: 'Critical', color: '#FF3B3B' },
                    { key: 'medium', label: 'Medium', color: '#F59E0B' },
                    { key: 'low', label: 'Low', color: '#00FFD1' },
                  ].map(r => (
                    <button key={r.key} onClick={() => setRiskFilter(r.key)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                        riskFilter === r.key
                          ? `border-[${r.color}]/50 text-[${r.color}]`
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                      )}
                      style={riskFilter === r.key ? { color: r.color, borderColor: r.color + '66', backgroundColor: r.color + '15' } : {}}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted font-mono uppercase tracking-wider">
            Showing {filteredUsers.length} of {users.length} entities
          </p>
          <div className="flex gap-2 text-xs">
            <span className="text-muted">Sort:</span>
            {[{ key: 'risk_score', label: 'Risk' }, { key: 'anomaly_count', label: 'Anomalies' }, { key: 'user_id', label: 'ID' }].map(s => (
              <button key={s.key} onClick={() => toggleSort(s.key)}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 rounded border transition-all",
                  sortBy === s.key ? "border-primary/50 text-primary bg-primary/10" : "border-white/10 text-gray-500 hover:text-white"
                )}>
                {s.label} <SortIcon field={s.key} />
              </button>
            ))}
          </div>
        </div>

        {/* User Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map((user, idx) => {
              const color = riskColor(user.risk_score);
              const spark = genSparkline(user.risk_score);
              const st = statusStyle(user.status);

              return (
                <div key={user.user_id}
                  className="glass-panel rounded-xl border border-white/10 hover:border-primary/40 transition-all group cursor-pointer overflow-hidden"
                  style={{ animation: `fade-in-right 0.3s ease-out ${idx * 0.04}s backwards` }}
                  onClick={() => openProfile(user)}>

                  {/* Color accent top bar */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}66, transparent)` }} />

                  <div className="p-5">
                    {/* Top Row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-sm font-mono font-bold group-hover:border-primary/50 group-hover:text-primary transition-colors"
                          style={{ color }}>
                          {user.user_id.slice(-4)}
                        </div>
                        <div>
                          <p className="font-mono font-bold text-white text-sm group-hover:text-primary transition-colors">{user.user_id}</p>
                          <p className="text-xs text-muted">{user.department}</p>
                        </div>
                      </div>
                      <div className={clsx("flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold", st.text)}>
                        <span className={clsx("w-1.5 h-1.5 rounded-full", st.dot)} />
                        {user.status}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Risk</p>
                        <p className="text-lg font-bold font-mono" style={{ color }}>{Math.round(user.risk_score)}</p>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 inline-block"
                          style={{ color, backgroundColor: color + '15', border: `1px solid ${color}33` }}>
                          {riskLabel(user.risk_score)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Anomalies</p>
                        <p className="text-lg font-bold font-mono text-[#F97316]">{user.anomaly_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Last Active</p>
                        <p className="text-xs font-mono text-gray-400 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {user.last_active?.split(' ')[1]?.slice(0, 5) || '--'}
                        </p>
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className="rounded-lg bg-black/30 border border-white/5 p-2">
                      <Sparkline data={spark} color={color} />
                    </div>

                    {/* Expand CTA */}
                    <button className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-white/10 text-gray-500 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all">
                      <Eye className="w-3.5 h-3.5" /> View Profile
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                <Users className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">No users match your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <UserDetailPanel user={selectedUser} transactions={transactions} onClose={() => setSelectedUser(null)} />
      )}

      <style>{`
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.25s ease-out; }
        .animate-fade-in { animation: fade-in-right 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default UserMonitoring;
