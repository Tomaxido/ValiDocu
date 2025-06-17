# Navega a la carpeta del proyecto (por si se ejecuta desde otro lado)
cd $PSScriptRoot

# Detiene y borra el contenedor anterior si existe
docker rm -f ia-api 2>$null

# Ejecuta el contenedor
docker run -d --name ia-api `
  -p 8000:8000 `
  -v "$PWD\outputs":"/app/outputs" `
  -v "$PWD\outputs\modelo_multiclase":"/app/modelo_multiclase" `
  ValiDocu-IA

# Mensaje
Write-Host "✅ Contenedor ia-api levantado en http://localhost:8000"
