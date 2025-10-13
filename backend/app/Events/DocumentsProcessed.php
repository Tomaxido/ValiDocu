<?php

namespace App\Events;

use App\Models\DocumentGroup;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;

// TODO: cambiar a ShouldBroadcast después de configurar cola correctamente, además de usar canales privados
// https://laravel.com/docs/10.x/broadcasting#defining-broadcast-events
class DocumentsProcessed implements ShouldBroadcastNow
{
    use SerializesModels;

    public DocumentGroup $group;
    public array $documents;
    public int $numUnsuccessfulDocuments;

    public function __construct(DocumentGroup $group, array $documents, int $numUnsuccessfulDocuments)
    {
        $this->group = $group;
        $this->documents = $documents;
        $this->numUnsuccessfulDocuments = $numUnsuccessfulDocuments;
    }

    public function broadcastOn()
    {
        return new Channel("documents");
    }
}
