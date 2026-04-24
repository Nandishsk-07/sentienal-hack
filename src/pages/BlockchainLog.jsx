import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, AlertTriangle, Key, Clock, Fingerprint, Database, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = "http://127.0.0.1:8000";

const BlockchainLog = () => {
  const [chain, setChain] = useState([]);
  const [stats, setStats] = useState({ total_blocks: 0, valid: null });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);

  useEffect(() => {
    fetchChain();
  }, []);

  const fetchChain = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/blockchain/log`);
      setChain(res.data.chain.reverse()); // Show newest first
      setStats(prev => ({ ...prev, total_blocks: res.data.total_blocks }));
    } catch (err) {
      console.error("Failed to fetch blockchain log:", err);
      // Ensure we clear loading status on error to avoid infinite spinner
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await axios.get(`${API_BASE}/blockchain/verify`);
      setStats(prev => ({ ...prev, valid: res.data.valid }));
    } catch (err) {
      console.error("Failed to verify chain:", err);
      setStats(prev => ({ ...prev, valid: false }));
      // Ensure verifying state is cleared
      setVerifying(false);
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const truncateHash = (hash) => {
    if (!hash || hash.length < 16) return hash;
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-20 relative">
      
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-xl border border-white/10 md:col-span-2 relative overflow-hidden bg-surface/50">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Database className="w-48 h-48" />
          </div>
          <h1 className="text-2xl font-bold glow-cyan-text flex items-center gap-2 relative z-10">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Immutable Audit Ledger
          </h1>
          <p className="text-sm text-muted mt-2 max-w-2xl relative z-10">
            Cryptographically enforcing accountability. All anomaly detections, risk scoring algorithms, and investigator actions are hashed using SHA-256 and appended to the local chain, guaranteeing tamper-evident operations.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-white/10 flex flex-col justify-center items-center text-center bg-surface/50">
          <p className="text-sm text-muted uppercase tracking-widest font-semibold mb-1">Total Blocks</p>
          <div className="text-4xl font-black text-white">{stats.total_blocks}</div>
          <div className="mt-2 text-xs text-primary flex items-center gap-1">
            <Server className="w-3 h-3" /> Syncing blocks Live
          </div>
        </div>
      </div>

      {/* Verification Action Bar */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex justify-between items-center bg-background/50">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleVerify}
            disabled={verifying}
            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 font-bold py-2 px-6 rounded shadow-glow-cyan transition-all flex items-center gap-2"
          >
            {verifying ? (
              <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
            ) : <Key className="w-5 h-5" />}
            Verify Chain Integrity
          </button>
          
          {stats.valid !== null && (
            <div className={`px-4 py-2 flex items-center gap-2 rounded border font-bold ${stats.valid ? 'bg-primary/10 border-primary/50 text-primary glow-cyan-text' : 'bg-danger/10 border-danger/50 text-danger shadow-glow-red'}`}>
              {stats.valid ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {stats.valid ? 'CRYPTOGRAPHIC VALIDATION SUCCESSFUL' : 'ALERT: TAMPERING DETECTED!'}
            </div>
          )}
        </div>
        
        <button onClick={fetchChain} className="text-sm text-muted hover:text-white flex items-center gap-1 transition-colors">
          <Clock className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Blockchain Table */}
      <div className="glass-panel flex-1 rounded-xl border border-white/10 overflow-hidden flex flex-col bg-surface/30">
        <div className="overflow-x-auto flex-1 h-full">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-white/5 text-xs uppercase text-white/70 tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Block</th>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold text-primary">SHA-256 Hash</th>
                <th className="px-6 py-4 font-semibold">Previous Hash</th>
                <th className="px-6 py-4 font-semibold">Data Payload</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-muted">
                    <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    <p className="mt-2">Reconstructing Ledger...</p>
                  </td>
                </tr>
              ) : chain.map((block) => (
                <tr 
                  key={block.block_index} 
                  onClick={() => setSelectedBlock(block)}
                  className="hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4 font-bold text-white">#{block.block_index}</td>
                  <td className="px-6 py-4">{formatDate(block.timestamp)}</td>
                  <td className="px-6 py-4 font-mono text-primary group-hover:text-white transition-colors">{truncateHash(block.alert_hash)}</td>
                  <td className="px-6 py-4 font-mono opacity-50">{truncateHash(block.prev_hash)}</td>
                  <td className="px-6 py-4 truncate max-w-[200px]">{block.data}</td>
                  <td className="px-6 py-4 text-right flex justify-end">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-glow-cyan" title="Verified"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hash Inspector Modal */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedBlock(null)}>
          <div className="glass-panel w-full max-w-4xl rounded-xl border border-primary/30 shadow-glow-cyan/20 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-surface/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Fingerprint className="w-6 h-6 text-primary" />
                Hash Inspector: Block #{selectedBlock.block_index}
              </h2>
              <button onClick={() => setSelectedBlock(null)} className="text-muted hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm uppercase text-muted font-bold tracking-widest mb-2">Cryptographic Seal</h3>
                  <div className="bg-background rounded-lg border border-white/5 p-4 font-mono text-primary break-all shadow-inner text-sm">
                    {selectedBlock.alert_hash}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm uppercase text-muted font-bold tracking-widest mb-2">Ancestry Pointer (Prev Hash)</h3>
                  <div className="bg-background rounded-lg border border-white/5 p-4 font-mono text-white/50 break-all shadow-inner text-sm">
                    {selectedBlock.prev_hash}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm uppercase text-muted font-bold tracking-widest mb-2">Metadata Decoded</h3>
                <div className="bg-surface/50 rounded-lg border border-white/5 p-5">
                  {selectedBlock.metadata ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-muted mb-1">Target Account</div>
                        <div className="font-bold text-white">{selectedBlock.metadata.user_id}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted mb-1">Alert Reference</div>
                        <div className="font-bold text-white">{selectedBlock.metadata.alert_id}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted mb-1">Assigned Investigator</div>
                        <div className="font-bold text-white">{selectedBlock.metadata.investigator_id}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted mb-1">Severity Score</div>
                        <div className={`font-bold ${selectedBlock.metadata.risk_score > 80 ? 'text-danger' : 'text-primary'}`}>
                          {selectedBlock.metadata.risk_score}/100
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted text-sm italic">Genesis node payload. Internal system context.</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm uppercase text-muted font-bold tracking-widest mb-2">Raw Data Payload</h3>
                <div className="bg-background rounded-lg border border-white/5 p-4 text-white text-sm">
                  {selectedBlock.data}
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-white/10 bg-surface/50 text-center text-xs text-muted font-mono">
              Timestamp: {selectedBlock.timestamp} • SHA-256 • Proof of Authority • Immutable Node ID: SENTINEL-ALPHA
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default BlockchainLog;
