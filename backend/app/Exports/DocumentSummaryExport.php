<?php
namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

class DocumentSummaryExport implements
    FromArray,
    WithHeadings,
    WithStyles,
    WithEvents,
    WithColumnWidths,
    WithCustomStartCell
{
    protected array $rows;
    protected array $headings;
    protected array $headerRows; // Deudor, Rut, Empresa (u otras)

    public function __construct(
        array $rows,
        array $headings = ['VARIABLE','INFORMACIÓN'],
        array $headerRows = [] // ej: [['Deudor','...'], ['RUT','...'], ['Empresa','...']]
    ) {
        $this->rows       = $rows;
        $this->headings   = $headings;
        $this->headerRows = $headerRows;
    }

    /** Solo la tabla (no insertes el bloque del deudor aquí) */
    public function array(): array
    {
        return $this->rows;
    }

    public function headings(): array
    {
        return $this->headings;
    }

    /** La tabla (headings) arranca debajo del título + bloque deudor + una fila en blanco */
    public function startCell(): string
    {
        // Fila 1: "Resumen"
        // Filas 2..(1+N): headerRows
        // Fila (2+N): (opcional) en blanco
        // Tabla comienza en fila (3+N)
        $n = count($this->headerRows);
        $startRow = 3 + $n;
        return "A{$startRow}";
    }

    /** Estilos del encabezado (aplicados a la fila real del encabezado) + fuente base */
    public function styles(Worksheet $sheet)
    {
        $n = count($this->headerRows);
        $headerRow = 3 + $n;              // fila donde caen los headings
        $lastRow   = $headerRow + count($this->rows); // última fila con datos
        $lastCol   = count($this->headings);
        $colEnd    = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($lastCol);

        // Fuente general
        $sheet->getStyle("A1:{$colEnd}{$lastRow}")
              ->getFont()->setName('Calibri')->setSize(11);

        // Encabezado azul
        $sheet->getStyle("A{$headerRow}:{$colEnd}{$headerRow}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => Color::COLOR_WHITE]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF2F5597']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
        $sheet->getRowDimension($headerRow)->setRowHeight(26);

        return [];
    }

    /** Anchos (dos columnas) */
    public function columnWidths(): array
    {
        return [
            'A' => 35, // VARIABLE
            'B' => 70, // INFORMACIÓN
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet    = $event->sheet;
                $delegate = $sheet->getDelegate();

                // Cálculo de filas dinámicas
                $n            = count($this->headerRows);     // filas del bloque deudor
                $headerRow    = 3 + $n;                       // fila del encabezado de tabla
                $blankRow     = $headerRow - 1;               // fila en blanco entre bloque y tabla (con N=3 => 5)
                $firstDataRow = $headerRow + 1;               // 1ª fila de datos
                $dataCount    = count($this->rows);
                $lastRow      = $dataCount > 0 ? $headerRow + $dataCount : $headerRow;
                $colCount     = count($this->headings);
                $colEnd       = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colCount);

                // === Estilos reusables ===
                $headerStyle = [
                    'font' => ['bold' => true, 'color' => ['argb' => \PhpOffice\PhpSpreadsheet\Style\Color::COLOR_WHITE]],
                    'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF2F5597']],
                    'alignment' => [
                        'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                        'vertical'   => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER
                    ],
                    'borders' => ['allBorders' => ['borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
                ];
                $thinBorder = [
                    'borders' => ['allBorders' => ['borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
                ];

                // 1) Título "Resumen" en A1:B1 con EL MISMO estilo que el header de la tabla
                $delegate->mergeCells('A1:B1');
                $delegate->setCellValue('A1', 'Resumen');
                $delegate->getStyle('A1:B1')->applyFromArray($headerStyle);
                $delegate->getRowDimension(1)->setRowHeight(26);

                // 2) Bloque de información del deudor (A2..B(1+n))
                for ($i = 0; $i < $n; $i++) {
                    $rowIdx = 2 + $i;
                    $label  = $this->headerRows[$i][0] ?? '';
                    $value  = $this->headerRows[$i][1] ?? '';
                    $delegate->setCellValue("A{$rowIdx}", $label);
                    $delegate->setCellValueExplicit("B{$rowIdx}", (string)$value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                }
                if ($n > 0) {
                    $delegate->getStyle("A2:A" . (1 + $n))->getFont()->setBold(true);
                    $delegate->getStyle("A2:B" . (1 + $n))
                        ->getAlignment()->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER)
                        ->setWrapText(true);
                    // Bordes SOLO al bloque de deudor
                    $delegate->getStyle("A2:B" . (1 + $n))->applyFromArray($thinBorder);
                }

                // 3) Encabezado de la tabla con estilo corporativo
                $delegate->getStyle("A{$headerRow}:{$colEnd}{$headerRow}")->applyFromArray($headerStyle);
                $delegate->getRowDimension($headerRow)->setRowHeight(26);

                // 4) *** Fila en blanco sin formato *** (ni bordes ni fill)
                //    Con N=3 => $blankRow = 5 => A5:B5 limpio
                $delegate->getStyle("A{$blankRow}:{$colEnd}{$blankRow}")
                    ->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_NONE]],
                        'fill'    => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_NONE],
                        'font'    => ['bold' => false, 'color' => ['argb' => \PhpOffice\PhpSpreadsheet\Style\Color::COLOR_BLACK]],
                        'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_GENERAL],
                    ]);
                // También borra cualquier valor residual, por si acaso
                $delegate->setCellValue("A{$blankRow}", null);
                $delegate->setCellValue("B{$blankRow}", null);

                // 5) Bordes SOLO para la tabla (desde encabezado hasta el final de datos)
                $delegate->getStyle("A{$headerRow}:{$colEnd}{$lastRow}")->applyFromArray($thinBorder);

                // 6) Alineaciones de la tabla: A izq, B centrado + wrap
                if ($lastRow >= $firstDataRow) {
                    $delegate->getStyle("A{$firstDataRow}:A{$lastRow}")
                        ->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT)
                        ->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER)
                        ->setWrapText(true);
                    $delegate->getStyle("B{$firstDataRow}:B{$lastRow}")
                        ->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER)
                        ->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER)
                        ->setWrapText(true);
                }

                // 7) Zebra de datos (no afecta a la fila en blanco)
                for ($r = $firstDataRow; $r <= $lastRow; $r++) {
                    if ($r % 2 === 0) {
                        $delegate->getStyle("A{$r}:{$colEnd}{$r}")
                            ->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                            ->getStartColor()->setARGB('FFF2F2F2');
                    }
                }

                // 8) Congelar debajo del encabezado de la tabla
                $sheet->freezePane('A' . ($headerRow + 1));

                // 9) Sin gridlines + impresión
                $sheet->setShowGridlines(false);
                $delegate->setShowGridlines(false);
                $delegate->getPageSetup()
                    ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
                    ->setFitToWidth(1)->setFitToHeight(0);
                $delegate->getPageMargins()
                    ->setTop(0.25)->setBottom(0.25)->setLeft(0.25)->setRight(0.25);
            },
        ];
    }
}
