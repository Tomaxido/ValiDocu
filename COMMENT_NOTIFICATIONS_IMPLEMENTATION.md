# Sistema de Notificaciones de Comentarios - ValiDocu

## Descripción General

Se ha implementado un sistema completo de notificaciones en tiempo real para comentarios en documentos. Este sistema utiliza **Laravel Reverb** (WebSockets) para broadcasting y la tabla `notification_history` para persistencia.

---

## Arquitectura del Sistema

### 🔧 Backend (Laravel)

#### 1. **Evento de Broadcasting: `CommentCreated`**
- **Ubicación**: `backend/app/Events/CommentCreated.php`
- **Tipo**: `ShouldBroadcastNow` (broadcasting inmediato)
- **Canal**: `PrivateChannel('document-version.{id}')` - canal privado por versión de documento
- **Evento**: `.comment.created`
- **Payload**:
  ```php
  [
    'comment' => [...],           // Datos del comentario creado
    'document_version' => [...],  // Información del documento
    'notification' => [...],       // Mensaje de notificación
    'timestamp' => ISO8601
  ]
  ```

#### 2. **Controlador: `DocumentCommentController`**
- **Ubicación**: `backend/app/Http/Controllers/DocumentCommentController.php`
- **Método modificado**: `store()`
- **Funcionalidades**:
  1. Crea el comentario en la BD
  2. Obtiene todos los usuarios del grupo (excepto el autor)
  3. Crea registros en `notification_history` para cada usuario
  4. Emite el evento `CommentCreated` vía WebSocket

**Lógica de notificación**:
```php
// Obtener usuarios del grupo excepto el autor
$notifiableUsers = $group->users()
    ->where('users.id', '!=', $user->id)
    ->where('users_groups.active', 1)
    ->get();

// Crear notificación para cada usuario
foreach ($notifiableUsers as $notifiedUser) {
    DB::table('notification_history')->insert([
        'user_id' => $notifiedUser->id,
        'type' => 'comment',
        'message' => json_encode([...]),
        'is_read' => false,
        ...
    ]);
}

// Emitir evento WebSocket
event(new CommentCreated($comment, $documentVersion, $notificationMessage));
```

#### 3. **Autorización de Canales Privados**
- **Ubicación**: `backend/routes/channels.php`
- **Canal**: `document-version.{documentVersionId}`
- **Lógica de autorización**:
  - Verifica que el usuario pertenezca al grupo del documento
  - Verifica que el usuario esté activo en el grupo
  - Retorna datos del usuario si tiene acceso

```php
Broadcast::channel('document-version.{documentVersionId}', function (User $user, int $documentVersionId) {
    $documentVersion = DocumentVersion::with(['document.group.users'])->findOrFail($documentVersionId);
    $group = $documentVersion->document->group;
    
    $hasAccess = $group->users()
        ->where('users.id', $user->id)
        ->where('users_groups.active', 1)
        ->exists();
    
    return $hasAccess ? ['id' => $user->id, 'name' => $user->name] : false;
});
```

#### 4. **Nuevos Endpoints API**
- **`GET /api/v1/notifications/comments`**: Obtiene notificaciones de comentarios del usuario
- **`GET /api/v1/notifications/comments/unread-count`**: Cuenta notificaciones no leídas

---

### 🎨 Frontend (React + TypeScript)

#### 1. **Interfaces TypeScript**
- **Ubicación**: `validocu/src/utils/interfaces.ts`
- **Nuevas interfaces**:
  - `CommentNotification`: Estructura de notificación persistida
  - `CommentCreatedEvent`: Estructura del evento WebSocket

```typescript
export interface CommentCreatedEvent {
  comment: {
    id: string;
    text: string;
    user: { id: string; name: string; email: string };
    is_edited: boolean;
    created_at: string;
    updated_at: string;
    time_ago: string;
  };
  document_version: {
    id: number;
    document_id: number;
    version_number: number;
  };
  notification: {
    type: 'comment';
    message: string;
    group: { id: number; name: string };
    document: { id: number; name: string; type: string };
    author: { id: string; name: string };
  };
  timestamp: string;
}
```

