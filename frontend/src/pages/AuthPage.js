import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  dur: Math.random() * 10 + 8,
  delay: Math.random() * 5,
}));

function FloatingParticle({ x, y, size, dur, delay }) {
  return (
    <motion.div
      className="absolute rounded-full bg-purple-500/30 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{ y: [-20, 20, -20], opacity: [0.2, 0.6, 0.2] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    if (mode === 'register' && !form.name) return toast.error('Name is required');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back! 🛡️');
      } else {
        await register(form.name, form.email, form.password);
        toast.success('Account created! Welcome to ShadowGuard 🛡️');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg cyber-grid flex items-center justify-center relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-900/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-cyan-900/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Particles */}
      {PARTICLES.map(p => <FloatingParticle key={p.id} {...p} />)}

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"
          animate={{ y: ['-100vh', '100vh'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="w-full max-w-md px-4 z-10">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(124,58,237,0.3)', '0 0 40px rgba(124,58,237,0.6)', '0 0 20px rgba(124,58,237,0.3)'] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4"
          >
            🛡️
          </motion.div>
          <h1 className="font-display text-2xl font-bold text-white tracking-widest neon-text">
            SHADOWGUARD
          </h1>
          <p className="text-cyber-muted text-sm mt-1 font-mono">AI CYBERBULLYING DETECTION SHIELD</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass rounded-2xl p-8 gradient-border"
        >
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-cyber-bg/60 p-1 mb-8">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 capitalize ${
                  mode === m
                    ? 'bg-gradient-to-r from-purple-700 to-purple-600 text-white shadow-glow-sm'
                    : 'text-cyber-muted hover:text-white'
                }`}
              >
                {m === 'login' ? '→ Sign In' : '+ Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <label className="block text-xs font-mono text-cyber-muted mb-2 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={set('name')}
                    className="w-full cyber-input rounded-xl px-4 py-3 text-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-mono text-cyber-muted mb-2 uppercase tracking-widest">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                className="w-full cyber-input rounded-xl px-4 py-3 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-cyber-muted mb-2 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={set('password')}
                  className="w-full cyber-input rounded-xl px-4 py-3 pr-12 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-purple-400 text-lg"
                >
                  {showPass ? '◉' : '◎'}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-primary rounded-xl py-3.5 text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                        style={{ animation: `loadDot 1.2s ${i*0.15}s ease-in-out infinite` }} />
                    ))}
                  </span>
                  Processing...
                </span>
              ) : (
                mode === 'login' ? '→ Access Shield' : '+ Create Account'
              )}
            </motion.button>
          </form>

          <p className="text-center text-xs text-cyber-muted mt-6">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
            >
              {mode === 'login' ? 'Register here' : 'Sign in'}
            </button>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-cyber-muted/50 mt-6 font-mono"
        >
          ◈ PROTECTED BY AI · END-TO-END ENCRYPTED ◈
        </motion.p>
      </div>
    </div>
  );
}
