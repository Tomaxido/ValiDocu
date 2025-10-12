<?php

namespace App\Events;

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

    public $groupId;
    public $userId;

    public function __construct($groupId, $userId)
    {
        $this->groupId = $groupId;
        $this->userId = $userId;
    }

    public function broadcastOn()
    {
        return new Channel("documents");
    }
}