#### 2. **Hook Personalizado: `useCommentNotifications`**
- **Ubicación**: `validocu/src/hooks/useCommentNotifications.ts`
- **Funcionalidad**:
  - Configura conexión al canal privado de Laravel Echo
  - Retorna objeto echo para manejar eventos
  - Maneja autorización con Bearer token

```typescript
export function useCommentNotifications(documentVersionId: number | null) {
  const channelName = documentVersionId 
    ? `private-document-version.${documentVersionId}` 
    : '';
  
  return useEcho(channelName, '.comment.created');
}
```

#### 3. **Componente: `CommentsPanel`**
- **Ubicación**: `validocu/src/pages/doc_rev/CommentsPanel.tsx`
- **Nuevas props**:
  - `documentVersionId: number` - ID de la versión del documento
  - `onCommentReceived?: (comment: Comment) => void` - Callback para nuevos comentarios

**Lógica de WebSocket**:
```typescript
const echo = useCommentNotifications(documentVersionId);

useEffect(() => {
  if (!echo) return;

  const channel = echo.channel();
  
  if (channel) {
    channel.listen('.comment.created', (event: CommentCreatedEvent) => {
      // No mostrar notificación si es del usuario actual
      if (String(event.comment.user.id) !== String(currentUser?.id)) {
        setNotificationMessage(`${event.comment.user.name} comentó: ...`);
        setNotificationOpen(true);
        
        // Notificar al padre para actualizar la lista
        if (onCommentReceived) {
          onCommentReceived(newCommentData);
        }
      }
    });
  }

  return () => {
    echo.stopListening();
    echo.leaveChannel();
  };
}, [echo, currentUser, onCommentReceived]);
```

**UI de notificaciones**:
- `<Snackbar>` con `<Alert>` en esquina inferior derecha
- Se muestra automáticamente cuando llega un nuevo comentario
- Auto-cierre después de 5 segundos

#### 4. **Componente: `DocInfoPanel`**
- **Ubicación**: `validocu/src/pages/doc_rev/DocInfoPanel.tsx`
- **Función agregada**: `handleCommentReceived()`
  - Recibe nuevos comentarios del WebSocket
  - Evita duplicados verificando IDs
  - Actualiza el estado local de comentarios

```typescript
const handleCommentReceived = (newComment: Comment) => {
  console.log('📥 Nuevo comentario recibido en DocInfoPanel:', newComment);
  setComments((prev) => {
    const exists = prev.some(c => c.id === newComment.id);
    if (exists) return prev;
    return [...prev, newComment];
  });
};
```

#### 5. **Funciones API**
- **Ubicación**: `validocu/src/utils/api.ts`
- **Nuevas funciones**:
  - `getCommentNotifications()`: Obtiene notificaciones de comentarios
  - `getUnreadCommentCount()`: Obtiene contador de no leídas

---

## Flujo Completo de Notificación

### 📤 Cuando un usuario crea un comentario:

1. **Frontend**: Usuario escribe comentario y hace clic en "Enviar"
2. **API**: `POST /api/v1/documents/versions/{id}/comments`
3. **Backend**: `DocumentCommentController::store()`
   - Crea comentario en BD
   - Obtiene usuarios del grupo (excepto autor)
   - Crea registros en `notification_history`
   - Emite evento `CommentCreated` vía Reverb
4. **WebSocket**: Laravel Reverb envía evento a canal privado
5. **Frontend (otros usuarios)**:
   - `useCommentNotifications` hook recibe el evento
   - `CommentsPanel` muestra Snackbar con notificación
   - `DocInfoPanel` actualiza lista de comentarios
   - Usuario ve el comentario aparecer en tiempo real

### 🔔 Cuando un usuario abre el menú de notificaciones:

1. **Frontend**: Click en icono de campana
2. **API**: `GET /api/v1/notifications/comments`
3. **Backend**: `NotificationController::getCommentNotifications()`
   - Consulta `notification_history` filtrado por `type = 'comment'`
   - Retorna últimas 50 notificaciones
4. **Frontend**: Muestra lista de notificaciones con badge contador

---

## Tabla de Base de Datos

### `notification_history`

