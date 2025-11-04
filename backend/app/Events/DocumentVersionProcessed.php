<?php

namespace App\Events;

use App\Models\Document;
use App\Models\DocumentVersion;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Evento que se dispara cuando se termina de procesar una nueva versión de un documento
 */
class DocumentVersionProcessed implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $documentId;
    public int $versionId;
    public int $versionNumber;
    public ?int $groupId;
    public string $filename;
    public bool $success;

    public function __construct(
        int $documentId,
        int $versionId,
        int $versionNumber,
        ?int $groupId,
        string $filename,
        bool $success = true
    ) {
        $this->documentId = $documentId;
        $this->versionId = $versionId;
        $this->versionNumber = $versionNumber;
        $this->groupId = $groupId;
        $this->filename = $filename;
        $this->success = $success;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): Channel
    {
        return new Channel('documents');
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'document_id' => $this->documentId,
            'version_id' => $this->versionId,
            'version_number' => $this->versionNumber,
            'group_id' => $this->groupId,
            'filename' => $this->filename,
            'success' => $this->success,
            'message' => "Nueva versión v{$this->versionNumber} procesada: {$this->filename}",
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'document.version.processed';
    }
}
