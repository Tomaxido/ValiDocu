<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;


class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void {
        $this->call([
            DocumentFieldSpecSeeder::class,
            DocumentLabelAliasSeeder::class,
            SuggestionStatusSeeder::class,
            // AnalysisIssuesSeeder::class, // este era para cuando no se generaban las sugerencias
            UsersRolesPermissionsSeeder::class,
        ]);
    }
}