```sql
CREATE TABLE notification_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'comment', 'document', etc.
    message JSON NOT NULL,       -- Datos del evento
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Estructura del campo `message` para comentarios**:
```json
{
  "comment_id": 123,
  "document_version_id": 456,
  "document_id": 789,
  "group_id": 10,
  "group_name": "Grupo Empresa XYZ",
  "document_name": "contrato_servicios.pdf",
  "document_type": "Contrato",
  "comment_text": "Este documento requiere revisión...",
  "author_name": "Juan Pérez",
  "author_id": "uuid-123-456"
}
```

---

## Seguridad

### 🔒 Canales Privados

- **Autorización**: Solo usuarios del grupo pueden escuchar el canal
- **Autenticación**: Bearer token de Sanctum en headers
- **Verificación**: Middleware de Laravel Broadcasting valida acceso

### 🛡️ Permisos

- Solo el autor puede editar/eliminar sus comentarios
- Solo usuarios activos del grupo reciben notificaciones
- Las notificaciones son personales (cada usuario ve solo las suyas)

---

## Configuración Requerida

### Backend (.env)

```env
BROADCAST_DRIVER=reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
```

### Frontend (.env)

```env
VITE_REVERB_APP_KEY=your-app-key
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_BACKEND_URL=http://localhost:8000
```

---

## Testing

### Probar notificaciones en tiempo real:

1. Abrir dos navegadores (o ventanas incógnito)
2. Iniciar sesión con dos usuarios diferentes del mismo grupo
3. Abrir el mismo documento en ambas ventanas
4. Usuario A crea un comentario
5. Usuario B debería ver:
   - Snackbar de notificación en esquina inferior derecha
   - Comentario aparecer automáticamente en la lista
   - Badge de notificaciones incrementar

### Verificar logs:

**Backend (Laravel)**:
```bash
php artisan reverb:start --debug
tail -f storage/logs/laravel.log
```

**Frontend (Browser Console)**:
```
👂 Listening to private channel: document-version.123
💬 Nuevo comentario recibido: {...}
📥 Nuevo comentario recibido en DocInfoPanel: {...}
```

---

## Próximas Mejoras Sugeridas

1. **Notificaciones de edición/eliminación**:
   - Eventos `CommentUpdated` y `CommentDeleted`
   - Actualizar UI en tiempo real cuando otros usuarios editen

2. **Notificaciones push del navegador**:
   - Usar Web Notifications API
   - Notificar incluso cuando el usuario no está viendo el documento

3. **Agrupación de notificaciones**:
   - Colapsar múltiples comentarios del mismo documento
   - "Juan y 3 personas más comentaron en documento X"

4. **Indicador de "escribiendo"**:
   - Mostrar cuando otro usuario está escribiendo un comentario
   - Similar a WhatsApp/Slack

5. **Historial de notificaciones**:
   - Vista dedicada para ver todas las notificaciones históricas
   - Filtros por tipo, fecha, documento

6. **Marcar como leídas automáticamente**:
   - Auto-marcar notificaciones cuando el usuario ve el comentario
   - Sincronizar estado entre pestañas

---

## Archivos Modificados/Creados

### Backend
- ✅ **CREADO**: `app/Events/CommentCreated.php`
- ✅ **MODIFICADO**: `app/Http/Controllers/DocumentCommentController.php`
- ✅ **MODIFICADO**: `app/Http/Controllers/NotificationController.php`
- ✅ **MODIFICADO**: `routes/api.php`
- ✅ **MODIFICADO**: `routes/channels.php`

### Frontend
- ✅ **CREADO**: `src/hooks/useCommentNotifications.ts`
- ✅ **MODIFICADO**: `src/utils/interfaces.ts`
- ✅ **MODIFICADO**: `src/utils/api.ts`
- ✅ **MODIFICADO**: `src/pages/doc_rev/CommentsPanel.tsx`
- ✅ **MODIFICADO**: `src/pages/doc_rev/DocInfoPanel.tsx`

---

## Soporte

Para cualquier duda o problema, revisar:
- Logs de Laravel: `storage/logs/laravel.log`
- Consola del navegador (Network tab para WebSockets)
- Laravel Reverb debug: `php artisan reverb:start --debug`

**Documentación oficial**:
- [Laravel Broadcasting](https://laravel.com/docs/10.x/broadcasting)
- [Laravel Reverb](https://reverb.laravel.com)
- [Laravel Echo React](https://github.com/laravel/echo-react)
