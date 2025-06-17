# Tecnologias del proyecto

## Backend

* php 8.3.10
* Postgresql 14
* Composer
* Laravel 11

## Frontend

* Nodejs 22.16.0
* React


## Generador de contratos

* Python 3.13.3

* Crear ambiente virtual con `python -m venv venv`

* Activar el ambiente virtual
  * Windows (cmd):
    ```bash
    venv\Scripts\activate
    ```
  * Windows (PowerShell):
    ```bash
    .\venv\Scripts\Activate.ps1
    ```
  * Linux:
    ```bash
    source venv/bin/activate
    ```
  
* instalar librerias con `pip install -r requirements.txt`

* Correr codigo con `python generador_de_contratos.py {cantidad_de_contratos}`.
  Por ejemplo `python generador_de_contratos.py 15`  genera 15 contratos

* Si estas en Windows hay que instalar Poppler:
  * Instalacon con Chocolatey:
      ```bash
      choco install poppler
      ```
  * Instalación manual:
    * Descargar [archivo Release](https://github.com/oschwartz10612/poppler-windows/releases/tag/v24.08.0-0)
    * Añadir al PATH usando la ruta `ruta/a/poppler/Library/bin`
    * Reiniciar consola
  
  Confirmar instalación con `pdfinfo -v`
* Si estas en linux, la mayoria de las distros ya lo tiene instalado, si no, hay que instalar `poppler-utils` con el package maneger.

