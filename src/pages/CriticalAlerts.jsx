import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
  XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid
} from 'recharts';
import {
  AlertTriangle, Shield, Search, Filter, X, Eye, Clock,
  CheckCircle, XCircle, MessageSquare, ChevronDown, ChevronUp,
  Zap, Bell, FileText, Send, TrendingUp, Activity
} from 'lucide-react';
import clsx from 'clsx';

/* ─── helpers ─── */
const severityConfig = {
  critical: { color: '#FF3B3B', bg: 'bg-[#FF3B3B]', border: 'border-[#FF3B3B]', glow: 'shadow-[0_0_12px_rgba(255,59,59,0.3)]', label: 'CRITICAL', icon: Zap },
  high:     { color: '#F97316', bg: 'bg-[#F97316]', border: 'border-[#F97316]', glow: '', label: 'HIGH', icon: AlertTriangle },
  medium:   { color: '#F59E0B', bg: 'bg-[#F59E0B]', border: 'border-[#F59E0B]', glow: '', label: 'MEDIUM', icon: Bell },
  low:      { color: '#3B82F6', bg: 'bg-[#3B82F6]', border: 'border-[#3B82F6]', glow: '', label: 'LOW', icon: Shield },
};

const statusConfig = {
  open:     { color: '#FF3B3B', bg: 'bg-[#FF3B3B]/15', border: 'border-[#FF3B3B]/40', label: 'OPEN', icon: AlertTriangle },
  resolved: { color: '#00FFD1', bg: 'bg-[#00FFD1]/15', border: 'border-[#00FFD1]/40', label: 'RESOLVED', icon: CheckCircle },
};

/* ─── Custom Tooltip ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0A0E1A]/95 border border-[#00FFD1]/30 p-3 rounded-lg shadow-glow-cyan text-sm">
        <p className="text-gray-300 font-bold mb-1">{label}</p>
        {payload.map((e, i) => (
          <p key={i} className="flex justify-between gap-4" style={{ color: e.color || '#00FFD1' }}>
            <span className="uppercase tracking-wider">{e.name}:</span>
            <span className="font-mono text-white">{e.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ─── Alert Detail Modal ─── */
