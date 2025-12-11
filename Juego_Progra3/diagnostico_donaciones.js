// Diagnóstico del sistema de donaciones
// Ejecutar desde la raíz del proyecto: node diagnostico_donaciones.js

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE DONACIONES\n');

// 1. Verificar archivos del backend
console.log('📂 VERIFICANDO ARCHIVOS DEL BACKEND:');
const backendFiles = [
  'backend/src/controllers/mapController.js',
  'backend/src/routes/mapRoutes.js',
  'database/create_resource_donations_table.sql'
];

backendFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// 2. Verificar archivos del frontend
console.log('\n📂 VERIFICANDO ARCHIVOS DEL FRONTEND:');
const frontendFiles = [
  'frontend/src/components/DonationHistory.jsx',
  'frontend/src/services/donationAPI.js',
  'frontend/src/services/mapAPI.js',
  'frontend/src/components/GlobalMapClean.jsx'
];

frontendFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// 3. Verificar configuración de rutas en el backend
console.log('\n🛣️  VERIFICANDO RUTAS DEL BACKEND:');
try {
  const mapRoutesContent = fs.readFileSync('backend/src/routes/mapRoutes.js', 'utf8');
  
  const routes = [
    'router.post(\'/donate\'',
    'router.get(\'/donations\'',
    'donateResources',
    'getUserDonations'
  ];
  
  routes.forEach(route => {
    const found = mapRoutesContent.includes(route);
    console.log(`${found ? '✅' : '❌'} ${route}`);
  });
  
} catch (error) {
  console.log('❌ Error leyendo mapRoutes.js:', error.message);
}

// 4. Verificar configuración de URLs en el frontend
console.log('\n🌐 VERIFICANDO URLs DEL FRONTEND:');
try {
  const donationAPIContent = fs.readFileSync('frontend/src/services/donationAPI.js', 'utf8');
  const mapAPIContent = fs.readFileSync('frontend/src/services/mapAPI.js', 'utf8');
  
  console.log('DonationAPI baseURL:', donationAPIContent.includes('${API_BASE_URL}/api/map') ? '✅ Correcto' : '❌ Incorrecto');
  console.log('MapAPI donateResources URL:', mapAPIContent.includes('${this.baseURL}/api/map/donate') ? '✅ Correcto' : '❌ Incorrecto');
  
} catch (error) {
  console.log('❌ Error leyendo archivos API:', error.message);
}

// 5. Verificar funciones críticas
console.log('\n⚙️  VERIFICANDO FUNCIONES CRÍTICAS:');
try {
  const mapControllerContent = fs.readFileSync('backend/src/controllers/mapController.js', 'utf8');
  
  const functions = [
    'const donateResources = async',
    'const getUserDonations = async',
    'normalizedDonations',
    'resource_donations'
  ];
  
  functions.forEach(func => {
    const found = mapControllerContent.includes(func);
    console.log(`${found ? '✅' : '❌'} ${func}`);
  });
  
} catch (error) {
  console.log('❌ Error leyendo mapController.js:', error.message);
}

console.log('\n📋 RESUMEN:');
console.log('- Si todos los elementos tienen ✅, el sistema debería funcionar');
console.log('- Si hay ❌, revisa los archivos correspondientes');
console.log('- Asegúrate de que los servidores estén corriendo en:');
console.log('  • Backend: http://localhost:3001');
console.log('  • Frontend: http://localhost:3000');

console.log('\n🔧 PASOS PARA PROBAR:');
console.log('1. cd backend && npm start');
console.log('2. cd frontend && npm start');
console.log('3. Crear usuario y aldea');
console.log('4. Intentar hacer una donación desde el mapa global');
console.log('5. Revisar el historial de donaciones');
