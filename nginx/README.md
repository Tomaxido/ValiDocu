# validocu.cl en desarrollo

## Paso 0: Modificar archivo hosts
Agrega en tu máquina

* Windows: `C:\Windows\System32\drivers\etc\hosts`
* Linux/Mac: `/etc/hosts`

Linea:

```bash
127.0.0.1   validocu.cl
```

## Paso 1: Iniciar servicio docker de Nginx Proxy Manager
```bash
docker compose up -d
```

Accede al panel: `http://localhost:81` (usuario inicial: `admin@example.com` / `changeme`).

##  Paso 2: Crear el Proxy Host en NPM

Entra al panel → Hosts → Proxy Hosts → Add Proxy Host

Completa:

* Domain Names: validocu.cl
* Scheme: http
* Forward Hostname/IP: host.docker.internal (esto hace que NPM vea tu localhost real desde dentro del contenedor)
* Forward Port: 5173
* Marca Websockets Support (si usas Vite/HMR).
* SSL → déjalo en blanco (es solo local, sin HTTPS por ahora).
* Guarda.

## Paso 3: Probar

Abre en el navegador:

```bash
http://validocu.cl
```
Te deberia cargar el frontend en el navegador

## Paso 4: Usar mkcert

Para habilitar HTTPS deber crear los certificado para que el navegador detecte el sitio como seguro.

Instala mkcert

* Windows (Chocolatey): `choco install mkcert`
    * Si no tienes Chocolatey instalado instalalo :V
* macOS (Homebrew): `brew install mkcert nss`
* Linux: instala desde releases y ejecuta `mkcert -install` (requiere NSS para Firefox).


Usa el siguiente comando para generar los certificados:

```bash
mkcert validocu.cl
```

Esto generará dos archivos:

* `validocu.cl.pem` (certificado)
* `validocu.cl-key.pem` (clave)

instala la CA local:

```bash
mkcert -install
```

## Paso 5: Sube el certificado a Nginx Proxy Manager

* Entra a http://localhost:81 → SSL Certificates → Add SSL Certificate → Custom
* Certificate: sube `validocu.cl.pem`
* Certificate Key: sube `validocu.cl-key.pem`
* Guarda.

## Paso 6: Activa HTTPS en tu Proxy Host

* Hosts → Proxy Hosts → (edit) validocu.cl

* Pestaña SSL:

* Selecciona tu Custom certificate

* Activa Force SSL y HTTP/2 (opcionalmente HSTS en dev NO es necesario)

* Guarda.

## Paso 7: Probar

Abre en el navegador:

```bash
http://validocu.cl
```
Te deberia cargar el frontend en el navegador y deberia desaparecer el candado, si no funciona cierra y abre tu navegador.