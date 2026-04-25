import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, AlertTriangle, X } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast, Toaster } from 'react-hot-toast';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [criticalModal, setCriticalModal] = useState(null);
  const navigate = useNavigate();

  const fetchNotifs = async () => {
    try {
      const token = localStorage.getItem('sentinel_access_token');
      if (!token) return;
      const res = await axios.get('http://127.0.0.1:8000/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Show a toast for the newest DEVICE_ALERT if it appeared
  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read && n.type === 'DEVICE_ALERT');
    if (unread.length > 0) {
      const latest = unread[0];
      if (!localStorage.getItem(`toast_${latest.id}`)) {
        toast('🚨 Security Alert: Unusual device activity detected on your account', {
          duration: 4000,
          style: { background: '#0A0E1A', color: '#F59E0B', border: '1px solid #F59E0B50' }
        });
        localStorage.setItem(`toast_${latest.id}`, 'true');
      }
    }
  }, [notifications]);

  // Full screen modal for ACCOUNT_SUSPENDED or URGENT_SUSPENSION
  useEffect(() => {
    const criticals = notifications.filter(
      n => !n.is_read && (n.type === 'ACCOUNT_SUSPENDED' || n.type === 'URGENT_SUSPENSION')
    );
    if (criticals.length > 0 && !criticalModal) {
      const latest = criticals[0];
      if (!localStorage.getItem(`critical_modal_${latest.id}`)) {
        setCriticalModal(latest);
      }
    }
  }, [notifications, criticalModal]);

  const dismissCritical = () => {
    if (criticalModal) {
      localStorage.setItem(`critical_modal_${criticalModal.id}`, 'true');
      setCriticalModal(null);
      navigate('/alerts');
    }
  };

  const hasCritical = notifications.some(n => !n.is_read && n.severity === 'CRITICAL');

  return (
    <div className="relative">
      <Toaster position="bottom-right" />
      <button 
        onClick={() => navigate('/notifications')}
        className={clsx(
          "relative p-2 rounded-full transition-all flex items-center justify-center",
          hasCritical ? "text-[#FF3B3B] hover:bg-[#FF3B3B]/10 animate-pulse" : "text-gray-300 hover:text-white hover:bg-white/10"
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-[#FF3B3B] border border-[#0A0E1A] text-[10px] font-bold text-white flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(255,59,59,0.8)]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* === CRITICAL FULL SCREEN MODAL === */}
      {criticalModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div 
            className="bg-[#0D1117] border-2 border-[#FF3B3B] rounded-2xl w-full max-w-lg shadow-[0_0_60px_rgba(255,59,59,0.4)] overflow-hidden"
            style={{ animation: 'critical-pulse 2s ease-in-out infinite, scale-in 0.3s ease-out' }}
          >
            {/* Pulsing Red Top Bar */}
            <div className="h-1.5 bg-[#FF3B3B] animate-pulse" />

            <div className="p-8 text-center">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-[#FF3B3B]/20 border-2 border-[#FF3B3B] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,59,59,0.5)] animate-pulse">
                <AlertTriangle className="w-10 h-10 text-[#FF3B3B]" />
              </div>

              <h2 className="text-2xl font-extrabold text-[#FF3B3B] uppercase tracking-widest mb-4 drop-shadow-[0_0_10px_rgba(255,59,59,0.8)]">
                🚨 CRITICAL
              </h2>

              <p className="text-lg font-bold text-white mb-2">
                {criticalModal.type === 'ACCOUNT_SUSPENDED' 
                  ? 'Account Auto-Suspended' 
                  : 'Urgent Suspension Alert'}
              </p>

              <div className="bg-black/50 rounded-xl border border-[#FF3B3B]/20 p-4 mb-6 text-left">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {criticalModal.message}
                </p>
              </div>

              <p className="text-xs text-gray-500 mb-6">
                This notification cannot be dismissed without acknowledgment.
              </p>

              <button
                onClick={dismissCritical}
                className="w-full py-4 bg-[#FF3B3B]/20 hover:bg-[#FF3B3B]/30 border-2 border-[#FF3B3B] text-[#FF3B3B] font-bold text-sm uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(255,59,59,0.3)] hover:shadow-[0_0_30px_rgba(255,59,59,0.5)]"
              >
                I Understand — Review Now
              </button>
            </div>
          </div>

          <style>{`
            @keyframes critical-pulse {
              0%, 100% { box-shadow: 0 0 30px rgba(255,59,59,0.3); }
              50% { box-shadow: 0 0 60px rgba(255,59,59,0.6); }
            }
            @keyframes scale-in {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
