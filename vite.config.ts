import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: '/',
  plugins: [
    react(),
  ],
  build: {
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'icons': ['react-icons/fa'],
          'supabase': ['@supabase/supabase-js'],
        },
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'pages/login/Login') return 'assets/js/Login-[hash].js';
          if (chunkInfo.name === 'pages/navbar/Nosotros/Nosotros') return 'assets/js/Nosotros-[hash].js';
          if (chunkInfo.name === 'pages/navbar/Descuentos/Descuentos') return 'assets/js/Descuentos-[hash].js';
          if (chunkInfo.name === 'pages/navbar/Garantias/Garantias') return 'assets/js/Garantias-[hash].js';
          return `assets/js/${chunkInfo.name}-[hash].js`;
        },
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 500,
    target: 'esnext',
    cssCodeSplit: true,
  },
  server: {
    // fs.strict en false permite que el dev server sirva cualquier archivo
    // del disco fuera del proyecto (path traversal) — se deja explícito en
    // true; si algún día hace falta servir una carpeta extra, usar
    // server.fs.allow con esa ruta puntual en vez de desactivar la protección.
    fs: {
      strict: true,
    },
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: false,
      interval: 100,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@vitejs/plugin-react'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});