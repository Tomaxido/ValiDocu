<?php

namespace Modules\CargaDocumentos\Providers;

use Illuminate\Support\ServiceProvider;

class CargaDocumentosServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(module_path('CargaDocumentos', 'routes/web.php'));
        $this->loadViewsFrom(module_path('CargaDocumentos', 'resources/views'), 'cargadocumentos');
        $this->loadMigrationsFrom(module_path('CargaDocumentos', 'database/migrations'));
    }
}
