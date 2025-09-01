<?php

return [

    'paths' => ['api/*', 'storage/*'], // ← MUY importante: incluir "storage/*"

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://validocu.cl',
        'https://validocu.cl',
        ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
