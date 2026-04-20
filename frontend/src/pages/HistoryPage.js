import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BADGE = {
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
  SAFE: 'badge-safe',
};

const ICON = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🔵', SAFE: '🟢' };

function HistoryCard({ item, onDelete, index }) {
  const [expanded, setExpanded] = useState(false);
  const riskPct = Math.round((item.risk_score || 0) * 100);
  const words = Array.isArray(item.detected_words)
    ? item.detected_words
    : JSON.parse(item.detected_words || '[]');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.04 }}
      className="glass rounded-xl border border-cyber-border/20 hover:border-purple-500/20 transition-all overflow-hidden"
    >
      {/* Main row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xl flex-shrink-0">{ICON[item.category] || '⚪'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{item.text}</p>
          <p className="text-xs text-cyber-muted font-mono mt-0.5">
            {new Date(item.analyzed_at || item.analyzedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-mono text-cyber-muted">{riskPct}%</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${BADGE[item.category] || BADGE.SAFE}`}>
            {item.category || 'SAFE'}
          </span>
          <span className="text-cyber-muted text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-cyber-border/20"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-mono text-cyber-muted uppercase tracking-widest mb-2">Full Text</p>
                <p className="text-sm text-white bg-cyber-bg/60 rounded-xl p-3 leading-relaxed">{item.text}</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-cyber-bg/60 border border-cyber-border/20 text-center">
                    <p className="text-xs text-cyber-muted font-mono">AI Model</p>
                    <p className="text-base font-bold text-blue-400">{Math.round((item.model_score || 0) * 100)}%</p>
                  </div>
                  <div className="p-2 rounded-lg bg-cyber-bg/60 border border-cyber-border/20 text-center">
                    <p className="text-xs text-cyber-muted font-mono">Word Filter</p>
                    <p className="text-base font-bold text-purple-400">{Math.round((item.custom_abuse_score || 0) * 100)}%</p>
                  </div>
                </div>
                {words.length > 0 && (
                  <div>
                    <p className="text-xs font-mono text-cyber-muted mb-1">Detected Terms</p>
                    <div className="flex flex-wrap gap-1">
                      {words.map((w, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs font-mono bg-red-500/10 border border-red-500/25 text-red-400">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {item.explanation && (
                  <div>
                    <p className="text-xs font-mono text-cyber-muted mb-1">Explanation</p>
                    <p className="text-xs text-cyber-text leading-relaxed">{item.explanation}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end px-4 pb-3">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-mono"
              >
                ✕ Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/analyses?page=${page}&limit=30`);
      setItems(res.data.analyses);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/api/analyses/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      setTotal(t => t - 1);
      toast.success('Analysis deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const exportCSV = () => {
    if (!filtered.length) return toast.error('No data to export');
    const rows = [['Text', 'Category', 'Risk %', 'Confidence', 'Detected Words', 'Date']];
    filtered.forEach(a => {
      const words = Array.isArray(a.detected_words) ? a.detected_words : JSON.parse(a.detected_words || '[]');
      rows.push([
        `"${a.text.replace(/"/g, '""')}"`,
        a.category,
        Math.round((a.risk_score || 0) * 100),
        a.confidence,
        words.join(', '),
        new Date(a.analyzed_at || a.analyzedAt).toLocaleString(),
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `shadowguard-history-${Date.now()}.csv`; a.click();
    toast.success('CSV exported!');
  };

  const exportPDF = () => {
    if (!filtered.length) return toast.error('No data to export');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(100, 0, 200);
    doc.text('ShadowGuard Shield - Analysis History', 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Exported: ${new Date().toLocaleString()} | Total: ${filtered.length} records`, 20, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Text', 'Category', 'Risk%', 'Confidence', 'Date']],
      body: filtered.map(a => [
        a.text.length > 50 ? a.text.slice(0, 50) + '…' : a.text,
        a.category || 'SAFE',
        `${Math.round((a.risk_score || 0) * 100)}%`,
        a.confidence || '-',
        new Date(a.analyzed_at || a.analyzedAt).toLocaleDateString(),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [100, 0, 200], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });

    doc.save(`shadowguard-history-${Date.now()}.pdf`);
    toast.success('PDF exported!');
  };

  const filtered = items.filter(item => {
    const matchSearch = !search || item.text.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || item.category === filter;
    return matchSearch && matchFilter;
  });

  const filterCounts = ['ALL', 'SAFE', 'LOW', 'MEDIUM', 'HIGH'].map(f => ({
    label: f,
    count: f === 'ALL' ? items.length : items.filter(i => i.category === f).length,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Analysis History</h1>
            <p className="text-cyber-muted text-sm mt-1">{total} total analyses</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-secondary rounded-xl px-4 py-2 text-xs">⬇ CSV</button>
            <button onClick={exportPDF} className="btn-secondary rounded-xl px-4 py-2 text-xs">⬇ PDF</button>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted text-sm">◈</span>
            <input
              type="text"
              placeholder="Search analyses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full cyber-input rounded-xl pl-9 pr-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex rounded-xl bg-cyber-bg/60 p-1 gap-1">
            {filterCounts.map(({ label, count }) => (
              <button
                key={label}
                onClick={() => setFilter(label)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all whitespace-nowrap ${
                  filter === label
                    ? 'bg-gradient-to-r from-purple-700 to-purple-600 text-white'
                    : 'text-cyber-muted hover:text-white'
                }`}
              >
                {label} <span className="opacity-60">({count})</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="w-3 h-3 rounded-full bg-purple-500"
                style={{ animation: `loadDot 1.4s ${i*0.16}s ease-in-out infinite` }} />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-20">◷</div>
          <p className="text-cyber-muted">
            {search || filter !== 'ALL' ? 'No results match your filters' : 'No analysis history yet'}
          </p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((item, i) => (
              <HistoryCard key={item.id} item={item} onDelete={handleDelete} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="flex items-center text-sm text-cyber-muted font-mono">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={items.length < 30}
            className="btn-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
