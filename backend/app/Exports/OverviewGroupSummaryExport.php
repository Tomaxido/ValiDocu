<?php
namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Carbon\Carbon;

class OverviewGroupSummaryExport implements WithEvents, WithColumnWidths, WithTitle
{
    public function __construct(
        private Carbon $fechaGeneracion,
        private string $usuarioResponsable,
        private array  $tablaNoAnalizar,   // [ ['nombre_documento'=>'...', 'estado'=>'OK'], ... ]
        private array  $tablaUnmatched,    // [ ['nombre_documento'=>'...'], ... ]
        private array  $tablaAnalizar,     // [ ['nombre_documento'=>'...', 'estado'=>int, 'observaciones'=>'...', 'porcentaje'=>'..%'], ... ]
        private array  $tablaPendientes = [], // NUEVO: [ ['nombre_documento'=>'...', 'estado'=>'Pendiente'], ... ]
        private int    $groupId = 0,
        private string $groupName = ''
    ) {}

    public function title(): string
    {
        return 'Resumen';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 26,
            'B' => 60,
            'C' => 22,
            'D' => 24,
            'E' => 16,
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet    = $event->sheet->getDelegate();

                $headerStyle = [
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2F5597']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                ];
                $box = ['borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]];

                $r = 1;

                // Título
                $sheet->mergeCells("A{$r}:D{$r}");
                $sheet->setCellValue("A{$r}", 'Resumen de Grupo');
                $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($headerStyle);
                $sheet->getRowDimension($r)->setRowHeight(26);
                $r += 2;

                // Metadatos
                $sheet->setCellValue("A{$r}", 'Fecha de Generación:');
                $sheet->setCellValue("B{$r}", $this->fechaGeneracion->format('Y-m-d H:i'));
                $sheet->mergeCells("B{$r}:D{$r}");
                $r++;
                $sheet->setCellValue("A{$r}", 'Usuario Responsable:');
                $sheet->setCellValue("B{$r}", $this->usuarioResponsable);
                $sheet->mergeCells("B{$r}:D{$r}");
                $r += 2;

                // ===== Tabla 1: No analizar =====
                $sheet->setCellValue("A{$r}", 'Documentos Obligatorios Exentos de Revisión');
                $sheet->mergeCells("A{$r}:D{$r}");
                $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($headerStyle);
                $sheet->getRowDimension($r)->setRowHeight(22);
                $r++;

                // Encabezado
                $sheet->mergeCells("A{$r}:B{$r}");
                $sheet->mergeCells("C{$r}:D{$r}");
                $sheet->setCellValue("A{$r}", 'Nombre Documento');
                $sheet->setCellValue("C{$r}", 'Estado');
                $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($headerStyle);
                $sheet->getRowDimension($r)->setRowHeight(20);
                $r++;

                $start = $r;
                foreach ($this->tablaNoAnalizar as $item) {
                    $sheet->mergeCells("A{$r}:B{$r}");
                    $sheet->mergeCells("C{$r}:D{$r}");
                    $sheet->setCellValue("A{$r}", (string)$item['nombre_documento']);
                    $sheet->setCellValue("C{$r}", (string)$item['estado']);
                    $sheet->getStyle("A{$r}:D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $r++;
                }
                if ($r > $start) {
                    $sheet->mergeCells("A{$r}:B{$r}");
                    $sheet->mergeCells("C{$r}:D{$r}");
                    $sheet->getStyle("A{$start}:D" . ($r-1))->applyFromArray($box);
                    $sheet->getStyle("A{$start}:D" . ($r-1))->applyFromArray($box);
                    $sheet->getStyle("A{$start}:D" . ($r-1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                } else {
                    // sin filas, dibuja una caja vacía
                    $sheet->mergeCells("A{$r}:B{$r}");
                    $sheet->mergeCells("C{$r}:D{$r}");
                    $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($box);
                    $sheet->getStyle("A{$r}:D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $r++;
                }

                $r++;

                // ===== Tabla 2: Obligatorios no encontrados (Pendientes) =====
                $sheet->setCellValue("A{$r}", 'Documentos Obligatorios Pendientes');
                $sheet->mergeCells("A{$r}:D{$r}");
                $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($headerStyle);
                $sheet->getRowDimension($r)->setRowHeight(22);
                $r++;

                $sheet->mergeCells("A{$r}:B{$r}");
                $sheet->mergeCells("C{$r}:D{$r}");
                $sheet->setCellValue("A{$r}", 'Nombre Documento');
                $sheet->setCellValue("C{$r}", 'Estado');
                $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($headerStyle);
                $sheet->getRowDimension($r)->setRowHeight(20);
                $r++;

                $start = $r;
                foreach ($this->tablaPendientes as $item) {
                    $sheet->mergeCells("A{$r}:B{$r}");
                    $sheet->mergeCells("C{$r}:D{$r}");
                    $sheet->setCellValue("A{$r}", (string)$item['nombre_documento']);
                    $sheet->setCellValue("C{$r}", (string)$item['estado']); // "Pendiente"
                    $sheet->getStyle("A{$r}:D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $r++;
                }
                if ($r > $start) {
                    $sheet->mergeCells("A{$r}:B{$r}");
                    $sheet->mergeCells("C{$r}:D{$r}");
                    $sheet->getStyle("A{$start}:D" . ($r-1))->applyFromArray($box);
                    $sheet->getStyle("A{$start}:D" . ($r-1))->applyFromArray($box);
                    $sheet->getStyle("A{$start}:D" . ($r-1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                } else {
                    // caja vacía si no hay pendientes
                    $sheet->mergeCells("A{$r}:B{$r}");
                    $sheet->mergeCells("C{$r}:D{$r}");
                    $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($box);
                    $sheet->getStyle("A{$r}:D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $r++;
                }

                $r++;

                // ===== Tabla 3: Unmatched =====
                $sheet->setCellValue("A{$r}", 'Documentos Extras');
                $sheet->mergeCells("A{$r}:D{$r}");
                $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($headerStyle);
                $sheet->getRowDimension($r)->setRowHeight(22);
                $r++;

                $sheet->setCellValue("A{$r}", 'Nombre Documento');
                $sheet->mergeCells("A{$r}:D{$r}");
                $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($headerStyle);
                $sheet->getRowDimension($r)->setRowHeight(20);
                $r++;

                $start = $r;
                foreach ($this->tablaUnmatched as $item) {
                    $sheet->mergeCells("A{$r}:D{$r}");
                    $sheet->setCellValue("A{$r}", (string)$item['nombre_documento']);
                    $sheet->getStyle("A{$r}:D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $r++;
                }
                if ($r > $start) {
                    $sheet->mergeCells("A{$r}:D{$r}");
                    $sheet->getStyle("A{$start}:D" . ($r-1))->applyFromArray($box);
                    $sheet->getStyle("A{$start}:D" . ($r-1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                } else {
                    $sheet->mergeCells("A{$r}:D{$r}");
                    $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($box);
                    $sheet->getStyle("A{$r}:D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $r++;
                }

                $r++;

                // ===== Tabla 4: Analizar =====
                $sheet->setCellValue("A{$r}", 'Documentos Obligatorios Revisados');
                $sheet->mergeCells("A{$r}:D{$r}");
                $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($headerStyle);
                $sheet->getRowDimension($r)->setRowHeight(22);
                $r++;

                $sheet->setCellValue("A{$r}", 'Nombre Documento');
                $sheet->setCellValue("B{$r}", 'Estado');
                $sheet->setCellValue("C{$r}", 'Observaciones');
                $sheet->setCellValue("D{$r}", '% Cumplimiento');
                $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($headerStyle);
                $sheet->getRowDimension($r)->setRowHeight(20);
                $r++;

                $start = $r;
                foreach ($this->tablaAnalizar as $item) {
                    $sheet->setCellValue("A{$r}", (string)$item['nombre_documento']);
                    $sheet->setCellValue("B{$r}", (string)$item['estado']);
                    $sheet->setCellValue("C{$r}", (string)$item['observaciones']);
                    $sheet->setCellValue("D{$r}", (string)$item['porcentaje']);
                    $r++;
                }
                if ($r > $start) {
                    $sheet->getStyle("A{$start}:D" . ($r-1))->applyFromArray($box);
                    $sheet->getStyle("B{$start}:D" . ($r-1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle("C{$start}:C" . ($r-1))->getAlignment()->setWrapText(true); // Ajuste de texto en columna C
                } else {
                    $sheet->getStyle("A{$r}:D{$r}")->applyFromArray($box);
                    $sheet->getStyle("B{$r}:D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle("C{$r}:C{$r}")->getAlignment()->setWrapText(true); // Ajuste de texto en columna C
                    $r++;
                }

                $event->sheet->setShowGridlines(false);
            },
        ];
    }
}
