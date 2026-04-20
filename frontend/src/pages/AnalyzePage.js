import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API } from '../context/AuthContext';
import jsPDF from 'jspdf';

const PLACEHOLDERS = [
  'Paste a message to analyze for cyberbullying...',
  'Type or paste any text here...',
  'Enter a social media comment...',
  'Check a chat message for abuse...',
];

const CATEGORY_CONFIG = {
  HIGH: { color: '#ef4444', glow: 'rgba(239,68,68,0.3)', icon: '🔴', label: 'HIGH RISK', badge: 'badge-high' },
  MEDIUM: { color: '#f59e0b', glow: 'rgba(245,158,11,0.3)', icon: '🟡', label: 'MEDIUM RISK', badge: 'badge-medium' },
  LOW: { color: '#06b6d4', glow: 'rgba(6,182,212,0.3)', icon: '🔵', label: 'LOW RISK', badge: 'badge-low' },
  SAFE: { color: '#10b981', glow: 'rgba(16,185,129,0.3)', icon: '🟢', label: 'SAFE', badge: 'badge-safe' },
};

function AnimatedRiskBar({ score, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 100);
    return () => clearTimeout(t);
  }, [score]);
  return (
    <div className="relative h-3 rounded-full bg-cyber-bg overflow-hidden border border-cyber-border/30">
      <motion.div
        className="absolute top-0 left-0 h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
        initial={{ width: '0%' }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <div
        className="absolute top-0 left-0 h-full rounded-full opacity-40"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, transparent, ${color})`,
          filter: 'blur(4px)',
          transition: 'width 1.2s ease-out',
        }}
      />
    </div>
  );
}

function WordTag({ word }) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono bg-red-500/10 border border-red-500/30 text-red-400"
    >
      ⚠ {word}
    </motion.span>
  );
}

export default function AnalyzePage() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('hybrid');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [placeholder, setPlaceholder] = useState(0);
  const textRef = useRef(null);

  // Rotate placeholder
  useEffect(() => {
    const t = setInterval(() => setPlaceholder(p => (p + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const handleText = (e) => {
    setText(e.target.value);
    setCharCount(e.target.value.length);
  };

  const analyze = async () => {
    if (!text.trim()) return toast.error('Please enter some text to analyze');
    if (text.trim().length < 3) return toast.error('Text is too short to analyze');
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/analyze`, { text: text.trim(), mode });
      setResult(res.data.analysis);
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Analysis failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { setText(''); setResult(null); setCharCount(0); };

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const r = result;
    const cat = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.SAFE;

    doc.setFontSize(20);
    doc.setTextColor(100, 0, 200);
    doc.text('ShadowGuard Shield - Analysis Report', 20, 20);

    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    doc.text(`Mode: ${r.mode || mode}`, 20, 37);

    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Analyzed Text:', 20, 50);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(r.text, 170);
    doc.text(lines, 20, 58);

    const yStart = 58 + lines.length * 6 + 10;
    doc.setFontSize(13);
    doc.text('Results:', 20, yStart);
    doc.setFontSize(10);
    doc.text(`Risk Score: ${r.risk_percentage || Math.round((r.risk_score || 0) * 100)}%`, 20, yStart + 8);
    doc.text(`Category: ${cat.label}`, 20, yStart + 16);
    doc.text(`Confidence: ${r.confidence}`, 20, yStart + 24);
    doc.text(`Source: ${r.source}`, 20, yStart + 32);

    if (r.detected_words?.length) {
      doc.text(`Detected Words: ${r.detected_words.join(', ')}`, 20, yStart + 40);
    }

    doc.setFontSize(13);
    doc.text('AI Explanation:', 20, yStart + 55);
    doc.setFontSize(10);
    const expLines = doc.splitTextToSize(r.explanation || '', 170);
    doc.text(expLines, 20, yStart + 63);

    const sugY = yStart + 63 + expLines.length * 6 + 10;
    doc.setFontSize(13);
    doc.text('Suggestion:', 20, sugY);
    doc.setFontSize(10);
    const sugLines = doc.splitTextToSize(r.suggestion || '', 170);
    doc.text(sugLines, 20, sugY + 8);

    doc.save(`shadowguard-report-${Date.now()}.pdf`);
    toast.success('PDF exported!');
  };

  const cfg = result ? (CATEGORY_CONFIG[result.category] || CATEGORY_CONFIG.SAFE) : null;
  const riskPct = result ? (result.risk_percentage ?? Math.round((result.risk_score || 0) * 100)) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-white">Analyze Text</h1>
        <p className="text-cyber-muted text-sm mt-1">AI-powered cyberbullying detection with Hinglish support</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5 gradient-border">
          {/* Mode selector */}
          <div className="mb-4">
            <label className="text-xs font-mono text-cyber-muted uppercase tracking-widest mb-2 block">Detection Mode</label>
            <div className="flex rounded-xl bg-cyber-bg/60 p-1 gap-1">
              {[
                { value: 'hybrid', label: '⚡ Hybrid' },
                { value: 'ai_only', label: '🤖 AI Only' },
                { value: 'custom_only', label: '📋 Custom' },
              ].map(m => (
                <button key={m.value} onClick={() => setMode(m.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === m.value
                      ? 'bg-gradient-to-r from-purple-700 to-purple-600 text-white'
                      : 'text-cyber-muted hover:text-white'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="relative mb-4">
            <textarea
              ref={textRef}
              value={text}
              onChange={handleText}
              placeholder={PLACEHOLDERS[placeholder]}
              rows={8}
              maxLength={2000}
              className="w-full cyber-input rounded-xl px-4 py-3 text-sm resize-none"
            />
            <div className="absolute bottom-3 right-3 text-xs text-cyber-muted font-mono">{charCount}/2000</div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={analyze}
              disabled={loading || !text.trim()}
              className="flex-1 btn-primary rounded-xl py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                        style={{ animation: `loadDot 1.2s ${i*0.15}s ease-in-out infinite` }} />
                    ))}
                  </span>
                  Analyzing...
                </span>
              ) : '◈ Analyze Text'}
            </motion.button>
            {text && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={clear}
                className="btn-secondary rounded-xl px-4 py-3 text-sm"
              >
                ✕ Clear
              </motion.button>
            )}
          </div>

          {/* Tips */}
          <div className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
            <p className="text-xs text-cyber-muted">
              <span className="text-blue-400 font-mono">TIP:</span> Hybrid mode combines AI model + custom word list for best accuracy. 
              Supports English, Hindi, and Hinglish text.
            </p>
          </div>
        </motion.div>

        {/* Results panel */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass rounded-2xl p-5 flex flex-col items-center justify-center min-h-[400px]"
            >
              <div className="relative w-20 h-20 mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-purple-500"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-2 rounded-full border border-blue-500/20 border-b-blue-400"
                />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🛡️</div>
              </div>
              <p className="text-white font-semibold mb-2">AI Analyzing...</p>
              <p className="text-cyber-muted text-sm">Running detection models</p>
              <div className="flex gap-1 mt-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-purple-500"
                    style={{ animation: `loadDot 1.4s ${i*0.2}s ease-in-out infinite` }} />
                ))}
              </div>
            </motion.div>
          )}

          {!loading && !result && (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass rounded-2xl p-5 flex flex-col items-center justify-center min-h-[400px] text-center"
            >
              <div className="text-5xl mb-4 opacity-30">◈</div>
              <p className="text-cyber-muted text-sm">Enter text and click Analyze<br />to see detection results here</p>
            </motion.div>
          )}

          {!loading && result && cfg && (
            <motion.div key="result"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="glass rounded-2xl p-5 gradient-border"
            >
              {/* Risk score hero */}
              <div className="text-center mb-6 p-4 rounded-xl bg-cyber-bg/50"
                style={{ boxShadow: `0 0 40px ${cfg.glow}` }}>
                <div className="text-4xl mb-2">{cfg.icon}</div>
                <motion.div
                  className="text-5xl font-bold font-display mb-2"
                  style={{ color: cfg.color }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                >
                  {riskPct}%
                </motion.div>
                <span className={`px-3 py-1 rounded-full text-sm font-mono font-semibold ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <p className="text-xs text-cyber-muted mt-2 font-mono">
                  Confidence: <span className="text-white">{result.confidence}</span>
                  {' · '}Source: <span className="text-white capitalize">{result.source}</span>
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-5">
                <div className="flex justify-between text-xs font-mono text-cyber-muted mb-2">
                  <span>RISK LEVEL</span>
                  <span style={{ color: cfg.color }}>{riskPct}%</span>
                </div>
                <AnimatedRiskBar score={riskPct} color={cfg.color} />
                <div className="flex justify-between text-xs font-mono text-cyber-muted mt-1">
                  <span>SAFE</span>
                  <span>LOW</span>
                  <span>MEDIUM</span>
                  <span>HIGH</span>
                </div>
              </div>

              {/* Detected words */}
              {result.detected_words?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-mono text-cyber-muted uppercase tracking-widest mb-2">Detected Terms</p>
                  <div className="flex flex-wrap gap-2">
                    {result.detected_words.map((w, i) => <WordTag key={i} word={w} />)}
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div className="mb-4 p-3 rounded-xl bg-cyber-bg/60 border border-cyber-border/20">
                <p className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-1.5">AI Explanation</p>
                <p className="text-sm text-cyber-text leading-relaxed">{result.explanation}</p>
              </div>

              {/* Suggestion */}
              {result.suggestion && (
                <div className="mb-4 p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                  <p className="text-xs font-mono text-green-400 uppercase tracking-widest mb-1.5">Suggestion</p>
                  <p className="text-sm text-cyber-text leading-relaxed">{result.suggestion}</p>
                </div>
              )}

              {/* Sub-scores */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-cyber-bg/60 border border-cyber-border/20 text-center">
                  <p className="text-xs text-cyber-muted font-mono mb-1">AI MODEL</p>
                  <p className="text-lg font-bold text-blue-400 font-display">
                    {Math.round((result.model_score || 0) * 100)}%
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-cyber-bg/60 border border-cyber-border/20 text-center">
                  <p className="text-xs text-cyber-muted font-mono mb-1">WORD FILTER</p>
                  <p className="text-lg font-bold text-purple-400 font-display">
                    {Math.round((result.custom_abuse_score || 0) * 100)}%
                  </p>
                </div>
              </div>

              {/* Export */}
              <button
                onClick={exportPDF}
                className="w-full btn-secondary rounded-xl py-2.5 text-sm"
              >
                ⬇ Export PDF Report
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
