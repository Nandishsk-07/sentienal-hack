import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Info, ToggleLeft, ToggleRight, Filter, Users, Network } from 'lucide-react';

const mockNodes = [
  // Ring 1 (Red, High Risk)
  { id: '1', name: 'User_0042', risk: 95, department: 'Finance' },
  { id: '2', name: 'User_0088', risk: 88, department: 'Finance' },
  { id: '3', name: 'User_0112', risk: 92, department: 'IT Admin' },
  { id: '4', name: 'User_0091', risk: 85, department: 'Finance' },
  // Ring 2 (Red, High Risk)
  { id: '12', name: 'User_0441', risk: 90, department: 'Engineering' },
  { id: '13', name: 'User_0411', risk: 87, department: 'Contractor' },
  { id: '14', name: 'User_0489', risk: 93, department: 'Engineering' },
  // Normal / Medium users
  { id: '5', name: 'User_0120', risk: 45, department: 'HR' },
  { id: '6', name: 'User_0222', risk: 20, department: 'Sales' },
  { id: '7', name: 'User_0210', risk: 15, department: 'Sales' },
  { id: '8', name: 'User_0301', risk: 55, department: 'Marketing' },
  { id: '9', name: 'User_0305', risk: 10, department: 'HR' },
  { id: '10', name: 'User_0311', risk: 35, department: 'Legal' },
  { id: '11', name: 'User_0344', risk: 50, department: 'Sales' },
  { id: '15', name: 'User_0500', risk: 25, department: 'Operations' }
];

const mockLinks = [
  // Ring 1 connections (Shared IP / Account)
  { source: '1', target: '2', reason: 'Shared IP (192.168.1.55) - 40m overlap' },
  { source: '2', target: '3', reason: 'Multi-user concurrent login (ACC_991)' },
  { source: '3', target: '4', reason: 'Shared IP (192.168.1.55) - 15m overlap' },
  { source: '4', target: '1', reason: 'Shared Terminal Session' },
  { source: '1', target: '3', reason: 'Abnormal file access patterns together' },
  // Ring 2 connections
  { source: '12', target: '13', reason: 'VPN IP Collision at 2:00 AM' },
  { source: '13', target: '14', reason: 'Token sharing detected' },
  { source: '14', target: '12', reason: 'Same API key usage' },
  // Random cross connections
  { source: '5', target: '1', reason: 'Manager Override event' },
  { source: '8', target: '2', reason: 'Email Attachment Chain' },
  { source: '6', target: '7', reason: 'Standard team behavior' },
  { source: '10', target: '11', reason: 'Document collaboration' },
  { source: '15', target: '12', reason: 'Approved firewall exception' }
];

