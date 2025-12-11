/**
 * Iconos centralizados de tropas
 * Cambiar aquí afectará todos los componentes que usen esta función
 */
export const getTroopIcon = (troopName) => {
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
  return icons[troopName] || '🪖';
};