const AlertDetailModal = ({ alert, onClose, onSubmitFeedback }) => {
  const [verdict, setVerdict] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sev = severityConfig[alert.severity] || severityConfig.low;

  const handleSubmit = async () => {
    if (!verdict) return;
    setSubmitting(true);
    await onSubmitFeedback(alert.id, verdict, notes);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-[#0D1117] border border-primary/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10" style={{ backgroundColor: sev.color + '08' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: sev.color + '20', border: `1px solid ${sev.color}40` }}>
              <sev.icon className="w-6 h-6" style={{ color: sev.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-mono">Alert #{alert.id}</h2>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: sev.color, backgroundColor: sev.color + '20', border: `1px solid ${sev.color}40` }}>
                {sev.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert Details */}
        <div className="p-6 space-y-5">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'User', value: alert.user_id, icon: Shield },
              { label: 'Time', value: alert.timestamp, icon: Clock },
              { label: 'Status', value: alert.status?.toUpperCase(), icon: Activity },
              { label: 'Severity', value: sev.label, icon: AlertTriangle },
            ].map((item, i) => (
              <div key={i} className="glass-panel p-3 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-3.5 h-3.5 text-muted" />
                  <span className="text-[10px] text-muted uppercase tracking-wider">{item.label}</span>
                </div>
                <p className="text-sm font-mono font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="glass-panel p-4 rounded-xl border border-white/10">
            <h4 className="text-xs text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Description
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">{alert.description}</p>
          </div>

          {/* Unknown Device Fingerprint Raw Expand */}
          {alert.description?.toLowerCase().includes("unregistered device") && (
            <div className="glass-panel p-4 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/5 overflow-hidden">
              <h4 className="text-xs text-[#F59E0B] uppercase tracking-wider mb-3 flex items-center gap-2 font-bold">
                <Zap className="w-3.5 h-3.5" /> High Risk Environment Payload
              </h4>
              <pre className="text-[10px] sm:text-xs font-mono text-gray-300 bg-[#0A0E1A] p-4 rounded-lg border border-[#F59E0B]/20 overflow-x-auto whitespace-pre-wrap word-break">
{`{
  "event": "Login Attempt",
  "reason": "Fingerprint mismatch across known registry database.",
  "captured_context": {
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/... Chrome/...",
    "timezone": "Asia/Kolkata",
    "screenResolution": "1920x1080",
    "cores": 8,
    "memory": 8,
    "platform": "Win32",
    "deviceId": "FP-UNKNOWN"
  }
}`}
              </pre>
            </div>
          )}

          {/* Investigator Notes (if any) */}
          {alert.investigator_notes && (
            <div className="glass-panel p-4 rounded-xl border border-primary/20 bg-primary/5">
              <h4 className="text-xs text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> Investigator Notes
              </h4>
              <p className="text-sm text-gray-300">{alert.investigator_notes}</p>
            </div>
          )}

          {/* Feedback Form */}
          {alert.status === 'open' && (
            <div className="glass-panel p-5 rounded-xl border border-primary/20">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Submit Investigation Verdict
              </h4>

              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { key: 'GENUINE', label: 'Genuine Threat', color: '#FF3B3B' },
                  { key: 'FALSE_POSITIVE', label: 'False Positive', color: '#00FFD1' },
                  { key: 'UNDER_REVIEW', label: 'Under Review', color: '#F59E0B' },
                ].map(v => (
                  <button key={v.key} onClick={() => setVerdict(v.key)}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all",
                      verdict === v.key
                        ? "text-white"
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30"
                    )}
                    style={verdict === v.key ? { color: v.color, borderColor: v.color + '66', backgroundColor: v.color + '20' } : {}}>
                    {v.label}
                  </button>
                ))}
              </div>

              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Add investigation notes..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none mb-4"
              />

              <button onClick={handleSubmit} disabled={!verdict || submitting}
                className={clsx(
                  "w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider border transition-all",
                  verdict
                    ? "bg-primary/20 border-primary/50 text-primary hover:bg-primary/30"
                    : "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                )}>
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <><Send className="w-4 h-4" /> Submit Verdict</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════ MAIN PAGE ═══════════════════ */
const CriticalAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [wsAlerts, setWsAlerts] = useState([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/alerts')
      .then(res => { setAlerts(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });

    // Live WebSocket feed
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/alerts');
    ws.onmessage = (event) => {
      const a = JSON.parse(event.data);
      setWsAlerts(prev => [a, ...prev].slice(0, 5));
      setAlerts(prev => [a, ...prev]);
    };
    return () => ws.close();
  }, []);

  const handleFeedback = async (alertId, verdict, notes) => {
    try {
      await axios.post(`http://127.0.0.1:8000/alerts/${alertId}/feedback`, { verdict, notes });
      setAlerts(prev => prev.map(a =>
        a.id === alertId
          ? { ...a, status: verdict !== 'UNDER_REVIEW' ? 'resolved' : 'open', investigator_notes: `[${verdict}] ${notes}` }
          : a
      ));
      setSelectedAlert(null);
    } catch (err) {
      console.error(err);
    }
  };

  /* ─── Derived Data ─── */
  const filteredAlerts = useMemo(() => {
    let list = [...alerts];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.user_id?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        String(a.id).includes(q)
      );
    }
    if (severityFilter !== 'all') list = list.filter(a => a.severity === severityFilter);
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);

    list.sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'id') return dir * (a.id - b.id);
      if (sortBy === 'severity') {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        return dir * ((order[a.severity] || 0) - (order[b.severity] || 0));
      }
      return 0;
    });
    return list;
  }, [alerts, search, severityFilter, statusFilter, sortBy, sortDir]);

  const stats = useMemo(() => ({
    total: alerts.length,
    open: alerts.filter(a => a.status === 'open').length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  }), [alerts]);

  const severityDistribution = useMemo(() => [
    { name: 'Critical', value: alerts.filter(a => a.severity === 'critical').length, color: '#FF3B3B' },
    { name: 'High', value: alerts.filter(a => a.severity === 'high').length, color: '#F97316' },
    { name: 'Medium', value: alerts.filter(a => a.severity === 'medium').length, color: '#F59E0B' },
    { name: 'Low', value: alerts.filter(a => a.severity === 'low').length, color: '#3B82F6' },
  ], [alerts]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-primary" /> : <ChevronUp className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] p-6 lg:p-8 text-white relative font-sans overflow-x-hidden">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF3B3B]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#FF3B3B]/20 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-widest glow-red-text uppercase">Critical Alerts</h1>
            <p className="text-muted text-sm uppercase tracking-widest flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-[#FF3B3B] animate-pulse" />
              Real-time Fraud Detection Engine Active
            </p>
          </div>
          <div className="flex items-center gap-3">
            {wsAlerts.length > 0 && (
              <span className="flex items-center gap-2 bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[#FF3B3B] px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse">
                <Zap className="w-3.5 h-3.5" /> {wsAlerts.length} NEW INCOMING
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Alerts', value: stats.total, color: '#3B82F6', icon: Bell },
            { label: 'Open', value: stats.open, color: '#FF3B3B', icon: AlertTriangle },
            { label: 'Critical', value: stats.critical, color: '#F97316', icon: Zap },
            { label: 'Resolved', value: stats.resolved, color: '#00FFD1', icon: CheckCircle },
          ].map((s, i) => (
            <div key={i} className="glass-panel p-5 rounded-xl border border-white/10 hover:border-white/20 transition-all relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: s.color + '80' }} />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-3xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5" style={{ color: s.color }}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Severity Distribution Bar */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-[#FF3B3B]/20 hover:border-[#FF3B3B]/40 transition-colors">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FF3B3B]" /> Severity Distribution
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityDistribution} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="value" name="Alerts" radius={[6, 6, 0, 0]}>
                    {severityDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Incoming Feed */}
          <div className="glass-panel rounded-xl border border-[#FF3B3B]/20 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 bg-[#FF3B3B]/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF3B3B] animate-pulse" /> Live Feed
              </h3>
              <span className="text-[10px] bg-[#FF3B3B] text-white px-2 py-0.5 rounded font-bold animate-pulse">LIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar max-h-52">
              {wsAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">Listening for alerts...</p>
                </div>
              ) : (
                wsAlerts.map((a, idx) => {
                  const sev = severityConfig[a.severity] || severityConfig.low;
                  return (
                    <div key={`ws-${a.id}-${idx}`}
                      className="p-3 rounded-lg bg-black/40 border border-white/5 hover:border-white/20 transition-all text-xs"
                      style={{ animation: `fade-in-right 0.3s ease-out ${idx * 0.08}s backwards` }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sev.color }} />
                          <span className="font-mono font-bold text-white">{a.user_id}</span>
                        </div>
                        <span className="text-[10px] text-muted font-mono">{a.timestamp}</span>
                      </div>
                      <p className="text-gray-400 truncate">{a.description}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="glass-panel rounded-xl border border-[#FF3B3B]/20 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by Alert ID, User ID, or description..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#FF3B3B]/50 focus:ring-1 focus:ring-[#FF3B3B]/30 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all",
                  showFilters ? "bg-[#FF3B3B]/20 border-[#FF3B3B]/50 text-[#FF3B3B]" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                )}>
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
              {severityFilter !== 'all' && (
                <button onClick={() => setSeverityFilter('all')}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#F97316]/10 border border-[#F97316]/30 text-[#F97316] text-xs font-bold">
                  {severityFilter} <X className="w-3 h-3" />
                </button>
              )}
              {statusFilter !== 'all' && (
                <button onClick={() => setStatusFilter('all')}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-bold">
                  {statusFilter} <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Severity</label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'critical', 'high', 'medium', 'low'].map(s => {
                    const cfg = severityConfig[s];
                    return (
                      <button key={s} onClick={() => setSeverityFilter(s)}
                        className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                          severityFilter === s ? "" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                        )}
                        style={severityFilter === s && cfg ? { color: cfg.color, borderColor: cfg.color + '66', backgroundColor: cfg.color + '15' }
                          : severityFilter === s ? { color: '#00FFD1', borderColor: '#00FFD166', backgroundColor: '#00FFD115' } : {}}>
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted uppercase tracking-wider mb-2 block">Status</label>
                <div className="flex gap-2">
                  {['all', 'open', 'resolved'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                        statusFilter === s ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      )}>
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted font-mono uppercase tracking-wider">
            {filteredAlerts.length} alerts found
          </p>
          <div className="flex gap-2 text-xs">
            <span className="text-muted">Sort:</span>
            {[{ key: 'id', label: 'Latest' }, { key: 'severity', label: 'Severity' }].map(s => (
              <button key={s.key} onClick={() => toggleSort(s.key)}
                className={clsx("flex items-center gap-1 px-2 py-1 rounded border transition-all",
                  sortBy === s.key ? "border-primary/50 text-primary bg-primary/10" : "border-white/10 text-gray-500 hover:text-white"
                )}>
                {s.label} <SortIcon field={s.key} />
              </button>
            ))}
          </div>
        </div>

        {/* Alert List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#FF3B3B]/30 border-t-[#FF3B3B] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert, idx) => {
              const sev = severityConfig[alert.severity] || severityConfig.low;
              const st = statusConfig[alert.status] || statusConfig.open;

              return (
                <div key={`${alert.id}-${idx}`}
                  className={clsx(
                    "glass-panel rounded-xl border overflow-hidden transition-all hover:bg-white/[0.03] cursor-pointer group",
                    alert.severity === 'critical' ? "border-[#FF3B3B]/20 hover:border-[#FF3B3B]/50" : "border-white/10 hover:border-white/20"
                  )}
                  style={{ animation: `fade-in-right 0.3s ease-out ${Math.min(idx, 15) * 0.03}s backwards` }}
                  onClick={() => setSelectedAlert(alert)}>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                    {/* Severity Indicator */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", sev.glow)}
                        style={{ backgroundColor: sev.color + '15', border: `1px solid ${sev.color}30` }}>
                        <sev.icon className="w-5 h-5" style={{ color: sev.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono font-bold text-white text-sm group-hover:text-primary transition-colors">
                            #{alert.id}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{ color: sev.color, backgroundColor: sev.color + '15', border: `1px solid ${sev.color}30` }}>
                            {sev.label}
                          </span>
                          <span className={clsx("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", st.bg, st.border)}
                            style={{ color: st.color, borderWidth: '1px' }}>
                            {st.label}
                          </span>
                          {alert.description?.toLowerCase().includes("unregistered device") && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30 hidden sm:inline-block">
                              UNKNOWN DEVICE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">{alert.description}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] text-muted uppercase tracking-wider">User</p>
                        <p className="text-sm font-mono font-bold text-white">{alert.user_id}</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] text-muted uppercase tracking-wider">Time</p>
                        <p className="text-xs font-mono text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {alert.timestamp}
                        </p>
                      </div>
                      <button className="p-2.5 rounded-lg bg-white/5 hover:bg-primary/20 text-gray-400 hover:text-primary border border-transparent hover:border-primary/50 transition-all"
                        onClick={e => { e.stopPropagation(); setSelectedAlert(alert); }}>
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Investigator Notes Preview */}
                  {alert.investigator_notes && (
                    <div className="px-5 pb-4 -mt-1">
                      <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3 border border-primary/10">
                        <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-400 truncate">{alert.investigator_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Shield className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">No alerts match your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} onSubmitFeedback={handleFeedback} />
      )}

      <style>{`
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateY(10px); }
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

export default CriticalAlerts;
