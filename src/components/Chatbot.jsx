import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, ChevronDown, Activity, AlertTriangle } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

const Chatbot = ({ activeUser = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello Investigator. I am SENTINEL AI. How can I assist you in analyzing current network anomalies?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Initial placeholder for the streaming response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const context = activeUser ? {
        user_id: activeUser.id || 'User_0042',
        risk_score: activeUser.risk || 95,
        flags: ['Shared IP', 'High Data Volume Off-Hours', 'Unusual Privileges']
      } : { risk_score: 95, flags: ["Data Exfil Indicator"]};

      const payload = {
        messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        context: context
      };

      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let assistantResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr.trim() === '') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                assistantResponse += data.delta.text;
                // Update the last message in state
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantResponse;
                  return newMessages;
                });
              } else if (data.type === 'error') {
                assistantResponse += `\n\n[System Error: ${data.error.message}]`;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantResponse;
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat API failed:", err);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = "Connection to SENTINEL brain failed. Secure tunnel offline.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-glow-cyan z-50 transition-all transform hover:scale-110 ${isOpen ? 'bg-background border border-white/20 text-muted shadow-none translate-y-10 opacity-0 pointer-events-none' : 'bg-primary text-background'}`}
      >
        <Bot className="w-8 h-8" />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-[400px] h-[600px] max-h-[80vh] flex flex-col glass-panel border border-primary/30 rounded-2xl shadow-glow-cyan/20 z-50 transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-surface/80 rounded-t-2xl flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10"><Bot className="w-24 h-24" /></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 text-primary">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wide flex items-center gap-2">
                SENTINEL AI <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>
              </h3>
              <p className="text-xs text-primary glow-cyan-text">Claude Investigator Model</p>
            </div>
          </div>
          <button onClick={toggleChat} className="text-muted hover:text-white relative z-10">
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>

        {/* Active Context Bar */}
        <div className="bg-background/80 border-b border-white/5 py-2 px-4 flex items-center justify-between text-xs font-semibold text-muted">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Active Context: {activeUser?.id || 'User_0042'}
          </div>
          <div className="flex items-center gap-1 text-danger">
            <AlertTriangle className="w-3 h-3" /> Risk: {activeUser?.risk || 95}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${msg.role === 'user' ? 'bg-surface border-white/20 text-white' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-3 rounded-lg max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === 'user' ? 'bg-white/10 text-white border border-white/5' : 'glass-panel border border-primary/20 text-white/90 shadow-glow-cyan/5'}`}>
                {msg.content === '' && msg.role === 'assistant' ? (
                  <span className="flex gap-1"><span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span><span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span><span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span></span>
                ) : msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-surface/50 border-t border-white/10 rounded-b-2xl">
          <div className="flex items-end gap-2 bg-background border border-white/10 rounded-xl p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary shadow-inner">
            <textarea
              className="flex-1 bg-transparent border-none text-white text-sm focus:ring-0 resize-none max-h-32 min-h-[44px] p-2 leading-relaxed"
              placeholder="Ask about anomalies, IP traces, or mitigation steps..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center mt-2 text-[10px] text-muted">
            AI can make mistakes. Verify critical actions manually.
          </div>
        </div>

      </div>
    </>
  );
};

export default Chatbot;
