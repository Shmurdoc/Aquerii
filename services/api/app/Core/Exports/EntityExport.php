<?php

namespace App\Core\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class EntityExport implements FromArray, WithHeadings
{
    private array $rows;
    private array $headings;

    public function __construct(array $rows, array $headings)
    {
        $this->rows = $rows;
        $this->headings = $headings;
    }

    public function array(): array
    {
        return $this->rows;
    }

    public function headings(): array
    {
        return $this->headings;
    }
}
