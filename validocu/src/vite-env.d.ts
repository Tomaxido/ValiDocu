/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// Extiende las declaraciones para manejar imports de .mjs
declare module 'pdfjs-dist/build/pdf.worker.mjs?url' {
  const workerUrl: string;
  export default workerUrl;
}