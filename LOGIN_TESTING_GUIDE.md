# 🔐 Sistema de Autenticación ValiDocu

## 📋 Instrucciones para Testing

### 🚀 Configuración Backend

1. **Ejecutar migraciones y seeders**:
```bash
cd backend
php artisan migrate:fresh --seed
```

2. **Verificar que el servidor está corriendo**:
```bash
php artisan serve
```
El backend debería estar disponible en `http://localhost:8000`

### 🌐 Configuración Frontend

1. **Instalar dependencias** (si no está hecho):
```bash
cd validocu
npm install
```

2. **Verificar archivo .env**:
```bash
# Archivo validocu/.env
VITE_BACKEND_URL=http://localhost:8000
```

3. **Iniciar el servidor de desarrollo**:
```bash
npm run dev
```

### 👤 Usuarios de Prueba

El seeder crea automáticamente estos usuarios:

**Administrador:**
- Email: `admin@ejemplo.com`
- Password: `password123`

**Usuario Normal:**
- Email: `usuario@ejemplo.com`
- Password: `password123`

### 🔍 Funcionalidades Implementadas

#### ✅ **Sistema de Autenticación**
- ✅ Login con email y contraseña
- ✅ Logout con revocación de tokens
- ✅ Verificación automática de sesión activa
- ✅ Contexto de autenticación en React
- ✅ Rutas protegidas

#### ✅ **API Backend**
- ✅ Endpoint `/api/v1/login` - Autenticación
- ✅ Endpoint `/api/v1/logout` - Cerrar sesión  
- ✅ Endpoint `/api/v1/me` - Info del usuario
- ✅ Middleware `auth:sanctum` en rutas protegidas
- ✅ Tokens de API con Laravel Sanctum

#### ✅ **Frontend Components**
- ✅ Componente `Login` con formulario estilizado
- ✅ Componente `UserMenu` con info del usuario
- ✅ Componente `ProtectedRoute` para rutas privadas
- ✅ Integración con Material-UI
- ✅ Gestión automática de tokens

#### ✅ **Sistema de Grupos**
- ✅ Solo usuarios autenticados pueden crear grupos
- ✅ Relación automática usuario-grupo en tabla `users_groups`
- ✅ Control de permisos por grupo
- ✅ Estados: pendiente (0), aprobado (1), rechazado (2)

### 🧪 Flujo de Testing

1. **Acceder a la aplicación**: `http://localhost:5173`
2. **Será redirigido al login** (rutas protegidas)
3. **Usar credenciales de prueba**:
   - Email: `admin@ejemplo.com`
   - Password: `password123`
4. **Verificar funcionalidades**:
   - ✅ Login exitoso
   - ✅ Menú de usuario en header
   - ✅ Acceso a páginas protegidas
   - ✅ Logout funcional

### 📊 Base de Datos

**Tabla `users_groups`**:
```sql
- user_id (FK users)
- group_id (FK document_groups)  
- active (0=pendiente, 1=aprobado, 2=rechazado)
- approved_by (FK users - quien aprobó)
```

### 🔧 Comandos Útiles

**Backend:**
```bash
# Recrear DB con datos de prueba
php artisan migrate:fresh --seed

# Crear solo usuarios de prueba
php artisan db:seed --class=TestUserSeeder

# Limpiar cache de configuración
php artisan config:clear
```

**Frontend:**
```bash
# Desarrollo
npm run dev

# Build de producción  
npm run build

# Preview build
npm run preview
```

### 🐛 Troubleshooting

**Error CORS:**
- Verificar que el backend esté en `http://localhost:8000`
- Verificar configuración CORS en `backend/config/cors.php`

**Token no válido:**
- Limpiar localStorage del navegador
- Verificar que Laravel Sanctum esté correctamente configurado

**Rutas no encontradas:**
- Verificar que todas las rutas tengan middleware `auth:sanctum`
- Verificar que el frontend use la URL correcta en `.env`

¡Ya puedes testear el sistema completo de autenticación! 🎉