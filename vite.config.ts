import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Évite deux copies de React (contextes useContext « vides » en dev / HMR).
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
    host: true,
    strictPort: false,
    /** Client HMR sur le même port que le serveur (évite décalage si proxy). */
    hmr: { clientPort: 5174 },
  },
  // SUPPRIMÉ : Configuration dangereuse qui exposait toutes les variables d'environnement
  // Les variables VITE_* sont automatiquement disponibles via import.meta.env
  optimizeDeps: {
    // Forcer la re-optimisation des dépendances
    force: true
  }
})
