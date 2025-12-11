// Diagnóstico rápido para verificar edificios duplicados
// Pegar este código en la consola del navegador mientras el juego está ejecutándose

console.log('🔍 DIAGNÓSTICO DE EDIFICIOS:');
console.log('================================');

// Verificar si hay datos de usuario y edificios disponibles en el contexto global
if (window.userBuildings || window.user) {
    console.log('📋 Edificios encontrados en window:', window.userBuildings?.length || 'No encontrado');
    
    if (window.userBuildings && Array.isArray(window.userBuildings)) {
        const resourceGenerators = window.userBuildings.filter(
            building => building.building_type?.type === 'resource_generator'
        );
        
        console.log('🏭 Total de generadores de recursos:', resourceGenerators.length);
        
        // Agrupar por tipo de recurso
        const byResource = {};
        resourceGenerators.forEach(building => {
            const resourceType = building.building_type.resource_type;
            if (!byResource[resourceType]) byResource[resourceType] = [];
            byResource[resourceType].push(building);
        });
        
        Object.keys(byResource).forEach(resourceType => {
            console.log(`${resourceType.toUpperCase()}: ${byResource[resourceType].length} edificios`);
            byResource[resourceType].forEach((building, index) => {
                console.log(`  ${index + 1}. ${building.building_type.name} (ID: ${building.id}) en posición ${building.x},${building.y}`);
            });
        });
    }
} else {
    console.log('❌ No se encontraron datos de edificios en window');
    console.log('💡 Ejecutar este código desde la pestaña del juego cuando esté cargado');
}

// También verificar localStorage
console.log('🗃️ localStorage keys relacionados con user:', 
    Object.keys(localStorage).filter(key => key.includes('user') || key.includes('4d62d515')));

console.log('================================');
