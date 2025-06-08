import PDFViewer from './components/PDFViewer';

function App() {
  return (
    <div>
      <h1>Visor de PDF en React</h1>
      <PDFViewer url="/certificado_exento.pdf" />
      {/* O también puedes usar una URL externa */}
      {/* <PDFViewer url="https://example.com/document.pdf" /> */}
    </div>
  );
}

export default App;