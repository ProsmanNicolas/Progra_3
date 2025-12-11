// Script para ejecutar en la consola del navegador (F12)
// Este script limpiará completamente el estado de la aplicación

console.log('🧹 Limpiando completamente el estado de la aplicación...');

// 1. Limpiar localStorage
const localStorageKeys = Object.keys(localStorage);
console.log('🧹 Limpiando localStorage:', localStorageKeys);
localStorageKeys.forEach(key => {
  localStorage.removeItem(key);
});

// 2. Limpiar sessionStorage
const sessionStorageKeys = Object.keys(sessionStorage);
console.log('🧹 Limpiando sessionStorage:', sessionStorageKeys);
sessionStorageKeys.forEach(key => {
  sessionStorage.removeItem(key);
});

// 3. Limpiar cookies (si las hay)
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// 4. Limpiar caché de service worker (si existe)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

console.log('✅ Estado completamente limpio. Recargar la página (Ctrl+F5)');

// Función para recargar sin caché
function hardReload() {
  location.reload(true);
}

console.log('💡 Ejecuta: hardReload() para recargar sin caché');
