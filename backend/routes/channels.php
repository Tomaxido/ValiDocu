<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('documents', function () {
    return 'AAAAA';
});
