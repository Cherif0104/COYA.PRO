import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  // SUPPRIMÉ : Configuration dangereuse qui exposait toutes les variables d'environnement
  // Les variables VITE_* sont automatiquement disponibles via import.meta.env
  optimizeDeps: {
    // Forcer la re-optimisation des dépendances
    force: true
  }
})
