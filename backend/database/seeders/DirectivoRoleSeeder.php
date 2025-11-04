<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Role;
use App\Models\Permission;

class DirectivoRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear el rol de directivo (idempotente)
        $role = Role::firstOrCreate(
            ['slug' => 'directivo'],
            ['name' => 'Directivo', 'slug' => 'directivo']
        );

        // Crear permisos específicos para el dashboard ejecutivo (idempotente)
        $permissions = [
            [
                'key' => 'view-executive-dashboard',
                'description' => 'Ver Dashboard Ejecutivo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'view-team-performance',
                'description' => 'Ver Desempeño del Equipo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'view-all-groups',
                'description' => 'Ver Todos los Grupos',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'export-dashboard-data',
                'description' => 'Exportar Datos del Dashboard',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        $permissionIds = [];
        foreach ($permissions as $permission) {
            $permModel = Permission::firstOrCreate(['key' => $permission['key']], $permission);
            $permissionIds[] = $permModel->id;
        }

        // Asociar permisos al rol de directivo sin duplicar
        if (!empty($permissionIds)) {
            $role->permissions()->syncWithoutDetaching($permissionIds);
        }

        $this->command->info('✅ Rol "Directivo" creado con permisos de dashboard ejecutivo');
    }
}
