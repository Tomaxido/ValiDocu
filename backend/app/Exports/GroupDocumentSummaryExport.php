<?php
namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class GroupDocumentSummaryExport implements WithMultipleSheets
{
    /** @var array<int, \Maatwebsite\Excel\Concerns\FromArray> */
    protected array $sheets;

    /**
     * @param array<int, \Maatwebsite\Excel\Concerns\FromArray> $sheets
     */
    public function __construct(array $sheets)
    {
        $this->sheets = $sheets;
    }

    public function sheets(): array
    {
        return $this->sheets;
    }
}
