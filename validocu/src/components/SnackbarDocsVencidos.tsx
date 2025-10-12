import { useState, type JSX } from "react";
import type { ExpiredDocumentResponse } from "../utils/interfaces";
import { Alert, Snackbar } from "@mui/material";

export default function SnackbarDocsVencidos(
  { respuestaDocsVencidos }: { respuestaDocsVencidos: ExpiredDocumentResponse | null }
): JSX.Element {
  const docsVencidos = respuestaDocsVencidos?.documentosVencidos ?? [];
  const docsPorVencer = respuestaDocsVencidos?.documentosPorVencer ?? [];

  const [open, setOpen] = useState(docsVencidos.length > 0 || docsPorVencer.length > 0);

  let message = "Hay ";
  if (docsVencidos.length > 0) {
    if (docsVencidos.length === 1) {
      message += "1 documento vencido";
    } else if (docsVencidos.length > 1) {
      message += `${docsVencidos.length} documentos vencidos`;
    }
    if (docsPorVencer.length > 0) {
      message += " y ";
    }
  }

  if (docsPorVencer.length > 0) {
    if (docsPorVencer.length === 1) {
      message += "1 documento por vencer";
    } else if (docsPorVencer.length > 1) {
      message += `${docsPorVencer.length} documentos por vencer`;
    }
  }

  message += ".";

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      autoHideDuration={10000}
      onClose={() => setOpen(false)}
    >
      <Alert
        severity={docsVencidos.length > 0 ? "error" : "warning"}
        variant="filled"
      >
        {message}
      </Alert>
    </Snackbar>
    
  )
}