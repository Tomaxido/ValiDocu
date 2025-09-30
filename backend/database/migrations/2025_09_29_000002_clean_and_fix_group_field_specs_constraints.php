<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Primero, limpiar cualquier dato problemático con field_spec_id = 0
        DB::table('group_field_specs')->where('field_spec_id', 0)->delete();
        
        // Verificar si existen entradas con field_spec_id que no existen en document_field_specs
        $invalidEntries = DB::table('group_field_specs as gfs')
            ->leftJoin('document_field_specs as dfs', 'gfs.field_spec_id', '=', 'dfs.id')
            ->whereNotNull('gfs.field_spec_id')
            ->whereNull('dfs.id')
            ->select('gfs.*')
            ->get();
            
        if ($invalidEntries->count() > 0) {
            // Log invalid entries before deleting them
            foreach ($invalidEntries as $entry) {
                \Log::warning('Removing invalid group_field_specs entry', [
                    'group_id' => $entry->group_id,
                    'field_spec_id' => $entry->field_spec_id,
                    'document_type_id' => $entry->document_type_id
                ]);
            }
            
            // Delete invalid entries
            DB::table('group_field_specs as gfs')
                ->leftJoin('document_field_specs as dfs', 'gfs.field_spec_id', '=', 'dfs.id')
                ->whereNotNull('gfs.field_spec_id')
                ->whereNull('dfs.id')
                ->delete();
        }
        
        // Ahora modificar la constraint de foreign key para permitir NULL
        // Primero, eliminar la constraint existente
        $foreignKeyName = $this->getForeignKeyName();
        if ($foreignKeyName) {
            DB::statement("ALTER TABLE group_field_specs DROP CONSTRAINT {$foreignKeyName}");
        }
        
        // Crear nueva constraint que permite NULL
        DB::statement('
            ALTER TABLE group_field_specs 
            ADD CONSTRAINT group_field_specs_field_spec_id_foreign 
            FOREIGN KEY (field_spec_id) 
            REFERENCES document_field_specs(id) 
            ON DELETE CASCADE
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir la foreign key constraint
        DB::statement('ALTER TABLE group_field_specs DROP CONSTRAINT IF EXISTS group_field_specs_field_spec_id_foreign');
        
        Schema::table('group_field_specs', function (Blueprint $table) {
            $table->foreign('field_spec_id')->references('id')->on('document_field_specs')->onDelete('cascade');
        });
    }
    
    /**
     * Obtener el nombre de la constraint de foreign key existente
     */
    private function getForeignKeyName(): ?string
    {
        $result = DB::select("
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'group_field_specs' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%field_spec_id%'
        ");
        
        return $result ? $result[0]->constraint_name : null;
    }
};