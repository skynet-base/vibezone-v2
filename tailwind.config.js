/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        vz: {
          bg: '#020205',               // Deeper dark mode
          'bg-elevated': '#05050A',    // Very dark elevated
          surface: '#0A0A14',          // Glass surface base
          'surface-2': '#0F0F1A',
          border: '#141428',          
          'border-glow': '#2A2A50',
          text: '#F0F0F8',             // Brighter text for contrast
          'text-secondary': '#A0A0C0',
          muted: '#4A4A68',
          cyan: '#00F0FF',             // Electric neon cyan
          green: '#00FFAA',            // Electric neon green
          purple: '#B200FF',           // Deep neon purple
          amber: '#FFB800',
          red: '#FF2A2A',
          pink: '#FF0055',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4), 0 0 45px rgba(0, 240, 255, 0.2), inset 0 0 10px rgba(0, 240, 255, 0.1)',
        'neon-green': '0 0 15px rgba(0, 255, 170, 0.4), 0 0 45px rgba(0, 255, 170, 0.2), inset 0 0 10px rgba(0, 255, 170, 0.1)',
        'neon-purple': '0 0 15px rgba(178, 0, 255, 0.4), 0 0 45px rgba(178, 0, 255, 0.2), inset 0 0 10px rgba(178, 0, 255, 0.1)',
        'neon-pink': '0 0 15px rgba(255, 0, 85, 0.4), 0 0 45px rgba(255, 0, 85, 0.2), inset 0 0 10px rgba(255, 0, 85, 0.1)',
        'glass-inner': 'inset 0 1px 1px rgba(255, 255, 255, 0.05), inset 0 -1px 1px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(178, 0, 255, 0.1) 100%)',
        'mesh-glow': 'radial-gradient(circle at center, rgba(178,0,255,0.15) 0%, rgba(0,240,255,0.05) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
};
