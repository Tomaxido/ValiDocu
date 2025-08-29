<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SuggestionStatusSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        DB::table('suggestion_status')->upsert([
            ['status' => 'Seleccionar',      'created_at' => $now, 'updated_at' => $now],
            ['status' => 'No aplica', 'created_at' => $now, 'updated_at' => $now],
            ['status' => 'Por corregir',  'created_at' => $now, 'updated_at' => $now],
        ], ['status'], ['updated_at']);
    }
}
