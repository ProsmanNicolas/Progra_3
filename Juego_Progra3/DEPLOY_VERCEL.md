# 🚀 Guía de Deploy a Vercel

## 📦 Paso 1: Limpiar Archivos Innecesarios

Elimina estos archivos antes de subir a Git/Vercel:

### Scripts SQL (ya ejecutados en Supabase):
- `add_population_cost_to_troops.sql`
- `add_village_icon_column.sql`
- `add_wall_building_type.sql`
- `update_building_limit_exclude_walls.sql`
- `update_wall_emoji.sql`

### Scripts JS temporales:
- `add_population_cost_supabase.js`
- `add_village_icon_browser.js`
- `add_village_icon_supabase.js`
- `cleanup_localStorage.js`
- `complete_browser_cleanup.js`
- `diagnostico_donaciones.js`
- `diagnostico_edificios.js`
- `diagnostico_tablas.js`

### Documentación interna (opcional mantener):
- `MAPA_README.md`
- `MIGRACION_CHAT.md`
- `REFACTORIZACION_AUTH.md`
- `SISTEMA_COMPLETO.md`
- `SISTEMA_MUROS.md`
- `SOLUCION_EDIFICIOS.md`

### Archivos de respaldo:
- `frontend/src/services/villageAPI_backup.js`
- `frontend/src/services/villageAPI_clean.js`
- `backend/backend-logs.txt`

### Comando rápido para limpiar (PowerShell):
```powershell
# En la raíz del proyecto
Remove-Item *.sql, *.js -Exclude package.json
Remove-Item *_README.md, MIGRACION_*.md, REFACTORIZACION_*.md, SISTEMA_*.md, SOLUCION_*.md
Remove-Item backend/backend-logs.txt
Remove-Item frontend/src/services/villageAPI_backup.js
Remove-Item frontend/src/services/villageAPI_clean.js
```

## 🌐 Paso 2: Configurar para Vercel

### A. Frontend (React)

1. **Crear `vercel.json` en la raíz del proyecto:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    },
    {
      "src": "backend/src/app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/src/app.js"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/build/$1"
    }
  ]
}
```

2. **Actualizar `frontend/package.json`:**

Asegúrate de tener el script `build`:
```json
{
  "scripts": {
    "build": "react-scripts build",
    "vercel-build": "npm run build"
  }
}
```

3. **Crear `.env.production` en frontend:**

```env
REACT_APP_API_URL=https://tu-proyecto.vercel.app
REACT_APP_SUPABASE_URL=tu_supabase_url
REACT_APP_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### B. Backend (Node.js/Express)

1. **Actualizar `backend/package.json`:**

```json
{
  "scripts": {
    "start": "node src/app.js",
    "vercel-build": "echo 'Backend build complete'"
  }
}
```

2. **Crear `.env.production` en backend:**

```env
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_KEY=tu_supabase_service_key
JWT_SECRET=tu_jwt_secret
PORT=3001
```

## 🔐 Paso 3: Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega estas variables:

**Para el Frontend:**
- `REACT_APP_API_URL` → URL de tu backend en Vercel
- `REACT_APP_SUPABASE_URL` → URL de Supabase
- `REACT_APP_SUPABASE_ANON_KEY` → Anon key de Supabase

**Para el Backend:**
- `SUPABASE_URL` → URL de Supabase
- `SUPABASE_SERVICE_KEY` → Service key de Supabase
- `JWT_SECRET` → Tu secreto JWT
- `PORT` → 3001

## 📤 Paso 4: Subir a Vercel

### Opción 1: Desde la Web (Recomendado para principiantes)

1. **Crear repositorio en GitHub:**
   ```bash
   cd Juego_Progra3
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

2. **Importar en Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Click en "Add New Project"
   - Importa tu repositorio de GitHub
   - Configura las variables de entorno
   - Click en "Deploy"

### Opción 2: Con Vercel CLI

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd Juego_Progra3
   vercel
   ```

4. **Configurar proyecto:**
   - Project name: `juego-progra3`
   - Framework: `Create React App`
   - Build command: `cd frontend && npm run build`
   - Output directory: `frontend/build`

## ⚙️ Paso 5: Configuración Post-Deploy

### A. Actualizar CORS en Backend

En `backend/src/app.js`, actualiza CORS:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://tu-proyecto.vercel.app'
  ],
  credentials: true
}));
```

### B. Configurar Supabase

1. Ve a Supabase Dashboard → Settings → API
2. Agrega tu dominio de Vercel a "Site URL"
3. Agrega tu dominio a "Redirect URLs"

## 🧪 Paso 6: Verificar el Deploy

1. **Frontend:** `https://tu-proyecto.vercel.app`
2. **Backend API:** `https://tu-proyecto.vercel.app/api/health`
3. **Verificar:**
   - Login/Register funciona
   - Construcción de edificios funciona
   - Chat funciona
   - Mapa global funciona

## 🐛 Troubleshooting

### Error: "Module not found"
- Verifica que todas las dependencias estén en `package.json`
- Ejecuta `npm install` localmente

### Error: "CORS policy"
- Agrega tu dominio de Vercel a la configuración CORS del backend

### Error: "Environment variables not defined"
- Verifica que todas las variables estén configuradas en Vercel Dashboard
- Reinicia el deploy después de agregar variables

### Error: "Build failed"
- Revisa los logs en Vercel Dashboard
- Asegúrate que `npm run build` funcione localmente

## 📝 Estructura Final del Proyecto

```
Juego_Progra3/
├── .gitignore          # Ignorar node_modules, .env, etc.
├── vercel.json         # Configuración de Vercel
├── README.md           # Documentación principal
├── backend/
│   ├── package.json
│   ├── .env.production
│   └── src/
└── frontend/
    ├── package.json
    ├── .env.production
    ├── public/
    └── src/
```

## ✅ Checklist Final

- [ ] Archivos innecesarios eliminados
- [ ] `.gitignore` configurado
- [ ] Variables de entorno configuradas en Vercel
- [ ] `vercel.json` creado
- [ ] CORS actualizado en backend
- [ ] Repositorio Git creado
- [ ] Proyecto importado en Vercel
- [ ] Build exitoso
- [ ] Deploy verificado
- [ ] Supabase configurado con nuevo dominio

## 🎉 ¡Listo!

Tu juego ahora está en producción en Vercel.
