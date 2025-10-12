<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;

Broadcast::channel('documents', function () {
    // TODO: ahora mismo, esto no loguea nada, porque se está usando el canal público "documents".
    // En cambio, esta función es para un canal privado "documents".
    Log::info("User is attempting to listen to documents channel.");
    return true;
});
