import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',  // 👈 Necesario para que Vite escuche fuera del contenedor
        port: 5173,       // (opcional, por claridad)
        strictPort: true  // (opcional, para que no intente cambiar de puerto)
    }
})
