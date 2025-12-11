// Script de diagnóstico para verificar el estado de las tablas
// Ejecutar este código en la consola del navegador

const verificarTablas = async () => {
  console.log('🔍 VERIFICANDO ESTADO DE TABLAS...');
  
  try {
    // 1. Verificar tabla villages
    console.log('1. Verificando tabla villages...');
    const { data: villages, error: villagesError } = await supabase
      .from('villages')
      .select('*')
      .limit(3);
    
    console.log('Villages:', villages);
    console.log('Villages Error:', villagesError);
    
    // 2. Verificar tabla resources  
    console.log('2. Verificando tabla resources...');
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('*')
      .limit(3);
    
    console.log('Resources:', resources);
    console.log('Resources Error:', resourcesError);
    
    // 3. Verificar tabla user_resources (si existe)
    console.log('3. Verificando tabla user_resources...');
    const { data: userResources, error: userResourcesError } = await supabase
      .from('user_resources')
      .select('*')
      .limit(3);
    
    console.log('User Resources:', userResources);
    console.log('User Resources Error:', userResourcesError);
    
    // 4. Verificar relación entre villages y resources
    if (villages && villages.length > 0) {
      console.log('4. Verificando relación villages -> resources...');
      const villageId = villages[0].id;
      console.log('Usando village_id:', villageId, 'tipo:', typeof villageId);
      
      const { data: relatedResources, error: relatedError } = await supabase
        .from('resources')
        .select('*')
        .eq('village_id', villageId);
      
      console.log('Related Resources:', relatedResources);
      console.log('Related Error:', relatedError);
    }
    
  } catch (error) {
    console.error('Error en verificación:', error);
  }
};

// Ejecutar la función
verificarTablas();
