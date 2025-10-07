# HDU 09 - Creación y administración de grupos personales

## Descripción
Esta funcionalidad permite a los usuarios crear grupos privados que solo ellos pueden visualizar y administrar. Si requieren que otra persona pueda ver o editar ese grupo, deben solicitar autorización a un administrador para mantener la seguridad y el control de acceso.

## Características implementadas

### 1. Grupos Privados
- Cada usuario puede crear grupos privados visibles únicamente para sí mismo
- El creador del grupo tiene control total sobre su configuración y contenido
- Ningún otro usuario puede visualizar o editar un grupo ajeno sin autorización explícita

### 2. Selector de Privacidad
- Al crear un nuevo grupo, los usuarios pueden elegir si será público (comportamiento anterior) o privado
- Switch con descripción clara sobre las implicaciones de cada opción
- Los grupos públicos siguen funcionando como antes (visibles para todos)

### 3. Sistema de Solicitudes de Acceso
- Los propietarios de grupos privados pueden solicitar acceso para otros usuarios
- Las solicitudes incluyen:
  - Email del usuario solicitado
  - Tipo de permiso (solo lectura o edición)
  - Razón de la solicitud (opcional)

### 4. Panel de Administración
- Los administradores pueden ver todas las solicitudes pendientes
- Las solicitudes están ordenadas por antigüedad (criterio especificado)
- Pueden aprobar o rechazar solicitudes con comentarios opcionales
- Al aprobar, el usuario obtiene automáticamente los permisos especificados

### 5. Indicadores Visuales
- Los grupos privados muestran un icono de candado 🔒
- Botón para solicitar acceso (visible solo para propietarios de grupos privados)
- Tooltips informativos sobre la funcionalidad

## Archivos modificados/creados

### Backend
- **Migraciones:**
  - `2025_10_01_000001_add_private_groups_support.php` - Agrega columnas para grupos privados
  - `2025_10_01_000002_create_group_access_requests_table.php` - Tabla para solicitudes de acceso

- **Modelos:**
  - `app/Models/DocumentGroup.php` - Métodos para verificar acceso y permisos
  - `app/Models/GroupAccessRequest.php` - Modelo para gestionar solicitudes
  - `app/Models/User.php` - Relación para grupos accesibles

- **Controladores:**
  - `app/Http/Controllers/DocumentUploadController.php` - Soporte para grupos privados
  - `app/Http/Controllers/GroupAccessRequestController.php` - Gestión de solicitudes

- **Rutas:**
  - `routes/api.php` - Nuevas rutas para solicitudes de acceso

### Frontend
- **Componentes:**
  - `validocu/src/components/group/RequestAccessModal.tsx` - Modal para solicitar acceso
  - `validocu/src/components/admin/PendingRequestsModal.tsx` - Panel de administración

- **Páginas:**
  - `validocu/src/pages/main/NewGroupModal.tsx` - Selector de privacidad
  - `validocu/src/pages/main/Home.tsx` - Indicadores visuales y gestión

- **Utils:**
  - `validocu/src/utils/api.ts` - Funciones para API de solicitudes
  - `validocu/src/utils/interfaces.ts` - Tipos actualizados

## Flujo de uso

### Crear grupo privado
1. Usuario hace clic en "Agregar grupo"
2. Ingresa nombre del grupo
3. Activa el switch "Grupo privado"
4. Sube documentos y configura como normal
5. El grupo se crea y solo es visible para el creador

### Solicitar acceso para otro usuario
1. Propietario del grupo hace clic en el icono de usuarios 👥
2. Ingresa email del usuario y tipo de permiso
3. Opcionalmente agrega una razón
4. La solicitud se envía para revisión administrativa

### Aprobar/rechazar solicitudes (Administrador)
1. Administrador accede al panel de solicitudes pendientes
2. Revisa las solicitudes ordenadas por antigüedad
3. Puede aprobar o rechazar con comentarios
4. El usuario obtiene acceso automáticamente si se aprueba

## Criterios de aceptación cumplidos

✅ **Grupo solo visible para el creador:** Los grupos privados solo aparecen en la lista del propietario

✅ **Denegación de acceso:** Otros usuarios no pueden acceder a grupos privados sin autorización

✅ **Solicitud de acceso:** Sistema completo para solicitar permisos via administrador

✅ **Aprobación administrativa:** Solo administradores pueden aprobar/rechazar solicitudes

✅ **Ordenamiento por antigüedad:** Las solicitudes pendientes se ordenan por fecha de creación

✅ **Registro de historial:** Todas las acciones quedan registradas en la base de datos

## Configuración CORS
La funcionalidad está configurada para trabajar con CORS correctamente. Las rutas están protegidas con middleware de autenticación Sanctum.

## Notas técnicas
- Compatible con el flujo existente de subida de documentos
- Mantiene retrocompatibilidad con grupos públicos existentes
- Utiliza las modales y componentes existentes como base
- Implementa validaciones de seguridad apropiadas
- Sigue los patrones de diseño establecidos en el proyecto