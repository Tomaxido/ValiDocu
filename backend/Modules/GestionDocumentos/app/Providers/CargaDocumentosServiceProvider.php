<?php

namespace Modules\GestionDocumentos\Providers;

use Illuminate\Support\ServiceProvider;

class CargaDocumentosServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(module_path('GestionDocumentos', 'routes/web.php'));
        $this->loadViewsFrom(module_path('GestionDocumentos', 'resources/views'), 'gestiondocumentos');
        $this->loadMigrationsFrom(module_path('GestionDocumentos', 'database/migrations'));
    }
}
