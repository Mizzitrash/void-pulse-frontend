import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Le SDK Firebase pèse ~600 Ko à lui seul et est déjà isolé dans son
    // propre chunk par le découpage automatique. Le seuil par défaut de
    // 500 Ko déclenchait donc un avertissement à chaque build sans qu'il
    // y ait rien à corriger côté application.
    chunkSizeWarningLimit: 700,
    // Les sourcemaps facilitent le débogage des erreurs remontées depuis
    // la production sans alourdir le bundle servi aux visiteurs.
    sourcemap: true,
  },
})