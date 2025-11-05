<?php

namespace App\Events;

use App\Models\DocumentComment;
use App\Models\DocumentVersion;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $comment;
    public $documentVersion;
    public $notificationMessage;

    /**
     * Create a new event instance.
     *
     * @param DocumentComment $comment
     * @param DocumentVersion $documentVersion
     * @param array $notificationMessage Mensaje de notificación para el frontend
     */
    public function __construct(DocumentComment $comment, DocumentVersion $documentVersion, array $notificationMessage = [])
    {
        $this->comment = $comment;
        $this->documentVersion = $documentVersion;
        $this->notificationMessage = $notificationMessage;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // Broadcasting en canal público para todos los usuarios
        // Simplifica la lógica y evita problemas de autorización
        return [
            new Channel('comments'),
        ];
    }

    /**
     * Datos que se enviarán al frontend
     */
    public function broadcastWith(): array
    {
        return [
            'comment' => [
                'id' => $this->comment->id,
                'text' => $this->comment->comment,
                'user' => [
                    'id' => $this->comment->user->id,
                    'name' => $this->comment->user->name,
                    'email' => $this->comment->user->email,
                ],
                'is_edited' => $this->comment->is_edited === 1,
                'created_at' => $this->comment->created_at->toISOString(),
                'updated_at' => $this->comment->updated_at->toISOString(),
                'time_ago' => $this->comment->getTimeAgoAttribute(),
            ],
            'document_version' => [
                'id' => $this->documentVersion->id,
                'document_id' => $this->documentVersion->document_id,
                'version_number' => $this->documentVersion->version_number,
            ],
            'notification' => $this->notificationMessage,
            'timestamp' => now()->toISOString(),
        ];
    }
}
