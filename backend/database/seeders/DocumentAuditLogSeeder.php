<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Document;
use App\Models\DocumentAuditLog;
use App\Models\User;
use Carbon\Carbon;

/**
 * DocumentAuditLogSeeder
 * 
 * Seeder para crear datos de ejemplo en la tabla de auditoría de documentos.
 * Útil para testing y demostración de la funcionalidad de trazabilidad.
 */
class DocumentAuditLogSeeder extends Seeder
{
    public function run(): void
    {
        // Obtener documentos y usuarios existentes
        $documents = Document::with('currentVersion')->limit(5)->get();
        $users = User::limit(3)->get();

        if ($documents->isEmpty() || $users->isEmpty()) {
            $this->command->info('No hay documentos o usuarios suficientes para crear logs de auditoría');
            return;
        }

        $this->command->info('Creando logs de auditoría de ejemplo...');

        foreach ($documents as $document) {
            $currentVersion = $document->currentVersion;
            
            if (!$currentVersion) {
                continue;
            }

            // Simular historial de acciones para cada documento
            $baseDate = $document->created_at;
            $user = $users->random();

            // 1. Log de subida inicial
            DocumentAuditLog::create([
                'document_id' => $document->id,
                'document_version_id' => $currentVersion->id,
                'action' => DocumentAuditLog::ACTION_UPLOADED,
                'comment' => 'Documento subido por primera vez',
                'user_id' => $user->id,
                'ip_address' => '192.168.1.' . rand(1, 254),
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'created_at' => $baseDate,
                'updated_at' => $baseDate,
            ]);

            // 2. Descargas por diferentes usuarios
            for ($i = 0; $i < rand(2, 5); $i++) {
                $downloadUser = $users->random();
                $downloadDate = $baseDate->addDays(rand(1, 30))->addHours(rand(1, 23));
                
                DocumentAuditLog::create([
                    'document_id' => $document->id,
                    'document_version_id' => $currentVersion->id,
                    'action' => DocumentAuditLog::ACTION_DOWNLOADED,
                    'comment' => 'Documento descargado',
                    'user_id' => $downloadUser->id,
                    'ip_address' => '192.168.1.' . rand(1, 254),
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'created_at' => $downloadDate,
                    'updated_at' => $downloadDate,
                ]);
            }

            // 3. Re-subida ocasional (nueva versión)
            if (rand(0, 1)) {
                $reuploadUser = $users->random();
                $reuploadDate = $baseDate->addDays(rand(15, 45))->addHours(rand(1, 23));
                
                DocumentAuditLog::create([
                    'document_id' => $document->id,
                    'document_version_id' => $currentVersion->id,
                    'action' => DocumentAuditLog::ACTION_REUPLOADED,
                    'comment' => 'Nueva versión del documento subida',
                    'user_id' => $reuploadUser->id,
                    'ip_address' => '192.168.1.' . rand(1, 254),
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'created_at' => $reuploadDate,
                    'updated_at' => $reuploadDate,
                ]);
            }

            // 4. Eliminación ocasional
            if (rand(0, 1) && rand(1, 10) > 7) { // Solo 30% de probabilidad
                $deleteUser = $users->random();
                $deleteDate = $baseDate->addDays(rand(50, 100))->addHours(rand(1, 23));
                
                DocumentAuditLog::create([
                    'document_id' => $document->id,
                    'document_version_id' => $currentVersion->id,
                    'action' => DocumentAuditLog::ACTION_DELETED,
                    'comment' => 'Documento eliminado por el usuario',
                    'user_id' => $deleteUser->id,
                    'ip_address' => '192.168.1.' . rand(1, 254),
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'created_at' => $deleteDate,
                    'updated_at' => $deleteDate,
                ]);
            }
        }

        $totalLogs = DocumentAuditLog::count();
        $this->command->info("✅ Se crearon logs de auditoría de ejemplo. Total de logs: {$totalLogs}");
    }
}