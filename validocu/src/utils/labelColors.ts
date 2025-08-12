// Colores por tipo de entidad. No usar tonos rojizos — reservados para errores futuros.
const labelColors: Record<string, string> = {
  TIPO_DOCUMENTO: "rgba(255, 230, 0, 0.4)",       // amarillo claro
  FECHA: "rgba(0, 255, 255, 0.4)",                // cian
  NOMBRE_COMPLETO: "rgba(144, 238, 144, 0.4)",    // verde claro
  RUT: "rgba(102, 204, 255, 0.4)",                // azul celeste
  DIRECCION: "rgba(173, 216, 230, 0.4)",          // azul muy suave
  EMPRESA: "rgba(204, 153, 255, 0.4)",            // lavanda suave
  MONTO: "rgba(255, 255, 153, 0.4)",              // amarillo pastel
  FIRMA: "rgba(153, 255, 204, 0.4)"               // verde-menta
};

export default labelColors;