import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, AlertTriangle, Network, Route, Link as LinkIcon, LogOut, Code, Menu, X } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'User Monitoring', path: '/users', icon: Users },
  { name: 'Alerts', path: '/alerts', icon: AlertTriangle },
  { name: 'Knowledge Graph', path: '/graph', icon: Network },
  { name: 'Trajectory', path: '/trajectory', icon: Route },
  { name: 'Blockchain Explorer', path: '/blockchain', icon: LinkIcon },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={clsx(
          "bg-surface border-r border-white/5 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <Code className="text-primary w-6 h-6 animate-pulse" />
              <span className="font-bold text-xl tracking-wider glow-cyan-text">SENTINEL</span>
            </div>
          ) : (
            <Code className="text-primary w-6 h-6 mx-auto" />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted hover:text-white transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 mx-auto" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-glow-cyan"
                    : "text-muted hover:text-white hover:bg-white/5"
                )
              }
            >
              <item.icon className={clsx("w-5 h-5 flex-shrink-0")} />
              {sidebarOpen && <span className="font-medium whitespace-nowrap">{item.name}</span>}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className={clsx(
              "flex items-center gap-3 w-full p-3 rounded-lg text-danger hover:bg-danger/10 transition-colors",
              !sidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-0 overflow-y-auto">
        {/* Topbar */}
        <header className="h-16 glass-panel border-b-0 border-x-0 border-t-0 flex items-center justify-between px-8 sticky top-0 z-10 w-full">
          <div className="flex items-center text-sm">
            <span className="text-muted mr-2">System Status:</span>
            <span className="text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              Online
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right flex flex-col hidden sm:flex">
              <span className="text-sm font-semibold">{user?.username || 'Admin'}</span>
              <span className="text-xs text-primary glow-cyan-text">{user?.role || 'SYSTEM'}</span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-primary/50 flex items-center justify-center bg-gray-800 text-primary font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Dashboard Pages will be rendered here */}
        <div className="flex-1 p-6 z-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
