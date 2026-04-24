import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { toast, Toaster } from 'react-hot-toast';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
      // Just showing a toast for the first unread we see to emulate realtime ping
      // Usually would be handled via websocket, but polling works for mock
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
    </div>
  );
};

export default NotificationBell;
