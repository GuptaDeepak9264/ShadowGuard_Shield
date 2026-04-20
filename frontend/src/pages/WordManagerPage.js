import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API } from '../context/AuthContext';

export default function WordManagerPage() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [severity, setSeverity] = useState('normal');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSev, setFilterSev] = useState('all');

  const fetchWords = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/words`);
      setWords(res.data.words || []);
    } catch {
      toast.error('Failed to load word list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWords(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const word = newWord.trim().toLowerCase();
    if (!word) return toast.error('Enter a word');
    if (word.length < 2) return toast.error('Word too short');
    if (words.find(w => w.word === word)) return toast.error('Word already exists');

    setAdding(true);
    try {
      const res = await axios.post(`${API}/api/words`, { word, severity });
      setWords(prev => [res.data.word, ...prev]);
      setNewWord('');
      toast.success(`"${word}" added to filter!`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add word');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, word) => {
    try {
      await axios.delete(`${API}/api/words/${id}`);
      setWords(prev => prev.filter(w => w.id !== id));
      toast.success(`"${word}" removed`);
    } catch {
      toast.error('Failed to remove word');
    }
  };

  const filtered = words.filter(w => {
    const matchSearch = !search || w.word.includes(search.toLowerCase());
    const matchSev = filterSev === 'all' || w.severity === filterSev;
    return matchSearch && matchSev;
  });

  const highCount = words.filter(w => w.severity === 'high').length;
  const normalCount = words.filter(w => w.severity === 'normal').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-white">Word Manager</h1>
        <p className="text-cyber-muted text-sm mt-1">Manage custom abusive words for detection</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Words', value: words.length, color: 'purple', icon: '◻' },
          { label: 'High Severity', value: highCount, color: 'red', icon: '▲' },
          { label: 'Normal', value: normalCount, color: 'blue', icon: '◈' },
        ].map(({ label, value, color, icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`glass rounded-2xl p-4 border border-${color}-500/20 bg-${color}-500/5`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{icon}</span>
              <span className="text-xs text-cyber-muted font-mono">{label}</span>
            </div>
            <div className="text-3xl font-bold text-white font-display">{value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Add word form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 glass rounded-2xl p-5 gradient-border h-fit"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Add New Word</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-cyber-muted uppercase tracking-widest mb-2 block">Word / Phrase</label>
              <input
                type="text"
                placeholder="e.g. badword, get lost..."
                value={newWord}
                onChange={e => setNewWord(e.target.value)}
                className="w-full cyber-input rounded-xl px-4 py-3 text-sm font-mono"
                maxLength={50}
              />
              <p className="text-xs text-cyber-muted mt-1">Supports English, Hindi, Hinglish</p>
            </div>

            <div>
              <label className="text-xs font-mono text-cyber-muted uppercase tracking-widest mb-2 block">Severity</label>
              <div className="flex rounded-xl bg-cyber-bg/60 p-1 gap-1">
                {[
                  { value: 'normal', label: '● Normal' },
                  { value: 'high', label: '▲ High' },
                ].map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      severity === s.value
                        ? s.value === 'high'
                          ? 'bg-gradient-to-r from-red-700 to-red-600 text-white'
                          : 'bg-gradient-to-r from-purple-700 to-purple-600 text-white'
                        : 'text-cyber-muted hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-cyber-muted mt-1">
                {severity === 'high'
                  ? '⚠ High severity words automatically trigger HIGH risk score'
                  : '● Normal severity adds to risk score proportionally'}
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={adding || !newWord.trim()}
              whileTap={{ scale: 0.97 }}
              className="w-full btn-primary rounded-xl py-3 text-sm disabled:opacity-50"
            >
              {adding ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                        style={{ animation: `loadDot 1.2s ${i*0.15}s ease-in-out infinite` }} />
                    ))}
                  </span>
                  Adding...
                </span>
              ) : '+ Add to Filter'}
            </motion.button>
          </form>

          <div className="mt-5 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
            <p className="text-xs text-cyber-muted leading-relaxed">
              <span className="text-purple-400 font-mono">HOW IT WORKS:</span> Custom words are checked via pattern matching.
              They work alongside the AI model in <span className="text-white">Hybrid mode</span>.
              Changes apply instantly — no retraining needed.
            </p>
          </div>
        </motion.div>

        {/* Word list */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 glass rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Word List</h2>
            <span className="text-xs text-cyber-muted font-mono">{filtered.length} / {words.length}</span>
          </div>

          {/* Search + filter */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted text-xs">◈</span>
              <input
                type="text"
                placeholder="Search words..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full cyber-input rounded-xl pl-8 pr-3 py-2 text-sm"
              />
            </div>
            <select
              value={filterSev}
              onChange={e => setFilterSev(e.target.value)}
              className="cyber-input rounded-xl px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="flex gap-2">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-purple-500"
                    style={{ animation: `loadDot 1.4s ${i*0.16}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3 opacity-20">◻</div>
              <p className="text-cyber-muted text-sm">
                {search ? 'No words match your search' : 'No custom words added yet'}
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
              <AnimatePresence>
                {filtered.map((w, i) => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-cyber-bg/60 border border-cyber-border/20 hover:border-purple-500/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        w.severity === 'high' ? 'bg-red-500' : 'bg-purple-500'
                      }`} />
                      <span className="text-sm text-white font-mono">{w.word}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                        w.severity === 'high'
                          ? 'bg-red-500/10 border border-red-500/25 text-red-400'
                          : 'bg-purple-500/10 border border-purple-500/25 text-purple-400'
                      }`}>
                        {w.severity?.toUpperCase() || 'NORMAL'}
                      </span>
                      <button
                        onClick={() => handleDelete(w.id, w.word)}
                        className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all text-sm p-1 rounded hover:bg-red-500/10"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
