/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Sora'", "sans-serif"],
        display: ["'Orbitron'", "monospace"],
      },
      colors: {
        cyber: {
          bg: "#080b14",
          surface: "#0d1120",
          card: "#111827",
          border: "#1e2a45",
          accent: "#7c3aed",
          purple: "#a855f7",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          green: "#10b981",
          yellow: "#f59e0b",
          red: "#ef4444",
          text: "#e2e8f0",
          muted: "#64748b",
        },
      },
      backgroundImage: {
        "cyber-gradient": "linear-gradient(135deg, #080b14 0%, #0d1120 50%, #0a0f1e 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(59,130,246,0.05) 100%)",
        "glow-purple": "radial-gradient(ellipse at center, rgba(124,58,237,0.2) 0%, transparent 70%)",
        "glow-blue": "radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "scan": "scan 3s linear infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(124,58,237,0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(124,58,237,0.6), 0 0 40px rgba(124,58,237,0.2)" },
        },
      },
      boxShadow: {
        "cyber": "0 0 20px rgba(124,58,237,0.3), 0 0 60px rgba(124,58,237,0.1)",
        "cyber-blue": "0 0 20px rgba(59,130,246,0.3), 0 0 60px rgba(59,130,246,0.1)",
        "card": "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        "glow-sm": "0 0 10px rgba(124,58,237,0.4)",
      },
    },
  },
  plugins: [],
};
