<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class UsersRolesPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Crear roles
        $roles = [
            ['name' => 'Administrador', 'slug' => 'admin'],
            ['name' => 'Supervisor', 'slug' => 'supervisor'],
            ['name' => 'Analista', 'slug' => 'analyst'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['slug' => $role['slug']], $role);
        }

        // 2. Crear permisos
        $permissions = [
            ['key' => 'document.create', 'description' => 'Subir documentos'],
            ['key' => 'document.read', 'description' => 'Ver documentos'],
            ['key' => 'document.update', 'description' => 'Editar documentos'],
            ['key' => 'document.delete', 'description' => 'Eliminar documentos'],
            ['key' => 'user.manage', 'description' => 'Gestionar usuarios y roles'],
            ['key' => 'report.view', 'description' => 'Ver reportes'],
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['key' => $perm['key']], $perm);
        }

        // 3. Asignar permisos a roles
        $adminRole = Role::where('slug', 'admin')->first();
        $supervisorRole = Role::where('slug', 'supervisor')->first();
        $analystRole = Role::where('slug', 'analyst')->first();

        $allPermissions = Permission::pluck('id');

        // Admin → todos los permisos
        $adminRole->permissions()->sync($allPermissions);

        // Supervisor → permisos de lectura y reportes
        $supervisorRole->permissions()->sync(
            Permission::whereIn('key', ['document.read', 'report.view'])->pluck('id')
        );

        // Analyst → permisos de lectura, creación y análisis
        $analystRole->permissions()->sync(
            Permission::whereIn('key', ['document.read', 'document.create', 'document.update'])->pluck('id')
        );

        // 4. Crear usuarios y asignar roles
        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@validocu.cl',
                'password' => Hash::make('1234'),
                'role' => 'admin'
            ],
            [
                'name' => 'Supervisor User',
                'email' => 'supervisor@validocu.cl',
                'password' => Hash::make('1234'),
                'role' => 'supervisor'
            ],
            [
                'name' => 'Analyst User',
                'email' => 'analyst@validocu.cl',
                'password' => Hash::make('1234'),
                'role' => 'analyst'
            ],
        ];

        foreach ($users as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                ['name' => $data['name'], 'password' => $data['password']]
            );

            $role = Role::where('slug', $data['role'])->first();
            if ($role && !$user->roles->contains($role->id)) {
                $user->roles()->attach($role->id);
            }
        }
    }
}
