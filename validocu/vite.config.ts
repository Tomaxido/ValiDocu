import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    host: true,
    allowedHosts: ['validocu.cl'],
    cors: {
      origin: true, // o especifica dominios: ['http://localhost:3000', 'https://tudominio.com']
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  }
})
