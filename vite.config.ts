import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '');
  const devPort = parseInt(env.VITE_DEV_PORT || '5176', 10);

  return {
    plugins: [react()],
    root: 'src/renderer',
    publicDir: '../../public',
    base: './',
    build: {
      outDir: '../../dist/renderer',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['framer-motion'],
            'vendor-terminal': ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-webgl'],
            'vendor-three': ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    server: {
      port: devPort,
    },
  };
});
