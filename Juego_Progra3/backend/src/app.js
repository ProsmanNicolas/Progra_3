// Archivo principal de Express
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middlewares globales
app.use(express.json());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  credentials: true
}));

// Middleware de debug para respuestas JSON
const responseDebugMiddleware = require('./middleware/responseDebugMiddleware');
app.use(responseDebugMiddleware);

// Middleware de logging detallado
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🌐 [${timestamp}] ${req.method} ${req.originalUrl}`);
  console.log(`📍 Path: ${req.path}`);
  
  if (req.params && Object.keys(req.params).length > 0) {
    console.log(`📋 Params:`, req.params);
  }
  
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(`🔍 Query:`, req.query);
  }
  
  console.log(`🔑 Auth: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  console.log(`─────────────────────────────────────────────────────`);
  
  next();
});

// --- Importar rutas ---
const authRoutes = require('./routes/authRoutes');
const villageRoutes = require('./routes/villageRoutes');
const mapRoutes = require('./routes/mapRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const troopRoutes = require('./routes/troopRoutes');
const chatRoutes = require('./routes/chatRoutes');

// --- Rutas ---
app.use('/api/auth', authRoutes);
app.use('/api/village', villageRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/troops', troopRoutes);
app.use('/api/chat', chatRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend Clash of Clans API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      village: '/api/village',
      map: '/api/map',
      resources: '/api/resources',
      troops: '/api/troops',
      chat: '/api/chat',
      status: 'OK'
    }
  });
});

// Endpoint para verificar el estado de la API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// Exportar la app para Vercel
module.exports = app;

// Solo iniciar servidor si NO está en Vercel (desarrollo local)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}
