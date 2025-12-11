/**
 * Iconos centralizados de tropas
 * Cambiar aquí afectará todos los componentes que usen esta función
 */
export const getTroopIcon = (troopName) => {
  // Normalizar el nombre: trim y capitalizar primera letra
  const normalizedName = troopName?.toString().trim();
  
  const icons = {
    'Soldado': '⚔️',
    'Arquero': '🏹',
    'Jinete': '🐎',
    'Cañón': '💣',
    'Mago': '🧙‍♂️',
    'Bruja': '🧙‍♀️',
    'Fantasma': '👻',
    'Esqueleto': '💀'
  };
  
  // Buscar coincidencia exacta primero
  if (icons[normalizedName]) {
    return icons[normalizedName];
  }
  
  // Buscar coincidencia insensible a mayúsculas/minúsculas
  const lowerName = normalizedName?.toLowerCase();
  for (const [key, value] of Object.entries(icons)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // Icono por defecto si no se encuentra
  console.warn('Icono de tropa no encontrado para:', troopName);
  return '🪖';
};

