import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import clsx from 'clsx';

const MyNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchNotifs();
  }, []);

  const fetchNotifs = async () => {
    try {
      const token = localStorage.getItem('sentinel_access_token');
      const res = await axios.get('http://127.0.0.1:8000/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (id) => {
    try {
      const token = localStorage.getItem('sentinel_access_token');
      await axios.patch(`http://127.0.0.1:8000/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filter === 'DEVICE_ALERT' 
    ? notifications.filter(n => n.type === 'DEVICE_ALERT') 
    : notifications;

  return (
    <div className="h-full flex flex-col font-sans relative">
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-white glow-text mb-2">My Center</h1>
          <p className="text-sm text-gray-400">Security warnings and device footprint flags.</p>
        </div>
        <div className="flex bg-[#0A0E1A]/80 p-1 rounded-lg border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setFilter('ALL')}
            className={clsx("px-4 py-2 rounded-md text-sm font-bold uppercase transition-all tracking-wider", filter === 'ALL' ? "bg-primary/20 text-primary border border-primary/50 shadow-glow-cyan" : "text-gray-400 hover:text-white")}
          >
            All
          </button>
          <button
            onClick={() => setFilter('DEVICE_ALERT')}
            className={clsx("px-4 py-2 rounded-md text-sm font-bold uppercase transition-all tracking-wider", filter === 'DEVICE_ALERT' ? "bg-[#FF3B3B]/20 text-[#FF3B3B] border border-[#FF3B3B]/50" : "text-gray-400 hover:text-white")}
          >
            Device Alerts
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar z-10 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-mono">No notifications to display.</div>
        ) : filtered.map(notif => (
          <div key={notif.id} className={clsx(
            "glass-panel p-5 rounded-xl border relative overflow-hidden transition-all group",
            notif.severity === 'CRITICAL' && !notif.is_read ? "border-[#FF3B3B]/50 bg-[#FF3B3B]/5 hover:bg-[#FF3B3B]/10" : "border-white/10 hover:border-white/20"
          )}>
            {/* Unread dot */}
            {!notif.is_read && (
              <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[#primary] shadow-[0_0_8px_currentColor]" style={{ backgroundColor: notif.severity === 'CRITICAL' ? '#FF3B3B' : '#00FFD1' }} />
            )}
            
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {notif.type === 'DEVICE_ALERT' ? (
                  <ShieldAlert className={clsx("w-6 h-6", notif.severity === 'CRITICAL' ? "text-[#FF3B3B]" : "text-[#F59E0B]")} />
                ) : (
                  <Bell className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{notif.type}</span>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {notif.sent_at}</span>
                </div>
                <p className="text-sm text-gray-100 leading-relaxed mb-3">
                  {notif.message}
                </p>
                
                {/* Parse out anything that looks like device data if we can, else just display block for DEVICE_ALERTS */}
                {notif.type === 'DEVICE_ALERT' && (
                  <pre className="mt-3 text-[10px] font-mono p-3 bg-black/60 border border-white/5 rounded text-[#F59E0B] overflow-x-auto word-break whitespace-pre-wrap">
{`<SYSTEM EVENT>
Risk Assessor: FLAG_ORIGIN_DEVICE
Account: ${notif.user_id}
Action Taken: MASKED_JWT_PAYLOAD
`}
                  </pre>
                )}

                <div className="mt-4 flex justify-end">
                  {!notif.is_read && (
                    <button 
                      onClick={() => markRead(notif.id)}
                      className="text-xs flex items-center gap-2 text-[#00FFD1] hover:text-white transition-colors uppercase font-bold tracking-wider"
                    >
                      <CheckCircle className="w-4 h-4" /> Mark Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyNotifications;
