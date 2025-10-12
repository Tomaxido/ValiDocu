<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class DocumentsProcessed implements ShouldBroadcast
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
        return new Channel('documents');
    }
}
