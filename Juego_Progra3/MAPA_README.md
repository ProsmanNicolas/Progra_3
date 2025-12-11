# Sistema de Mapa 2D - Instrucciones de Configuración

## 🗺️ Características del Sistema de Mapa

El sistema de mapa implementado incluye:

- **Grid de 15x15 casillas** para construir edificios
- **Persistencia en base de datos** - cada usuario tiene su propio mapa
- **Validación de construcción** - no se puede construir en casillas ocupadas
- **Diferentes tipos de edificios**: Ayuntamiento, Casa, Granja, Mina, Cuartel
- **Interacción con mouse**: 
  - Click izquierdo para construir
  - Click derecho para eliminar (excepto Ayuntamiento)

## 🛠️ Configuración de la Base de Datos

### Paso 1: Aplicar la migración en Supabase

1. Ve a tu proyecto de Supabase
2. Navega a **SQL Editor**
3. Ejecuta el contenido del archivo `setup_database.sql`:

```sql
-- El archivo contiene:
-- - Creación de tabla user_maps
-- - Configuración de políticas RLS
-- - Triggers para timestamps
```

### Paso 2: Verificar la tabla

Después de ejecutar el SQL, verifica que la tabla se creó correctamente:
- Ve a **Table Editor**
- Deberías ver la tabla `user_maps`

## 🎮 Uso del Sistema

### Edificios Disponibles

| Edificio | Emoji | Función |
|----------|-------|---------|
| Ayuntamiento | 🏛️ | Edificio principal (no se puede eliminar) |
| Casa | 🏠 | Vivienda para población |
| Granja | 🌾 | Produce alimentos |
| Mina | ⛏️ | Produce recursos |
| Cuartel | 🏭 | Entrena tropas |

### Controles

- **Seleccionar edificio**: Click en los botones de la parte superior
- **Construir**: Click izquierdo en una casilla vacía
- **Eliminar**: Click derecho en un edificio (excepto Ayuntamiento)

### Reglas de Construcción

1. ✅ Solo se puede construir en casillas vacías
2. ✅ El Ayuntamiento aparece automáticamente en el centro del mapa
3. ✅ No se puede eliminar el Ayuntamiento
4. ✅ Los cambios se guardan automáticamente en la base de datos
5. ✅ Cada usuario tiene su propio mapa independiente

## 🔧 Archivos Creados/Modificados

### Nuevos archivos:
- `frontend/src/components/GameMap.jsx` - Componente principal del mapa
- `setup_database.sql` - Script de migración para Supabase

### Archivos modificados:
- `frontend/src/pages/Game.jsx` - Integrado el sistema de mapa con navegación

## 🚀 Próximos Pasos

1. **Recursos**: Sistema de oro, comida y gemas
2. **Mejoras**: Subir nivel de edificios
3. **Tropas**: Sistema de entrenamiento en cuarteles  
4. **Batallas**: PvP entre jugadores
5. **Defensas**: Torres y muros defensivos

## 🔍 Testing

Para probar el sistema:
1. Ejecutar `npm start` en el frontend
2. Registrarse/iniciar sesión
3. Ir a la pestaña "Mapa" en el juego
4. Probar construcción y eliminación de edificios
5. Verificar que los cambios persisten al recargar la página
