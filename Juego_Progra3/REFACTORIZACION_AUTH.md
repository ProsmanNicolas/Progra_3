# Refactorización del Sistema de Autenticación

## Resumen de Cambios

Se ha refactorizado el sistema de autenticación moviendo la lógica desde el frontend (React) al backend (Express), siguiendo las mejores prácticas de arquitectura de aplicaciones web.

## Estructura Nueva

### Backend (Express)

#### Archivos Creados:
- `backend/src/controllers/authController.js` - Controladores de autenticación
- `backend/src/routes/authRoutes.js` - Rutas de autenticación
- `backend/src/middleware/authMiddleware.js` - Middleware de autenticación
- `backend/src/config/supabase.js` - Configuración de Supabase para el backend

#### Endpoints de API:
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener información del usuario autenticado
- `POST /api/auth/check-email` - Verificar si un email existe

### Frontend (React)

#### Archivos Creados:
- `frontend/src/services/authAPI.js` - Servicio de API para autenticación
- `frontend/src/hooks/useAuth.js` - Hook personalizado para manejo de autenticación

#### Archivos Modificados:
- `frontend/src/pages/Login.jsx` - Refactorizado para usar API del backend
- `frontend/src/pages/Register.jsx` - Refactorizado para usar API del backend
- `frontend/src/App.jsx` - Actualizado para usar nuevo sistema de autenticación

## Beneficios de la Refactorización

### Seguridad
- **Credenciales del servidor**: Las operaciones sensibles usan service_key en el backend
- **Separación de responsabilidades**: El frontend no maneja directamente Supabase Auth
- **Tokens seguros**: Manejo centralizado de tokens de autenticación

### Mantenibilidad
- **Lógica centralizada**: Toda la lógica de autenticación en el backend
- **API consistente**: Respuestas estandarizadas con formato JSON
- **Fácil testing**: Los endpoints pueden ser probados independientemente

### Escalabilidad
- **Arquitectura modular**: Fácil agregar nuevas funcionalidades
- **Reutilización**: Los endpoints pueden ser usados por múltiples clientes
- **Monitoreo**: Logs centralizados en el servidor

## Configuración Requerida

### Backend
1. Instalar dependencias:
   ```bash
   cd backend
   npm install
   ```

2. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```
   
3. Editar `.env` con tus credenciales de Supabase:
   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_KEY=tu_service_key_aqui
   ```

4. Iniciar servidor:
   ```bash
   npm run dev
   ```

### Frontend
1. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```
   
2. Editar `.env`:
   ```
   REACT_APP_API_URL=http://localhost:3001
   ```

## Flujo de Autenticación

### Registro
1. Frontend envía datos a `POST /api/auth/register`
2. Backend valida y registra usuario en Supabase
3. Supabase envía email de confirmación
4. Usuario confirma email para activar cuenta

### Login
1. Frontend envía credenciales a `POST /api/auth/login`
2. Backend valida con Supabase Auth
3. Si es válido, retorna token y datos del usuario
4. Frontend almacena token localmente

### Protección de Rutas
1. Frontend incluye token en headers: `Authorization: Bearer TOKEN`
2. Backend middleware valida token con Supabase
3. Si es válido, permite acceso; si no, retorna 401

## Próximos Pasos

1. ✅ **Autenticación completada**
2. 🔄 **Recursos**: Mover lógica de recursos al backend
3. 🔄 **Edificios**: Mover gestión de edificios al backend
4. 🔄 **Tropas**: Mover sistema de tropas al backend
5. 🔄 **Chat**: Mover sistema de mensajería al backend
6. 🔄 **Mapas/Batallas**: Mover lógica de juego al backend

## Notas Importantes

- **Service Key vs Anon Key**: El backend usa service_key para operaciones privilegiadas
- **CORS**: Configurado para permitir peticiones desde el frontend
- **Error Handling**: Manejo consistente de errores con códigos HTTP apropiados
- **Token Storage**: Los tokens se almacenan en localStorage del navegador
- **Session Management**: El backend valida tokens en cada petición protegida
