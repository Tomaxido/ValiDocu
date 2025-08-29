// src/utils/summary_export.ts
// import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import saveAs from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportIssue = {
  issue_id: number;
  label: string;
  reason: "missing" | "invalid" | string | null;
  suggestion_template: string;
  status_id?: number | null;
};

export type ExportStatus = { id: number; status: string };

function reasonLabel(r?: string | null) {
  if (r === "missing") return "Campo faltante";
  if (r === "invalid") return "Campo inválido";
  return r ?? "—";
}

function statusLabel(id: number | null | undefined, statuses: ExportStatus[]) {
  if (!id) return "—";
  return statuses.find(s => s.id === id)?.status ?? "—";
}

function buildRows(issues: ExportIssue[], statuses: ExportStatus[]) {
  return issues.map(i => ({
    Campo: i.label,
    Motivo: reasonLabel(i.reason),
    Sugerencia: i.suggestion_template,
    Estado: statusLabel((i.status_id ?? null), statuses)
  }));
}

export async function exportSuggestionsToExcel(issues: any[], statuses: any[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sugerencias");

  // Headers con estilos
  sheet.columns = [
    { header: "Campo", key: "campo", width: 25 },
    { header: "Motivo", key: "motivo", width: 20 },
    { header: "Sugerencia", key: "sugerencia", width: 50 },
    { header: "Estado", key: "estado", width: 20 },
  ];

  // Estilo de headers
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E88E5" }, // azul
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Filas con datos
  issues.forEach((i) => {
    const row = sheet.addRow({
      campo: i.label,
      motivo: i.reason === "missing" ? "Campo faltante" : "Campo inválido",
      sugerencia: i.suggestion_template,
      estado: statuses.find((s: any) => s.id === i.status_id)?.status ?? "—",
    });

    // Bordes en cada celda
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Descargar archivo
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "resumen_sugerencias.xlsx");
}

/** PDF */
export function exportSuggestionsToPDF(
  issues: ExportIssue[],
  statuses: ExportStatus[],
  filename = "resumen_sugerencias.pdf"
) {
  const doc = new jsPDF();
  const rows = buildRows(issues, statuses).map(r => [
    r.Campo,
    r.Motivo,
    r.Sugerencia,
    r.Estado
  ]);

  doc.setFontSize(14);
  doc.text("Resumen de sugerencias", 14, 18);

  autoTable(doc, {
    startY: 24,
    head: [["Campo", "Motivo", "Sugerencia", "Estado"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 32 },
      2: { cellWidth: 80 },
      3: { cellWidth: 30 }
    }
  });

  doc.save(filename);
}
