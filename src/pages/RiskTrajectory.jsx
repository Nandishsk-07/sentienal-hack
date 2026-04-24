import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, Line } from 'recharts';
import { Route, TrendingUp, TrendingDown, Activity, CalendarDays } from 'lucide-react';

const mockTrajectories = {
  "User_0042": {
    data: Array.from({ length: 14 + 14 }, (_, i) => { // 14 past, 14 future
      const past = i < 14;
      const base = 40 + (i * 2.5); // Steeply accelerating
      const noise = Math.random() * 8;
      const score = Math.min(100, Math.max(0, past ? base + noise : base + noise + 5)); // Higher mean for future
      return {
        day: past ? `T-${14 - i}` : `T+${i - 13}`,
        score: past ? Math.round(score) : null,
        forecast: (!past || i === 13) ? Math.round(score) : null // forecast starts exactly where past ends
      };
    }),
    status: 'Accelerating',
    icon: TrendingUp,
    color: '#FF3B3B', // Danger
    desc: 'Rapid escalation in anomaly scores over the past week, driven by large data transfers. Projected to hit critical levels.',
    stats: { sevenDay: '+45%', thirtyDay: '+112%', peak: 'Current Week' }
  },
  "User_0210": {
    data: Array.from({ length: 28 }, (_, i) => {
      const past = i < 14;
      const base = 25; // Stable
      const noise = Math.random() * 5;
      const score = past ? base + noise : base + noise;
      return {
        day: past ? `T-${14 - i}` : `T+${i - 13}`,
        score: past ? Math.round(score) : null,
        forecast: (!past || i === 13) ? Math.round(score) : null
      };
    }),
    status: 'Stable',
    icon: Activity,
    color: '#00FFD1', // Primary
    desc: 'Normal behavioral baseline maintained. No significant deviations in typical working hours or data volume.',
    stats: { sevenDay: '-1%', thirtyDay: '+2%', peak: 'N/A' }
  },
  "User_0112": {
    data: Array.from({ length: 28 }, (_, i) => {
      const past = i < 14;
      const base = 85 - (i * 1.5); // Declining
      const noise = Math.random() * 10;
      const score = past ? base + noise : base + noise;
      return {
        day: past ? `T-${14 - i}` : `T+${i - 13}`,
        score: past ? Math.round(score) : null,
        forecast: (!past || i === 13) ? Math.round(score) : null
      };
    }),
    status: 'Declining',
    icon: TrendingDown,
    color: '#F59E0B', // Warning (Yellow-ish)
    desc: 'Previous spikes in risk score are resolving as the user returned to standard geo-locations and IP patterns.',
    stats: { sevenDay: '-15%', thirtyDay: '-25%', peak: '2 Weeks Ago' }
  }
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 border border-white/10 p-3 rounded-lg shadow-glow-cyan text-sm">
        <p className="font-bold text-white mb-2 pb-1 border-b border-white/10">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-semibold flex items-center gap-2">
            {entry.name === 'score' ? 'Historical Score' : 'Forecast'}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const RiskTrajectory = () => {
  const [selectedUserId, setSelectedUserId] = useState("User_0042");
  
  const currentData = mockTrajectories[selectedUserId];
  const StatusIcon = currentData.icon;

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Top Header & Selection */}
      <div className="glass-panel p-5 rounded-xl border border-white/10 flex flex-wrap justify-between items-center bg-surface/50">
        <div>
          <h1 className="text-2xl font-bold glow-cyan-text flex items-center gap-2">
            <Route className="w-6 h-6 text-primary" />
            Risk Trajectory Analysis
          </h1>
          <p className="text-sm text-muted mt-1">14-Day ML forecast based on historical behavioral volatility.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-muted">Analyze User:</label>
          <select 
            className="bg-background border border-white/20 text-white rounded-lg px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-glow-cyan/20"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="User_0042">User_0042 (High Alert)</option>
            <option value="User_0112">User_0112 (Recent Spike)</option>
            <option value="User_0210">User_0210 (Baseline)</option>
          </select>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 flex-1 flex flex-col">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-lg font-bold text-white">Score Timeline (T-14 to T+14)</h2>
          <div className="flex gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2"><div className="w-3 h-1 bg-white"></div> Historical Data</div>
            <div className="flex items-center gap-2"><div className="w-3 h-1 border-b-2 border-dashed border-white"></div> ML Forecast Line</div>
          </div>
        </div>

        <div className="flex-1 w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentData.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentData.color} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={currentData.color} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8A2BE2" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#8A2BE2" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
              <XAxis dataKey="day" stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 12}} />
              <YAxis stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 12}} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Risk Zones Behind Chart */}
              <ReferenceArea y1={60} y2={100} fill="#FF3B3B" fillOpacity={0.05} />
              <ReferenceArea y1={30} y2={60} fill="#F59E0B" fillOpacity={0.05} />
              <ReferenceArea y1={0} y2={30} fill="#00FFD1" fillOpacity={0.02} />

              <Area 
                type="monotone" 
                dataKey="score" 
                stroke={currentData.color} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#scoreGradient)" 
                activeDot={{ r: 6, fill: currentData.color, stroke: '#000', strokeWidth: 2 }}
              />
              <Area 
                type="monotone" 
                dataKey="forecast" 
                stroke="#8A2BE2" 
                strokeDasharray="5 5"
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#forecastGradient)" 
                activeDot={{ r: 6, fill: '#8A2BE2', stroke: '#000', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Card */}
        <div className="glass-panel p-6 rounded-xl border border-white/10 lg:col-span-2 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 transition-all duration-700 group-hover:opacity-40" style={{ backgroundColor: currentData.color }}></div>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-background border border-white/10" style={{ color: currentData.color, boxShadow: `0 0 15px ${currentData.color}30` }}>
              <StatusIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Trajectory: <span style={{ color: currentData.color }}>{currentData.status}</span></h3>
              <p className="text-muted leading-relaxed">{currentData.desc}</p>
            </div>
          </div>
        </div>

        {/* Change Metrics */}
        <div className="glass-panel p-6 rounded-xl border border-white/10 flex flex-col justify-between">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Trend Indicators
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">7-Day Momentum</span>
              <span className={`font-bold ${currentData.stats.sevenDay.startsWith('+') ? 'text-danger' : 'text-primary'}`}>{currentData.stats.sevenDay}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">30-Day Momentum</span>
              <span className={`font-bold ${currentData.stats.thirtyDay.startsWith('+') ? 'text-danger' : 'text-primary'}`}>{currentData.stats.thirtyDay}</span>
            </div>
            <div className="h-px w-full bg-white/10 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Predicted Peak Risk</span>
              <span className="text-sm font-bold text-white">{currentData.stats.peak}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default RiskTrajectory;
