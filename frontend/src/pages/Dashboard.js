import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { API, useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

function StatCard({ label, value, icon, color, sub, delay }) {
  const colorMap = {
    purple: 'from-purple-600/20 to-purple-900/5 border-purple-500/20 text-purple-400',
    blue: 'from-blue-600/20 to-blue-900/5 border-blue-500/20 text-blue-400',
    green: 'from-green-600/20 to-green-900/5 border-green-500/20 text-green-400',
    red: 'from-red-600/20 to-red-900/5 border-red-500/20 text-red-400',
    yellow: 'from-yellow-600/20 to-yellow-900/5 border-yellow-500/20 text-yellow-400',
  };
  return (
    <motion.div {...FADE_UP(delay)} className={`glass rounded-2xl p-5 bg-gradient-to-br border ${colorMap[color]} glass-hover`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full bg-current/10 border border-current/20`}>{sub}</span>
      </div>
      <div className="text-3xl font-bold text-white font-display mb-1">{value}</div>
      <div className="text-xs text-cyber-muted">{label}</div>
    </motion.div>
  );
}

function RiskBadge({ category }) {
  const map = { HIGH: 'badge-high', MEDIUM: 'badge-medium', LOW: 'badge-low', SAFE: 'badge-safe' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${map[category] || 'badge-safe'}`}>
      {category || 'SAFE'}
    </span>
  );
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-4 py-3 text-xs font-mono border border-purple-500/20">
      <p className="text-cyber-muted mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/dashboard/stats`)
      .then(res => setStats(res.data.stats))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  // Build chart data from weeklyTrend
  const chartData = stats?.weeklyTrend
    ? Object.entries(stats.weeklyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([date, val]) => ({
          date: date.slice(5), // MM-DD
          Safe: val.safe || 0,
          Flagged: val.flagged || 0,
        }))
    : [];

  const pieData = stats
    ? [
        { name: 'Safe', value: stats.safeCount || 0, color: '#10b981' },
        { name: 'Low', value: stats.lowRisk || 0, color: '#06b6d4' },
        { name: 'Medium', value: stats.mediumRisk || 0, color: '#f59e0b' },
        { name: 'High', value: stats.highRisk || 0, color: '#ef4444' },
      ].filter(d => d.value > 0)
    : [];

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-3 h-3 rounded-full bg-purple-500"
            style={{ animation: `loadDot 1.4s ${i*0.16}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div {...FADE_UP(0)} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, <span className="text-purple-400">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-cyber-muted text-sm mt-1">Here's your cyberbullying detection overview</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/analyze')}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm"
          >
            ◈ Analyze Text
          </motion.button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Analyzed" value={stats?.totalAnalyzed ?? 0} icon="◈" color="purple" sub="ALL TIME" delay={0.05} />
        <StatCard label="Flagged Messages" value={stats?.totalFlagged ?? 0} icon="⚑" color="red" sub="DETECTED" delay={0.1} />
        <StatCard label="Safe Messages" value={stats?.safeCount ?? 0} icon="✓" color="green" sub="CLEAN" delay={0.15} />
        <StatCard label="High Risk" value={stats?.highRisk ?? 0} icon="▲" color="yellow" sub="CRITICAL" delay={0.2} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Area chart */}
        <motion.div {...FADE_UP(0.25)} className="lg:col-span-2 glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Detection Activity</h2>
          <p className="text-xs text-cyber-muted mb-5">Last 7 days — Safe vs Flagged</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gSafe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gFlag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Area type="monotone" dataKey="Safe" stroke="#10b981" fill="url(#gSafe)" strokeWidth={2} />
                <Area type="monotone" dataKey="Flagged" stroke="#ef4444" fill="url(#gFlag)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-cyber-muted text-sm">
              No data yet — start analyzing text to see trends
            </div>
          )}
        </motion.div>

        {/* Pie chart */}
        <motion.div {...FADE_UP(0.3)} className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Risk Distribution</h2>
          <p className="text-xs text-cyber-muted mb-4">By category</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-3">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-cyber-muted">{d.name}</span>
                    </div>
                    <span className="text-white font-mono">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-cyber-muted text-sm text-center px-4">
              Analyze some messages to see distribution
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent activity */}
      <motion.div {...FADE_UP(0.35)} className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Recent Analyses</h2>
            <p className="text-xs text-cyber-muted mt-0.5">Your latest detection results</p>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="text-xs text-purple-400 hover:text-purple-300 font-mono underline underline-offset-2"
          >
            View All →
          </button>
        </div>

        {stats?.recentAnalyses?.length > 0 ? (
          <div className="space-y-3">
            {stats.recentAnalyses.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-cyber-bg/50 border border-cyber-border/20 hover:border-purple-500/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-cyber-surface flex items-center justify-center text-sm flex-shrink-0">
                  {a.category === 'HIGH' ? '🔴' : a.category === 'MEDIUM' ? '🟡' : a.category === 'LOW' ? '🔵' : '🟢'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate font-medium">{a.text}</p>
                  <p className="text-xs text-cyber-muted mt-0.5 font-mono">
                    {new Date(a.analyzed_at || a.analyzedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-mono text-cyber-muted">{Math.round((a.risk_score || 0) * 100)}%</span>
                  <RiskBadge category={a.category} />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">◈</div>
            <p className="text-cyber-muted text-sm">No analyses yet</p>
            <button
              onClick={() => navigate('/analyze')}
              className="mt-3 text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2"
            >
              Start your first analysis →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
