import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, User, KeyRound, ChevronRight, Fingerprint } from 'lucide-react';
import clsx from 'clsx';
import { collectDeviceFingerprint } from '../utils/deviceFingerprint';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('FRAUD_INVESTIGATOR');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fingerprint, setFingerprint] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    try {
      setFingerprint(collectDeviceFingerprint());
    } catch (e) {
      setFingerprint({
        deviceId: "FP-COLLECTION-FAILED",
        collectionFailed: true,
        failureReason: e.message
      });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simple validation
    if (!username || !password) {
      setError('Credentials required for access.');
      setIsLoading(false);
      return;
    }

    try {
      // Simulate network delay for effect
      await new Promise(resolve => setTimeout(resolve, 800));
      await login(username, password, role, fingerprint);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Access Denied. Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-x-hidden overflow-y-auto font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-danger/5 rounded-full blur-[120px]" />
        {/* Simple Grid Array Overlay for Cyberpunk feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="my-auto pt-20 pb-12 w-full flex justify-center z-10 px-4">
        <div className="w-full max-w-md p-8 glass-panel rounded-2xl border border-primary/20 shadow-glow-cyan relative">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-4 bg-background rounded-full border border-primary/20 shadow-glow-cyan">
          <ShieldAlert className="w-10 h-10 text-primary" />
        </div>

        <div className="text-center mt-6 mb-10">
          <h1 className="text-4xl font-extrabold tracking-[0.2em] glow-cyan-text mb-2">SENTINEL</h1>
          <p className="text-xs text-muted uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-danger rounded-full animate-pulse"></span>
            Internal Fraud Detection
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded bg-danger/10 border border-danger/50 text-danger text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 uppercase tracking-wider ml-1">Operator ID</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="Enter Operator ID..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 uppercase tracking-wider ml-1">Access Key</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="Enter Passkey..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 uppercase tracking-wider ml-1">Authorization Level</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg py-3 px-4 text-white appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
            >
              <option value="FRAUD_INVESTIGATOR">Level 1 - Fraud Investigator</option>
              <option value="BRANCH_MANAGER">Level 2 - Branch Manager</option>
              <option value="HEAD">Level 3 - Head of Security</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 bg-primary/10 hover:bg-primary/20 border border-primary text-primary text-lg font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,209,0.2)] hover:shadow-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative"
          >
            {isLoading ? (
              <Fingerprint className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <>
                <span className="relative z-10">INITIALIZE LINK</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                <div className="absolute inset-0 bg-primary/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-0"></div>
              </>
            )}
          </button>
        </form>

        {fingerprint?.collectionFailed && (
          <div className="mt-6 p-4 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/50 text-[#F59E0B] text-xs flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Security check incomplete — your login will be reviewed for safety.</span>
          </div>
        )}

        <div className="mt-8 text-center border-t border-white/10 pt-4">
          <p className="text-xs text-muted flex items-center justify-center gap-1">
            <Fingerprint className="w-3 h-3" />
            Secure Node Connection
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
