import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Expose Gemini key in dev only — in production it stays on the server
      'import.meta.env.VITE_API_KEY': JSON.stringify(
        mode === 'production' ? env.VITE_GEMINI_API_KEY : 'http://localhost:3001'
      ),
    },
    server: {
      proxy: {
        '/api': { target: 'http://localhost:3001', changeOrigin: true },
      },
    },
  };
});