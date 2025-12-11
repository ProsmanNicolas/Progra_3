/**
 * Iconos centralizados de edificios
 * Cambiar aquí afectará todos los componentes que usen esta función
 */
export const getBuildingIcon = (buildingName) => {
  const icons = {
    'Ayuntamiento': '🏛️',
    'Casa': '🏠',
    'Cantera': '🪨',
    'Aserradero': '🪵',
    'Granja': '🌾',
    'Mina de Hierro': '⛏️',
    'Cuartel': '⚔️',
    'Torre de Defensa': '🗼',
    'Torre de Magos': '🔮',
    'Laboratorio': '🧪',
    'Muralla': '🧱',
    'Muro': '🧱',
    'Almacén': '📦'
  };
  return icons[buildingName] || '🏢';
};
