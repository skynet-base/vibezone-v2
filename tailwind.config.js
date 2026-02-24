/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        vz: {
          bg: '#050508',
          'bg-elevated': '#0a0a12',
          surface: '#0f0f1a',
          'surface-2': '#14142a',
          border: '#1a1a35',
          'border-glow': '#2a2a50',
          text: '#e8e8f0',
          'text-secondary': '#a0a0b8',
          muted: '#5a5a78',
          cyan: '#00ccff',
          green: '#00ff88',
          purple: '#8b5cf6',
          amber: '#f59e0b',
          red: '#ff4444',
          pink: '#ff2d78',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 204, 255, 0.3), 0 0 30px rgba(0, 204, 255, 0.1)',
        'neon-green': '0 0 10px rgba(0, 255, 136, 0.3), 0 0 30px rgba(0, 255, 136, 0.1)',
        'neon-purple': '0 0 10px rgba(139, 92, 246, 0.3), 0 0 30px rgba(139, 92, 246, 0.1)',
        'neon-pink': '0 0 10px rgba(255, 45, 120, 0.3), 0 0 30px rgba(255, 45, 120, 0.1)',
      },
    },
  },
  plugins: [],
};
