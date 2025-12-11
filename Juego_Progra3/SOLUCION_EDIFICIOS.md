# 🚨 SOLUCIÓN RÁPIDA - Edificios no aparecen

## El problema
Los edificios no aparecen porque la base de datos no está configurada. El componente necesita la tabla `building_types` para cargar los edificios disponibles.

## ⚡ Solución en 2 minutos

### Paso 1: Ve a Supabase
1. Abre tu proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** (en el menú lateral)

### Paso 2: Ejecuta el script
1. Crea una nueva query
2. Copia y pega **TODO** el contenido del archivo `CONFIGURACION_RAPIDA.sql`
3. Haz click en **Run** (o presiona Ctrl+Enter)

### Paso 3: Recarga la página
1. Ve a tu aplicación en http://localhost:3002
2. Recarga la página (F5)
3. Ve a la pestaña "Mi Aldea"
4. ✅ **Deberías ver los edificios para seleccionar**

---

## 🛠️ Modo Básico (Si no quieres configurar la base de datos ahora)

He agregado un **modo básico** que funciona sin base de datos:

- ✅ Los edificios aparecen automáticamente (modo local)
- ✅ Puedes construir edificios (no se guardan)
- ⚠️ Los cambios se pierden al recargar
- ⚠️ No funciona la generación de recursos
- ⚠️ No funciona el mapa global ni donaciones

## 🔍 Verificación

Una vez configurada la base de datos, deberías ver:

1. **En la pestaña "Mi Aldea"**:
   - Lista de edificios para seleccionar: Casa, Aserradero, Cantera, etc.
   - Precios en recursos para cada edificio
   - Grid 15x15 con ayuntamiento en el centro

2. **En la barra superior**:
   - Recursos: 🌲1000 🗿800 🌾600 ⛏️400 👥0/10

3. **Sin errores**:
   - No debería aparecer el mensaje "⚠️ Base de datos no configurada"

---

## 📋 Lista de archivos del script

El archivo `CONFIGURACION_RAPIDA.sql` crea:
- ✅ `building_types` - Catálogo de edificios
- ✅ `user_resources` - Recursos de cada jugador  
- ✅ `user_buildings` - Edificios construidos
- ✅ `villages` - Información de aldeas
- ✅ Políticas de seguridad básicas

**¿Todo listo?** ¡Ahora deberías poder construir edificios! 🎉
