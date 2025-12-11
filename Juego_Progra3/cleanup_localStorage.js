// SCRIPT DE LIMPIEZA DEL NAVEGADOR
// Ejecutar esto en la consola del navegador (F12 > Console)

console.log('🧹 Limpiando localStorage problemático...');

// Obtener todos los keys relacionados con timestamps
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('last_active_') || key.includes('disconnect_time_'))) {
    keysToRemove.push(key);
  }
}

// Mostrar qué se va a eliminar
console.log('🔍 Keys encontrados para eliminar:', keysToRemove);

// Eliminar los keys problemáticos
keysToRemove.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`🗑️ Eliminando: ${key} = ${value}`);
  localStorage.removeItem(key);
});

console.log('✅ Limpieza completada. Recarga la página para un cálculo limpio.');

// Opcional: mostrar lo que queda en localStorage
console.log('📦 Contenido restante de localStorage:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`  ${key}: ${localStorage.getItem(key)}`);
}