const CollusionGraph = () => {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterRisk, setFilterRisk] = useState('all'); // 'all', 'high', 'medium'
  const [highlightRings, setHighlightRings] = useState(false);
  const [d3Loaded, setD3Loaded] = useState(false);

  // Load D3 from CDN
  useEffect(() => {
    if (window.d3) {
      setD3Loaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://d3js.org/d3.v7.min.js';
    script.async = true;
    script.onload = () => setD3Loaded(true);
    document.body.appendChild(script);
    
    return () => {
      // Optional cleanup
    };
  }, []);

  // D3 Visualization logic
  useEffect(() => {
    if (!d3Loaded || !svgRef.current) return;
    const d3 = window.d3;
    
    const width = svgRef.current.clientWidth;
    const height = 600;

    // Filter logic
    let displayNodes = [...mockNodes];
    if (filterRisk === 'high') displayNodes = displayNodes.filter(n => n.risk >= 60);
    if (filterRisk === 'medium') displayNodes = displayNodes.filter(n => n.risk >= 30 && n.risk < 60);
    
    const activeNodeIds = new Set(displayNodes.map(n => n.id));
    const displayLinks = mockLinks.filter(l => activeNodeIds.has(l.source) && activeNodeIds.has(l.target))
      .map(d => Object.create(d)); // Clone link objects for D3 parsing

    const nodes = displayNodes.map(d => Object.create(d));

    // Clear previous SVG
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Define colors
    const getColor = (risk) => {
      if (risk >= 60) return '#FF3B3B'; // Red
      if (risk >= 30) return '#00FFD1'; // Cyan
      return '#6B7280'; // Gray
    };

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(displayLinks).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX())
      .force('y', d3.forceY());

    // Edges
    const link = svg.append('g')
      .selectAll('line')
      .data(displayLinks)
      .join('line')
      .attr('stroke', '#374151') // Default line
      .attr('stroke-width', d => highlightRings && (d.source.risk >= 60 && d.target.risk >= 60) ? 3 : 1)
      .attr('stroke', d => highlightRings && (d.source.risk >= 60 && d.target.risk >= 60) ? '#FF3B3B' : '#374151');

    // Nodes container
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => 5 + (d.risk / 5)) // Size based on risk
      .attr('fill', d => getColor(d.risk))
      .attr('stroke', '#0A0E1A')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .call(drag(simulation));

    // Node labels
    const labels = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d.name)
      .attr('font-size', '10px')
      .attr('fill', '#9CA3AF')
      .attr('dx', 15)
      .attr('dy', 4);

    node.on('click', (event, d) => {
      // Find connected links for sidebar details
      const connected = mockLinks.filter(l => l.source === d.id || l.target === d.id || l.source.id === d.id || l.target.id === d.id);
      setSelectedNode({ ...d, connectedLinks: connected });
    });

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => Math.max(10, Math.min(width - 10, d.x)))
        .attr('cy', d => Math.max(10, Math.min(height - 10, d.y)));
        
      labels
        .attr('x', d => Math.max(10, Math.min(width - 10, d.x)))
        .attr('y', d => Math.max(10, Math.min(height - 10, d.y)));
    });

    // Drag behavior
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    return () => simulation.stop();
  }, [d3Loaded, filterRisk, highlightRings]);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Main Graph Area */}
      <div className="flex-1 flex flex-col pt-2 glass-panel rounded-xl overflow-hidden relative border border-white/10">
        
        {/* Top Controls */}
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-white/5 bg-surface/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              Collusion Network
            </h2>
            <div className="bg-danger/20 border border-danger/50 text-danger text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-glow-red">
              <AlertTriangle className="w-3 h-3" />
              2 Detected Rings
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted" />
              <select 
                className="bg-background border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-primary"
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
              >
                <option value="all">All Risk Levels</option>
                <option value="high">High Risk Only</option>
                <option value="medium">Medium + Risk</option>
              </select>
            </div>
            
            <button 
              className={`flex items-center gap-2 text-sm transition-colors ${highlightRings ? 'text-danger' : 'text-muted'}`}
              onClick={() => setHighlightRings(!highlightRings)}
            >
              {highlightRings ? <ToggleRight className="w-5 h-5 text-danger" /> : <ToggleLeft className="w-5 h-5" />}
              Highlight Collusion Rings
            </button>
          </div>
        </div>

        {/* D3 Canvas Container */}
        <div className="flex-1 relative bg-background/50" ref={svgRef}>
          {!d3Loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-muted animate-pulse">
              Loading D3 Network Simulation...
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-3 rounded glass-panel border border-white/5 flex gap-4 text-xs text-muted">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-danger"></div> High Risk (&gt;60)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div> Medium Risk (30-60)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-500"></div> Low Risk (&lt;30)</div>
        </div>
      </div>

      {/* Sidebar Panel */}
      {selectedNode ? (
        <div className="w-80 glass-panel border border-white/10 flex flex-col p-5 overflow-y-auto animate-in slide-in-from-right rounded-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{selectedNode.name}</h3>
              <p className="text-sm text-primary">{selectedNode.department}</p>
            </div>
            <div className={`text-xl font-black ${selectedNode.risk >= 60 ? 'text-danger' : selectedNode.risk >= 30 ? 'text-primary' : 'text-white'}`}>
              {selectedNode.risk}
            </div>
          </div>
          
          <div className="text-xs text-muted max-w-full mb-6 pb-4 border-b border-white/10 uppercase tracking-widest font-semibold flex gap-2">
            <Info className="w-4 h-4"/> Node Details
          </div>

          <h4 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Connections
          </h4>
          
          <div className="flex flex-col gap-3">
            {selectedNode.connectedLinks.length > 0 ? selectedNode.connectedLinks.map((link, i) => {
              // Handle original mock objects OR D3 parsed objects (where source/target become objects)
              const sourceStr = typeof link.source === 'string' ? link.source : link.source.id;
              const targetStr = typeof link.target === 'string' ? link.target : link.target.id;
              
              const isSource = sourceStr === selectedNode.id;
              const connectedToId = isSource ? targetStr : sourceStr;
              const connectedToNode = mockNodes.find(n => n.id === connectedToId);
              
              return (
                <div key={i} className="p-3 bg-surface/50 border border-white/5 rounded text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{connectedToNode?.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${connectedToNode?.risk >= 60 ? 'bg-danger/20 text-danger' : 'bg-white/10 text-muted'}`}>
                      {connectedToNode?.risk} risk
                    </span>
                  </div>
                  <p className="text-xs text-muted">{link.reason}</p>
                </div>
              );
            }) : (
              <p className="text-sm text-muted">No suspicious links found.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="w-80 glass-panel border border-white/10 flex flex-col p-5 items-center justify-center text-center rounded-xl">
          <Network className="w-12 h-12 text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-white mb-2">Inspect Node</h3>
          <p className="text-sm text-muted">Click any user node in the graph to view relationship vectors and overlapping identifiers.</p>
        </div>
      )}
    </div>
  );
};

export default CollusionGraph;
