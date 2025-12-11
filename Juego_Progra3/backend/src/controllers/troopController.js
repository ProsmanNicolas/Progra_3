const supabase = require('../config/supabase');
const { recordBattleUtil } = require('./mapController');

// Obtener todos los tipos de tropas disponibles
const getTroopTypes = async (req, res) => {
  try {
    console.log('🪖 Obteniendo tipos de tropas disponibles');

    const { data, error } = await supabase
      .from('troop_types')
      .select('*')
      .order('category, power');

    if (error) {
      console.error('❌ Error obteniendo tipos de tropas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cargar tipos de tropas',
        error: error.message
      });
    }

    console.log(`✅ Tipos de tropas cargados: ${data?.length || 0}`);

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('❌ Error in getTroopTypes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener tropas del usuario
const getUserTroops = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('👥 Obteniendo tropas del usuario:', userId);

    const { data, error } = await supabase
      .from('user_troops')
      .select(`
        *,
        troop_types (*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error obteniendo tropas del usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cargar tropas del usuario',
        error: error.message
      });
    }

    console.log(`✅ Tropas del usuario cargadas: ${data?.length || 0}`);

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('❌ Error in getUserTroops:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Crear una tropa (entrenar)
const createTroop = async (req, res) => {
  try {
    const userId = req.user.id;
    const { troopTypeId } = req.body;

    console.log(`🏭 Usuario ${userId} creando tropa tipo:`, troopTypeId);

    if (!troopTypeId) {
      return res.status(400).json({
        success: false,
        message: 'ID de tipo de tropa requerido'
      });
    }

    // 1. OBTENER INFORMACIÓN DEL TIPO DE TROPA
    const { data: troopType, error: troopTypeError } = await supabase
      .from('troop_types')
      .select('*')
      .eq('id', troopTypeId)
      .single();

    if (troopTypeError || !troopType) {
      console.error('❌ Error obteniendo tipo de tropa:', troopTypeError);
      return res.status(404).json({
        success: false,
        message: 'Tipo de tropa no encontrado'
      });
    }

    // 2. VERIFICAR EDIFICIO REQUERIDO
    const { data: userBuildings, error: buildingsError } = await supabase
      .from('user_buildings')
      .select('building_type_id')
      .eq('user_id', userId)
      .eq('building_type_id', troopType.required_building_type_id);

    if (buildingsError) {
      console.error('❌ Error verificando edificios:', buildingsError);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar edificios requeridos'
      });
    }

    if (!userBuildings || userBuildings.length === 0) {
      const buildingName = troopType.required_building_type_id === 14 ? 'Cuartel' : 'Torre de Magos';
      return res.status(400).json({
        success: false,
        message: `Necesitas construir un ${buildingName} primero`
      });
    }

    // 3. OBTENER RECURSOS ACTUALES DEL USUARIO
    const { data: userResources, error: resourcesError } = await supabase
      .from('user_resources')
      .select('wood, stone, iron, food')
      .eq('user_id', userId)
      .single();

    if (resourcesError || !userResources) {
      console.error('❌ Error obteniendo recursos del usuario:', resourcesError);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar recursos'
      });
    }

    // 4. VALIDAR RECURSOS SUFICIENTES
    const costs = {
      wood: troopType.wood_cost || 0,
      stone: troopType.stone_cost || 0,
      iron: troopType.iron_cost || 0,
      food: troopType.food_cost || 0
    };

    const insufficientResources = [];
    Object.entries(costs).forEach(([resource, cost]) => {
      if (cost > 0 && (userResources[resource] || 0) < cost) {
        insufficientResources.push(`${resource}: necesitas ${cost}, tienes ${userResources[resource] || 0}`);
      }
    });

    if (insufficientResources.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Recursos insuficientes. ${insufficientResources.join(', ')}`
      });
    }

    // 5. CALCULAR NUEVOS RECURSOS
    const newResources = {
      wood: userResources.wood - costs.wood,
      stone: userResources.stone - costs.stone,
      iron: userResources.iron - costs.iron,
      food: userResources.food - costs.food,
      last_updated: userResources.last_updated // 🔒 Preservar timestamp para generación
    };

    // 6. ACTUALIZAR RECURSOS
    const { error: updateResourcesError } = await supabase
      .from('user_resources')
      .update(newResources)
      .eq('user_id', userId);

    if (updateResourcesError) {
      console.error('❌ Error actualizando recursos:', updateResourcesError);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar recursos'
      });
    }

    // 7. OBTENER CANTIDAD ACTUAL DE TROPAS
    const { data: existingTroop, error: existingTroopError } = await supabase
      .from('user_troops')
      .select('quantity')
      .eq('user_id', userId)
      .eq('troop_type_id', troopTypeId)
      .single();

    let troopOperation;
    const currentQuantity = existingTroop?.quantity || 0;
    const newQuantity = currentQuantity + 1;

    if (currentQuantity === 0) {
      // Crear nuevo registro
      troopOperation = supabase
        .from('user_troops')
        .insert({
          user_id: userId,
          troop_type_id: troopTypeId,
          quantity: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } else {
      // Actualizar cantidad existente
      troopOperation = supabase
        .from('user_troops')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('troop_type_id', troopTypeId);
    }

    const { error: troopError } = await troopOperation;

    if (troopError) {
      console.error('❌ Error creando/actualizando tropa:', troopError);
      // TODO: Revertir cambios en recursos
      return res.status(500).json({
        success: false,
        message: 'Error al crear la tropa'
      });
    }

    console.log(`✅ Tropa creada exitosamente. Nueva cantidad: ${newQuantity}`);

    res.json({
      success: true,
      message: `${troopType.name} entrenada exitosamente`,
      data: {
        newResources,
        troopTypeId,
        newQuantity,
        costs
      }
    });

  } catch (error) {
    console.error('❌ Error in createTroop:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar una tropa
const deleteTroop = async (req, res) => {
  try {
    const userId = req.user.id;
    const { troopTypeId } = req.body;

    console.log(`🗑️ Usuario ${userId} eliminando tropa tipo:`, troopTypeId);

    if (!troopTypeId) {
      return res.status(400).json({
        success: false,
        message: 'ID de tipo de tropa requerido'
      });
    }

    // 1. OBTENER CANTIDAD ACTUAL
    const { data: existingTroop, error: existingTroopError } = await supabase
      .from('user_troops')
      .select('quantity')
      .eq('user_id', userId)
      .eq('troop_type_id', troopTypeId)
      .single();

    if (existingTroopError || !existingTroop || existingTroop.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No tienes tropas de este tipo para eliminar'
      });
    }

    const newQuantity = existingTroop.quantity - 1;

    let troopOperation;

    if (newQuantity === 0) {
      // Eliminar registro
      troopOperation = supabase
        .from('user_troops')
        .delete()
        .eq('user_id', userId)
        .eq('troop_type_id', troopTypeId);
    } else {
      // Actualizar cantidad
      troopOperation = supabase
        .from('user_troops')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('troop_type_id', troopTypeId);
    }

    const { error: troopError } = await troopOperation;

    if (troopError) {
      console.error('❌ Error eliminando tropa:', troopError);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar la tropa'
      });
    }

    console.log(`✅ Tropa eliminada exitosamente. Nueva cantidad: ${newQuantity}`);

    res.json({
      success: true,
      message: 'Tropa eliminada exitosamente',
      data: {
        troopTypeId,
        newQuantity
      }
    });

  } catch (error) {
    console.error('❌ Error in deleteTroop:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener poder defensivo del usuario
const getUserDefensePower = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🛡️ Obteniendo poder defensivo del usuario:', userId);

    // 1. Obtener poder defensivo de tropas asignadas (vistas user_defense_power)
    const { data, error } = await supabase
      .from('user_defense_power')
      .select('total_defense_power')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error obteniendo poder defensivo de tropas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener poder defensivo',
        error: error.message
      });
    }

    const troopDefensePower = data?.total_defense_power || 0;
    console.log(`🪖 Poder defensivo de tropas: ${troopDefensePower}`);

    // 2. Calcular poder defensivo de los muros
    // Obtener building_type_id del Muro
    const { data: muroType, error: muroTypeError } = await supabase
      .from('building_types')
      .select('id')
      .eq('name', 'Muro')
      .single();

    let wallDefensePower = 0;
    
    if (muroType && !muroTypeError) {
      // Obtener todos los muros del usuario con su nivel
      const { data: userWalls, error: wallsError } = await supabase
        .from('user_buildings')
        .select('level')
        .eq('user_id', userId)
        .eq('building_type_id', muroType.id);

      if (userWalls && !wallsError) {
        // Cada muro aporta 10 puntos de defensa por nivel
        // Ejemplo: Muro nivel 1 = 10, nivel 2 = 20, nivel 3 = 30
        wallDefensePower = userWalls.reduce((total, wall) => {
          return total + (wall.level * 10);
        }, 0);
        
        console.log(`🧱 Poder defensivo de muros: ${wallDefensePower} (${userWalls.length} muros)`);
      }
    }

    // 3. Sumar poder defensivo total
    const totalDefensePower = troopDefensePower + wallDefensePower;
    console.log(`✅ Poder defensivo total: ${totalDefensePower} (tropas: ${troopDefensePower} + muros: ${wallDefensePower})`);

    res.json({
      success: true,
      data: {
        defensePower: totalDefensePower,
        troopDefensePower,
        wallDefensePower
      }
    });

  } catch (error) {
    console.error('❌ Error in getUserDefensePower:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Asignar tropas a defensa
const assignTroopsToDefense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { buildingId, assignments } = req.body; // buildingId de la torre y objeto con asignaciones

    console.log('🛡️ Asignando tropas a defensa para usuario:', userId, 'torre:', buildingId);

    if (!buildingId || !assignments || typeof assignments !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Datos de asignación inválidos'
      });
    }

    // Verificar que el edificio pertenece al usuario
    const { data: building, error: buildingError } = await supabase
      .from('user_buildings')
      .select('id, building_type_id')
      .eq('id', buildingId)
      .eq('user_id', userId)
      .single();

    if (buildingError || !building) {
      return res.status(404).json({
        success: false,
        message: 'Torre de defensa no encontrada'
      });
    }

    // Verificar que es una Torre de Defensa (building_type_id = 17)
    if (building.building_type_id !== 17) {
      return res.status(400).json({
        success: false,
        message: 'El edificio no es una Torre de Defensa'
      });
    }

    // Validar que el usuario tiene las tropas suficientes
    const { data: userTroops, error: troopsError } = await supabase
      .from('user_troops')
      .select('troop_type_id, quantity')
      .eq('user_id', userId);

    if (troopsError) {
      console.error('❌ Error obteniendo tropas del usuario:', troopsError);
      return res.status(500).json({
        success: false,
        message: 'Error verificando tropas disponibles'
      });
    }

    // Convertir tropas del usuario a objeto para fácil acceso
    const userTroopsMap = {};
    userTroops.forEach(troop => {
      userTroopsMap[troop.troop_type_id] = troop.quantity;
    });

    // Obtener asignaciones actuales de todas las torres del usuario (excluyendo la torre actual)
    const { data: currentAssignments, error: assignmentsError } = await supabase
      .from('defense_assignments')
      .select('troop_type_id, quantity')
      .eq('user_id', userId)
      .neq('building_id', buildingId);

    if (assignmentsError) {
      console.error('❌ Error obteniendo asignaciones actuales:', assignmentsError);
      return res.status(500).json({
        success: false,
        message: 'Error verificando asignaciones actuales'
      });
    }

    // Calcular tropas actualmente asignadas en otras torres
    const totalAssignedTroops = {};
    currentAssignments.forEach(assignment => {
      const troopTypeId = assignment.troop_type_id;
      totalAssignedTroops[troopTypeId] = (totalAssignedTroops[troopTypeId] || 0) + assignment.quantity;
    });

    // Validar que las nuevas asignaciones no excedan las tropas disponibles
    for (const [troopTypeId, quantity] of Object.entries(assignments)) {
      const troopTypeIdNum = parseInt(troopTypeId);
      const availableTroops = userTroopsMap[troopTypeIdNum] || 0;
      const currentlyAssigned = totalAssignedTroops[troopTypeIdNum] || 0;
      const remainingTroops = availableTroops - currentlyAssigned;
      
      if (quantity > remainingTroops) {
        return res.status(400).json({
          success: false,
          message: `No tienes suficientes tropas del tipo ${troopTypeId}. Disponibles: ${remainingTroops}`
        });
      }
    }

    // Primero eliminar asignaciones existentes para esta torre
    const { error: deleteError } = await supabase
      .from('defense_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('building_id', buildingId);

    if (deleteError) {
      console.error('❌ Error eliminando asignaciones previas:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando asignaciones'
      });
    }

    // Insertar nuevas asignaciones
    const newAssignments = [];
    for (const [troopTypeId, quantity] of Object.entries(assignments)) {
      if (quantity > 0) {
        newAssignments.push({
          user_id: userId,
          building_id: buildingId,
          troop_type_id: parseInt(troopTypeId),
          quantity: quantity
        });
      }
    }

    if (newAssignments.length > 0) {
      const { error: insertError } = await supabase
        .from('defense_assignments')
        .insert(newAssignments);

      if (insertError) {
        console.error('❌ Error insertando nuevas asignaciones:', insertError);
        return res.status(500).json({
          success: false,
          message: 'Error guardando asignaciones de tropas'
        });
      }
    }

    console.log('✅ Asignación de tropas guardada exitosamente');

    res.json({
      success: true,
      message: 'Tropas asignadas a la defensa exitosamente',
      data: { buildingId, assignments }
    });

  } catch (error) {
    console.error('❌ Error in assignTroopsToDefense:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener asignaciones de tropas para una torre específica
const getTowerDefenseAssignments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { buildingId } = req.params;

    console.log('🏰 Obteniendo asignaciones de torre:', buildingId, 'para usuario:', userId);

    if (!buildingId) {
      return res.status(400).json({
        success: false,
        message: 'ID de edificio requerido'
      });
    }

    // Obtener asignaciones específicas de la torre
    const { data: assignments, error } = await supabase
      .from('defense_assignments')
      .select('troop_type_id, quantity')
      .eq('user_id', userId)
      .eq('building_id', buildingId);

    if (error) {
      console.error('❌ Error obteniendo asignaciones de torre:', error);
      return res.status(500).json({
        success: false,
        message: 'Error cargando asignaciones de defensa'
      });
    }

    // Convertir las asignaciones a formato objeto que espera el frontend
    const assignedTroops = {};
    if (assignments && assignments.length > 0) {
      assignments.forEach(assignment => {
        assignedTroops[assignment.troop_type_id] = assignment.quantity;
      });
    }

    console.log('✅ Asignaciones de torre cargadas:', assignedTroops);

    res.json({
      success: true,
      data: { assignedTroops }
    });

  } catch (error) {
    console.error('❌ Error in getTowerDefenseAssignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener todas las asignaciones de defensa del usuario
const getAllDefenseAssignments = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🛡️ Obteniendo todas las asignaciones de defensa para usuario:', userId);

    // Obtener todas las asignaciones de defensa del usuario
    const { data: assignments, error } = await supabase
      .from('defense_assignments')
      .select('troop_type_id, quantity')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error obteniendo asignaciones de defensa:', error);
      return res.status(500).json({
        success: false,
        message: 'Error cargando asignaciones de defensa'
      });
    }

    // Sumar las cantidades por tipo de tropa
    const totalAssignments = {};
    if (assignments && assignments.length > 0) {
      assignments.forEach(assignment => {
        const troopTypeId = assignment.troop_type_id;
        if (!totalAssignments[troopTypeId]) {
          totalAssignments[troopTypeId] = 0;
        }
        totalAssignments[troopTypeId] += assignment.quantity;
      });
    }

    console.log('✅ Todas las asignaciones de defensa cargadas:', totalAssignments);

    res.json({
      success: true,
      data: { assignments: totalAssignments }
    });

  } catch (error) {
    console.error('❌ Error in getAllDefenseAssignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener poder defensivo de un usuario específico (para ataques)
const getTargetDefensePower = async (req, res) => {
  try {
    const { targetUserId } = req.params;

    console.log('🎯 Obteniendo poder defensivo del objetivo:', targetUserId);

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario objetivo requerido'
      });
    }

    // Obtener todas las asignaciones de defensa del usuario objetivo
    // BYPASS RLS usando rpc o query directa
    console.log('🔍 Consultando defense_assignments para user_id:', targetUserId);
    console.log('🔍 Tipo de targetUserId:', typeof targetUserId);
    console.log('🔍 targetUserId length:', targetUserId?.length);
    
    // Usar .rpc() para bypass RLS completamente
    const { data: assignments, error } = await supabase.rpc('get_defense_assignments_for_target', {
      target_user_id: targetUserId
    });

    console.log('🔍 Asignaciones encontradas (via RPC):', assignments);
    console.log('🔍 Array length:', assignments?.length);
    console.log('🔍 Error:', error);

    if (error) {
      console.error('❌ Error obteniendo asignaciones defensivas del objetivo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error cargando poder defensivo del objetivo'
      });
    }

    // Obtener todos los tipos de tropas para calcular poder
    const { data: troopTypes, error: troopTypesError } = await supabase
      .from('troop_types')
      .select('id, power');

    if (troopTypesError) {
      console.error('❌ Error obteniendo tipos de tropas:', troopTypesError);
      return res.status(500).json({
        success: false,
        message: 'Error cargando tipos de tropas'
      });
    }

    // Crear un mapa de tipos de tropas para fácil acceso
    const troopPowerMap = {};
    troopTypes.forEach(type => {
      troopPowerMap[type.id] = type.power;
    });

    console.log('🗺️ Mapa de poder de tropas:', troopPowerMap);

    // Calcular poder defensivo total
    let totalDefensePower = 0;
    if (assignments && assignments.length > 0) {
      console.log('📊 Calculando poder defensivo con', assignments.length, 'asignaciones:');
      assignments.forEach(assignment => {
        const troopPower = troopPowerMap[assignment.troop_type_id] || 0;
        const quantity = assignment.quantity;
        const powerContribution = troopPower * quantity;
        console.log(`  - Tipo ${assignment.troop_type_id}: ${quantity} tropas × ${troopPower} poder = ${powerContribution}`);
        totalDefensePower += powerContribution;
      });
    } else {
      console.log('⚠️ No se encontraron asignaciones defensivas para el usuario:', targetUserId);
    }

    console.log('✅ Poder defensivo total calculado:', totalDefensePower);

    // Agregar poder defensivo de muros
    const { data: muroType, error: muroTypeError } = await supabase
      .from('building_types')
      .select('id')
      .eq('name', 'Muro')
      .single();

    let wallDefensePower = 0;
    
    if (muroType && !muroTypeError) {
      const { data: targetWalls, error: wallsError } = await supabase
        .from('user_buildings')
        .select('level')
        .eq('user_id', targetUserId)
        .eq('building_type_id', muroType.id);

      if (targetWalls && !wallsError) {
        wallDefensePower = targetWalls.reduce((total, wall) => {
          return total + (wall.level * 10);
        }, 0);
        
        console.log(`🧱 Poder defensivo de muros del objetivo: ${wallDefensePower} (${targetWalls.length} muros)`);
      }
    }

    const finalDefensePower = totalDefensePower + wallDefensePower;
    console.log(`✅ Poder defensivo final (tropas + muros): ${finalDefensePower}`);

    res.json({
      success: true,
      data: {
        defensePower: finalDefensePower,
        basePower: totalDefensePower,
        wallPower: wallDefensePower,
        defensiveBonus: 0
      }
    });

  } catch (error) {
    console.error('❌ Error in getTargetDefensePower:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Ejecutar batalla
const executeBattle = async (req, res) => {
  try {
    const attackerId = req.user.id;
    const { defenderId, attackingTroops } = req.body;

    console.log(`⚔️ Iniciando batalla: ${attackerId} vs ${defenderId}`);
    console.log('🪖 Tropas atacantes:', attackingTroops);

    if (!defenderId) {
      return res.status(400).json({
        success: false,
        message: 'ID del defensor requerido'
      });
    }

    if (!attackingTroops || Object.keys(attackingTroops).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tropas atacantes requeridas'
      });
    }

    if (attackerId === defenderId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes atacarte a ti mismo'
      });
    }

    // 1. Verificar que el atacante tiene las tropas que quiere usar
    const { data: attackerTroops, error: attackerTroopsError } = await supabase
      .from('user_troops')
      .select('troop_type_id, quantity')
      .eq('user_id', attackerId);

    if (attackerTroopsError) {
      console.error('❌ Error obteniendo tropas del atacante:', attackerTroopsError);
      return res.status(500).json({
        success: false,
        message: 'Error verificando tropas del atacante'
      });
    }

    // Validar que el atacante tiene suficientes tropas
    const attackerTroopsMap = {};
    attackerTroops.forEach(troop => {
      attackerTroopsMap[troop.troop_type_id] = troop.quantity;
    });

    for (const [troopTypeId, quantity] of Object.entries(attackingTroops)) {
      if (quantity > 0) {
        const availableTroops = attackerTroopsMap[parseInt(troopTypeId)] || 0;
        if (quantity > availableTroops) {
          return res.status(400).json({
            success: false,
            message: `No tienes suficientes tropas del tipo ${troopTypeId}`
          });
        }
      }
    }

    // 2. Calcular poder de ataque
    const { data: troopTypes, error: troopTypesError } = await supabase
      .from('troop_types')
      .select('id, power');

    if (troopTypesError) {
      console.error('❌ Error obteniendo tipos de tropas:', troopTypesError);
      return res.status(500).json({
        success: false,
        message: 'Error cargando tipos de tropas'
      });
    }

    const troopTypesMap = {};
    troopTypes.forEach(type => {
      troopTypesMap[type.id] = type.power;
    });

    let attackPower = 0;
    for (const [troopTypeId, quantity] of Object.entries(attackingTroops)) {
      if (quantity > 0) {
        const troopPower = troopTypesMap[parseInt(troopTypeId)] || 0;
        attackPower += troopPower * quantity;
      }
    }

    console.log('⚔️ Poder de ataque calculado:', attackPower);

    // 3. Calcular poder defensivo del defensor
    const { data: defenderAssignments, error: defenderAssignmentsError } = await supabase
      .from('defense_assignments')
      .select('troop_type_id, quantity')
      .eq('user_id', defenderId);

    if (defenderAssignmentsError) {
      console.error('❌ Error obteniendo defensas del defensor:', defenderAssignmentsError);
      return res.status(500).json({
        success: false,
        message: 'Error verificando defensas del defensor'
      });
    }

    let defensePower = 0;
    defenderAssignments.forEach(assignment => {
      const troopPower = troopTypesMap[assignment.troop_type_id] || 0;
      defensePower += troopPower * assignment.quantity;
    });

    console.log('🛡️ Poder defensivo calculado:', defensePower);

    // 4. Determinar resultado de la batalla
    const battleResult = attackPower >= defensePower ? 'victory' : 'defeat';
    const powerDifference = Math.abs(attackPower - defensePower);
    
    // 5. Calcular pérdidas (siempre hay pérdidas, pero menos si ganas por mucho)
    const lossPercentage = battleResult === 'victory' 
      ? Math.max(0.1, 0.5 - (powerDifference / (attackPower + defensePower))) // 10-50% pérdidas si ganas
      : Math.max(0.5, 0.8 + (powerDifference / (attackPower + defensePower))); // 50-80% pérdidas si pierdes

    // 6. Aplicar pérdidas a las tropas del atacante
    const troopLosses = {};
    for (const [troopTypeId, quantity] of Object.entries(attackingTroops)) {
      if (quantity > 0) {
        const losses = Math.floor(quantity * lossPercentage);
        troopLosses[troopTypeId] = losses;
        
        // Actualizar tropas del atacante
        const newQuantity = attackerTroopsMap[parseInt(troopTypeId)] - losses;
        
        if (newQuantity <= 0) {
          // Eliminar la tropa si no quedan
          await supabase
            .from('user_troops')
            .delete()
            .eq('user_id', attackerId)
            .eq('troop_type_id', parseInt(troopTypeId));
        } else {
          // Actualizar cantidad
          await supabase
            .from('user_troops')
            .update({ quantity: newQuantity })
            .eq('user_id', attackerId)
            .eq('troop_type_id', parseInt(troopTypeId));
        }
      }
    }

    // 7. Si el atacante gana, obtener recursos del defensor
    let resourcesStolen = { wood: 0, stone: 0, iron: 0, food: 0 };
    
    if (battleResult === 'victory') {
      const { data: defenderResources, error: defenderResourcesError } = await supabase
        .from('user_resources')
        .select('wood, stone, iron, food')
        .eq('user_id', defenderId)
        .single();

      if (!defenderResourcesError && defenderResources) {
        // Robar 5-15% de los recursos del defensor
        const stealPercentage = 0.05 + (powerDifference / (attackPower + defensePower)) * 0.1;
        
        resourcesStolen = {
          wood: Math.floor(defenderResources.wood * stealPercentage),
          stone: Math.floor(defenderResources.stone * stealPercentage),
          iron: Math.floor(defenderResources.iron * stealPercentage),
          food: Math.floor(defenderResources.food * stealPercentage)
        };

        // Actualizar recursos del defensor (quitar recursos robados)
        await supabase
          .from('user_resources')
          .update({
            wood: Math.max(0, defenderResources.wood - resourcesStolen.wood),
            stone: Math.max(0, defenderResources.stone - resourcesStolen.stone),
            iron: Math.max(0, defenderResources.iron - resourcesStolen.iron),
            food: Math.max(0, defenderResources.food - resourcesStolen.food)
          })
          .eq('user_id', defenderId);

        // Agregar recursos robados al atacante
        const { data: attackerResources } = await supabase
          .from('user_resources')
          .select('wood, stone, iron, food')
          .eq('user_id', attackerId)
          .single();

        if (attackerResources) {
          await supabase
            .from('user_resources')
            .update({
              wood: attackerResources.wood + resourcesStolen.wood,
              stone: attackerResources.stone + resourcesStolen.stone,
              iron: attackerResources.iron + resourcesStolen.iron,
              food: attackerResources.food + resourcesStolen.food
            })
            .eq('user_id', attackerId);
        }
      }
    }

    console.log(`🏆 Batalla completada: ${battleResult}, pérdidas: ${JSON.stringify(troopLosses)}, recursos robados: ${JSON.stringify(resourcesStolen)}`);

    // Registrar la batalla en el historial
    try {
      const battleRecord = await recordBattleUtil({
        attacker_id: attackerId,
        defender_id: defenderId,
        attacker_village_name: 'Mi Aldea',
        defender_village_name: 'Aldea Enemiga',
        attacker_power: attackPower,
        defender_power: defensePower,
        attacker_wins: battleResult === 'victory',
        stolen_wood: resourcesStolen.wood,
        stolen_stone: resourcesStolen.stone,
        stolen_food: resourcesStolen.food,
        stolen_iron: resourcesStolen.iron,
        attacker_troop_losses: troopLosses,
        defender_troop_losses: {}, // Por ahora vacío, el defensor no pierde tropas en esta implementación
        attacking_troops: attackingTroops,
        notes: null
      });
      
      if (battleRecord.success) {
        console.log('✅ Batalla registrada en historial exitosamente');
      } else {
        console.error('⚠️ Error registrando batalla en historial:', battleRecord.error);
      }
    } catch (historyError) {
      console.error('⚠️ Error al intentar registrar batalla en historial:', historyError);
      // No fallar la batalla por error de historial
    }

    res.json({
      success: true,
      message: `Batalla ${battleResult === 'victory' ? 'ganada' : 'perdida'}`,
      data: {
        result: battleResult,
        attackPower,
        defensePower,
        troopLosses,
        resourcesStolen,
        lossPercentage: Math.round(lossPercentage * 100)
      }
    });

  } catch (error) {
    console.error('❌ Error in executeBattle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// ========================================
// NUEVOS ENDPOINTS - LÓGICA DE VALIDACIÓN
// ========================================

/**
 * Validar si el usuario puede costear el entrenamiento de tropas
 */
const canAffordTroops = async (req, res) => {
  try {
    const userId = req.user.id;
    const { troopTypeId, quantity } = req.body;

    if (!troopTypeId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'troopTypeId y quantity son requeridos'
      });
    }

    // Obtener tipo de tropa
    const { data: troopType, error: troopError } = await supabase
      .from('troop_types')
      .select('*')
      .eq('id', troopTypeId)
      .single();

    if (troopError || !troopType) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de tropa no encontrado'
      });
    }

    // Obtener recursos del usuario
    const { data: userResources, error: resourcesError } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (resourcesError) {
      return res.status(404).json({
        success: false,
        message: 'Recursos del usuario no encontrados'
      });
    }

    // Calcular costo total
    const totalCost = {
      wood: troopType.wood_cost * quantity,
      stone: troopType.stone_cost * quantity,
      food: troopType.food_cost * quantity,
      iron: troopType.iron_cost * quantity
    };

    // Validar si puede costear
    const canAfford = 
      userResources.wood >= totalCost.wood &&
      userResources.stone >= totalCost.stone &&
      userResources.food >= totalCost.food &&
      userResources.iron >= totalCost.iron;

    res.json({
      success: true,
      data: {
        canAfford,
        totalCost,
        currentResources: {
          wood: userResources.wood,
          stone: userResources.stone,
          food: userResources.food,
          iron: userResources.iron
        },
        missing: canAfford ? null : {
          wood: Math.max(0, totalCost.wood - userResources.wood),
          stone: Math.max(0, totalCost.stone - userResources.stone),
          food: Math.max(0, totalCost.food - userResources.food),
          iron: Math.max(0, totalCost.iron - userResources.iron)
        }
      }
    });

  } catch (error) {
    console.error('Error in canAffordTroops:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Calcular poder de ataque total de tropas seleccionadas
 */
const calculateAttackPower = async (req, res) => {
  try {
    const { selectedTroops } = req.body; // { troopTypeId: quantity }

    if (!selectedTroops || typeof selectedTroops !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'selectedTroops es requerido (objeto con troopTypeId: quantity)'
      });
    }

    let totalPower = 0;
    const troopDetails = [];

    // Obtener todos los tipos de tropas necesarios
    const troopTypeIds = Object.keys(selectedTroops).map(id => parseInt(id));
    
    const { data: troopTypes, error } = await supabase
      .from('troop_types')
      .select('*')
      .in('id', troopTypeIds);

    if (error) {
      throw error;
    }

    // Calcular poder total
    for (const [troopTypeId, quantity] of Object.entries(selectedTroops)) {
      const troopType = troopTypes.find(t => t.id === parseInt(troopTypeId));
      if (troopType && quantity > 0) {
        const power = troopType.power * quantity;
        totalPower += power;
        troopDetails.push({
          troopTypeId: parseInt(troopTypeId),
          name: troopType.name,
          quantity,
          powerPerUnit: troopType.power,
          totalPower: power
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalPower,
        troopDetails,
        totalTroops: Object.values(selectedTroops).reduce((sum, qty) => sum + qty, 0)
      }
    });

  } catch (error) {
    console.error('Error in calculateAttackPower:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener tropas disponibles para ataque (total - asignadas a defensa)
 */
const getAvailableForAttack = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener todas las tropas del usuario
    const { data: userTroops, error: troopsError } = await supabase
      .from('user_troops')
      .select('*, troop_types(*)')
      .eq('user_id', userId);

    if (troopsError) {
      throw troopsError;
    }

    // Obtener asignaciones de defensa
    const { data: defenseAssignments, error: defenseError } = await supabase
      .from('defense_assignments')
      .select('*')
      .eq('user_id', userId);

    if (defenseError && defenseError.code !== 'PGRST116') {
      throw defenseError;
    }

    // Calcular tropas disponibles para ataque
    const availableTroops = userTroops.map(troop => {
      const assignedToDefense = defenseAssignments?.find(
        d => d.troop_type_id === troop.troop_type_id
      )?.quantity || 0;

      const availableForAttack = troop.quantity - assignedToDefense;

      return {
        troopTypeId: troop.troop_type_id,
        troopName: troop.troop_types?.name,
        totalQuantity: troop.quantity,
        assignedToDefense,
        availableForAttack: Math.max(0, availableForAttack),
        power: troop.troop_types?.power || 0
      };
    });

    res.json({
      success: true,
      data: availableTroops
    });

  } catch (error) {
    console.error('Error in getAvailableForAttack:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener categorías de tropas (barracas vs magia)
 */
const getTroopCategories = async (req, res) => {
  try {
    const { data: troopTypes, error } = await supabase
      .from('troop_types')
      .select('id, name, category');

    if (error) {
      throw error;
    }

    // Separar por categoría
    const barracks = troopTypes.filter(t => t.category === 'barracks');
    const magic = troopTypes.filter(t => t.category === 'magic');

    // También crear mapeo de nombre a categoría
    const categoryMap = {};
    troopTypes.forEach(t => {
      categoryMap[t.name] = t.category;
    });

    res.json({
      success: true,
      data: {
        barracks: barracks.map(t => t.name),
        magic: magic.map(t => t.name),
        categoryMap,
        allTypes: troopTypes
      }
    });

  } catch (error) {
    console.error('Error in getTroopCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  // 🎖️ Tipos de Tropas - Obtener catálogo de todos los tipos de tropas disponibles (soldado, arquero, etc.)
  getTroopTypes,
  
  // ⚔️ Tropas del Usuario - Obtener todas las tropas que posee el usuario actual
  getUserTroops,
  
  // ➕ Crear Tropa - Agregar nueva tropa al inventario del usuario
  createTroop,
  
  // ➖ Eliminar Tropa - Remover tropa del inventario del usuario
  deleteTroop,
  
  // 🛡️ Poder Defensivo Usuario - Calcular poder total de defensa del usuario (tropas asignadas)
  getUserDefensePower,
  
  // 🏰 Asignar Defensa - Asignar tropas a la defensa de edificios específicos
  assignTroopsToDefense,
  
  // 🗼 Asignaciones Torre - Obtener tropas asignadas a una torre de defensa específica
  getTowerDefenseAssignments,
  
  // 📊 Todas las Asignaciones - Ver todas las asignaciones defensivas del usuario
  getAllDefenseAssignments,
  
  // 🎯 Poder Defensivo Objetivo - Calcular poder defensivo de un objetivo/enemigo específico
  getTargetDefensePower,
  
  // ⚡ Ejecutar Batalla - Procesar combate entre atacante y defensor, calcular ganador
  executeBattle,
  
  // 📊 NUEVOS ENDPOINTS - LÓGICA DE VALIDACIÓN
  canAffordTroops,
  calculateAttackPower,
  getAvailableForAttack,
  getTroopCategories
};
