const supabase = require('../config/supabase');

/**
 * Controlador para gestión de usuarios, aldeas y mapas
 */

// Obtener perfil de usuario completo
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Obtener aldea del usuario
    const { data: villageData, error: villageError } = await supabase
      .from('villages')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Si no tiene aldea, la creamos
    let village = villageData;
    if (villageError && villageError.code === 'PGRST116') {
      const { data: newVillage, error: createError } = await supabase
        .from('villages')
        .insert({
          user_id: userId,
          village_name: `Aldea de ${userData.username || userData.email}`,
          position_x: Math.floor(Math.random() * 1000) - 500,
          position_y: Math.floor(Math.random() * 1000) - 500,
          description: 'Nueva aldea',
          level: 1
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating village:', createError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al crear aldea' 
        });
      }
      village = newVillage;

      // Crear Ayuntamiento automáticamente para nueva aldea
      console.log('🏛️ Creando Ayuntamiento automáticamente para nueva aldea');
      
      // Buscar el ID del tipo de edificio Ayuntamiento
      const { data: townHallType, error: townHallTypeError } = await supabase
        .from('building_types')
        .select('id')
        .eq('name', 'Ayuntamiento')
        .single();

      if (townHallType && !townHallTypeError) {
        const { error: townHallError } = await supabase
          .from('user_buildings')
          .insert({
            user_id: userId,
            building_type_id: townHallType.id,
            level: 1,
            position_x: 7, // Centro del mapa 15x15
            position_y: 7
          });

        if (townHallError) {
          console.error('Error creating initial Town Hall:', townHallError);
        } else {
          console.log('✅ Ayuntamiento creado automáticamente en posición (7,7)');
        }
      } else {
        console.error('Error finding Town Hall building type:', townHallTypeError);
      }
    }

    res.json({
      success: true,
      data: {
        user: userData,
        village: village
      }
    });

  } catch (error) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Obtener información de la aldea del usuario
const getUserVillage = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: villageData, error } = await supabase
      .from('villages')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error loading user village:', error);
      return res.status(404).json({ 
        success: false, 
        message: 'Aldea no encontrada' 
      });
    }

    res.json({
      success: true,
      data: villageData
    });

  } catch (error) {
    console.error('Error in getUserVillage:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Calcular población actual y límite
const calculatePopulation = async (userId) => {
  try {
    // Obtener todos los edificios del usuario
    const { data: buildings, error: buildingsError } = await supabase
      .from('user_buildings')
      .select(`
        *,
        building_types (
          name,
          type
        )
      `)
      .eq('user_id', userId);

    if (buildingsError) {
      console.error('Error obteniendo edificios para población:', buildingsError);
      return { current: 0, limit: 10, houses: 0 }; // Valores por defecto
    }

    // Contar casas y calcular límite de población
    // Cada casa da 10 espacios de población base + (nivel - 1) * 5
    let populationLimit = 10; // Población base
    let houseCount = 0;

    (buildings || []).forEach(building => {
      if (building.building_types?.name === 'Casa') {
        houseCount++;
        const level = building.level || 1;
        populationLimit += 10 + (level - 1) * 5; // 10 base + 5 por nivel adicional
      }
    });

    // Contar población usada (tropas entrenadas)
    const { data: userTroops, error: troopsError } = await supabase
      .from('user_troops')
      .select(`
        quantity,
        troop_types (
          name,
          population_cost
        )
      `)
      .eq('user_id', userId);

    if (troopsError) {
      console.error('Error obteniendo tropas para población:', troopsError);
    }

    let currentPopulation = 0;
    (userTroops || []).forEach(troop => {
      const populationCost = troop.troop_types?.population_cost || 1;
      currentPopulation += troop.quantity * populationCost;
    });

    console.log(`👥 Población calculada: ${currentPopulation}/${populationLimit} (Casas: ${houseCount})`);

    return {
      current: currentPopulation,
      limit: populationLimit,
      houses: houseCount
    };
  } catch (error) {
    console.error('Error calculando población:', error);
    return { current: 0, limit: 10, houses: 0 };
  }
};

// Obtener edificios del usuario
const getUserBuildings = async (req, res) => {
  try {
    const userId = req.user.id;

    // NO crear Ayuntamiento automáticamente aquí - solo obtener los edificios existentes
    const { data, error } = await supabase
      .from('user_buildings_with_level_config')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading user buildings:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al cargar edificios' 
      });
    }

    // Normalizar la estructura para compatibilidad
    const normalizedBuildings = (data || []).map(building => ({
      ...building,
      // Incluir datos de configuración de nivel
      production_multiplier: building.production_multiplier || 1,
      extra_production: building.extra_production || 0,
      building_types: {
        id: building.building_type_id,
        name: building.building_type_name,
        type: building.building_type,
        emoji: building.building_emoji,
        description: building.building_description,
        resource_type: building.resource_type,
        base_production_rate: building.base_production_rate,
        base_cost_wood: building.base_cost_wood,
        base_cost_stone: building.base_cost_stone,
        base_cost_food: building.base_cost_food,
        base_cost_iron: building.base_cost_iron
      }
    }));

    console.log('🏗️ Backend: Enviando', normalizedBuildings.length, 'edificios normalizados');
    console.log('🏗️ Backend: Primer edificio:', normalizedBuildings[0]);

    res.json({
      success: true,
      data: normalizedBuildings
    });

  } catch (error) {
    console.error('Error in getUserBuildings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Crear edificio en la aldea
const createBuilding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { buildingTypeId, positionX, positionY, level = 1 } = req.body;

    console.log(`🏗️ Creando edificio para usuario ${userId}:`, { buildingTypeId, positionX, positionY, level });

    // Validar posición
    if (positionX < 0 || positionX >= 15 || positionY < 0 || positionY >= 15) {
      return res.status(400).json({ 
        success: false, 
        message: 'Posición inválida' 
      });
    }

    // Verificar que la posición no esté ocupada
    const { data: existingBuilding, error: checkError } = await supabase
      .from('user_buildings')
      .select('id')
      .eq('user_id', userId)
      .eq('position_x', positionX)
      .eq('position_y', positionY)
      .single();

    if (existingBuilding) {
      return res.status(400).json({ 
        success: false, 
        message: 'Posición ya ocupada' 
      });
    }

    // Obtener información del tipo de edificio
    const { data: buildingType, error: typeError } = await supabase
      .from('building_types')
      .select('*')
      .eq('id', buildingTypeId)
      .single();

    if (typeError || !buildingType) {
      console.log('❌ Tipo de edificio inválido:', { buildingTypeId, error: typeError });
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo de edificio inválido' 
      });
    }

    console.log(`🏗️ Tipo de edificio: ${buildingType.name} (${buildingType.type})`);

    // 💰 VALIDAR RECURSOS ANTES DE CONSTRUIR
    console.log('💰 Validando recursos del usuario...');
    
    // Obtener recursos actuales del usuario
    const { data: userResources, error: resourcesError } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (resourcesError || !userResources) {
      console.log('❌ Error obteniendo recursos del usuario:', resourcesError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al verificar recursos del usuario' 
      });
    }

    console.log('💰 Recursos actuales:', {
      wood: userResources.wood,
      stone: userResources.stone,
      food: userResources.food,
      iron: userResources.iron
    });

    console.log('💸 Costos requeridos:', {
      wood: buildingType.base_cost_wood,
      stone: buildingType.base_cost_stone,
      food: buildingType.base_cost_food,
      iron: buildingType.base_cost_iron
    });

    // Verificar si el usuario tiene suficientes recursos
    const hasEnoughWood = userResources.wood >= buildingType.base_cost_wood;
    const hasEnoughStone = userResources.stone >= buildingType.base_cost_stone;
    const hasEnoughFood = userResources.food >= buildingType.base_cost_food;
    const hasEnoughIron = userResources.iron >= buildingType.base_cost_iron;

    if (!hasEnoughWood || !hasEnoughStone || !hasEnoughFood || !hasEnoughIron) {
      const missingResources = [];
      if (!hasEnoughWood) missingResources.push(`Madera: ${buildingType.base_cost_wood - userResources.wood}`);
      if (!hasEnoughStone) missingResources.push(`Piedra: ${buildingType.base_cost_stone - userResources.stone}`);
      if (!hasEnoughFood) missingResources.push(`Comida: ${buildingType.base_cost_food - userResources.food}`);
      if (!hasEnoughIron) missingResources.push(`Hierro: ${buildingType.base_cost_iron - userResources.iron}`);

      console.log('❌ Recursos insuficientes:', missingResources);
      return res.status(400).json({ 
        success: false, 
        message: `Recursos insuficientes. Faltan: ${missingResources.join(', ')}` 
      });
    }

    console.log('✅ Usuario tiene suficientes recursos para construir');

    // Si es un Ayuntamiento, permitir construcción sin verificaciones adicionales
    if (buildingType.name === 'Ayuntamiento' || buildingType.type === 'special') {
      console.log('🏛️ Construyendo Ayuntamiento - sin verificaciones adicionales');
    } else {
      // Verificar requisitos del Ayuntamiento - búsqueda más directa
      const { data: userBuildings, error: buildingsError } = await supabase
        .from('user_buildings')
        .select(`
          level,
          building_type_id,
          building_types (
            name,
            type
          )
        `)
        .eq('user_id', userId);

      if (buildingsError) {
        console.log('❌ Error cargando edificios del usuario:', buildingsError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al verificar edificios' 
        });
      }

      console.log(`🏗️ Edificios existentes del usuario:`, userBuildings?.map(b => `${b.building_types?.name} (nivel ${b.level})`));

      // Buscar Ayuntamiento
      const townHall = userBuildings?.find(building => 
        building.building_types?.name === 'Ayuntamiento' || 
        building.building_types?.type === 'special'
      );

      if (!townHall) {
        console.log('❌ No se encontró Ayuntamiento para usuario:', userId);
        
        // Si no tiene Ayuntamiento y está intentando construir uno, permitirlo
        if (buildingType.name === 'Ayuntamiento') {
          console.log('✅ Permitiendo construcción de Ayuntamiento');
        } else {
          // Si no tiene Ayuntamiento y está intentando construir otra cosa, crear uno automáticamente
          console.log('🏛️ Creando Ayuntamiento automáticamente para permitir construcción');
          await ensureUserHasTownHall(userId);
          
          // Recargar el Ayuntamiento recién creado
          const { data: newTownHall } = await supabase
            .from('user_buildings')
            .select(`
              level,
              building_types!inner (
                name,
                type
              )
            `)
            .eq('user_id', userId)
            .eq('building_types.name', 'Ayuntamiento')
            .single();
            
          if (newTownHall) {
            townHall = newTownHall;
          } else {
            return res.status(400).json({ 
              success: false, 
              message: 'Error creando Ayuntamiento automáticamente' 
            });
          }
        }
      }

      // Verificar requisitos de nivel del Ayuntamiento
      const townHallLevel = townHall.level;
      const requiredLevel = getRequiredTownHallLevel(buildingType.name, buildingType.type);
      
      console.log(`🏛️ Verificando requisitos: Ayuntamiento nivel ${townHallLevel}, requerido ${requiredLevel}`);
      
      if (townHallLevel < requiredLevel) {
        return res.status(400).json({ 
          success: false, 
          message: `Ayuntamiento nivel ${requiredLevel} requerido (actual: ${townHallLevel})` 
        });
      }

      // 🏗️ VERIFICAR LÍMITE DE EDIFICIOS BASADO EN EL NIVEL DEL AYUNTAMIENTO
      // Los muros NO cuentan para el límite de edificios
      const isMuro = buildingType.name === 'Muro';
      
      if (isMuro) {
        // Verificar límite de muros (5 por nivel de ayuntamiento)
        const maxMuros = townHallLevel * 5;
        const { data: currentMuros, error: murosError } = await supabase
          .from('user_buildings')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('building_type_id', buildingTypeId);
        
        const murosCount = currentMuros?.length || 0;
        
        console.log(`🧱 Verificando límite de muros: ${murosCount}/${maxMuros} (Ayuntamiento nivel ${townHallLevel})`);
        
        if (murosCount >= maxMuros) {
          console.log(`❌ Límite de muros alcanzado: ${murosCount}/${maxMuros}`);
          return res.status(400).json({ 
            success: false, 
            message: `Límite de muros alcanzado: ${murosCount}/${maxMuros}. ¡Mejora tu Ayuntamiento para construir más muros!` 
          });
        }
      } else {
        // Verificar límite de edificios normales (excluyendo muros)
        console.log('🏗️ Verificando límite de edificios...');
        
        // Obtener el ID del tipo de edificio "Muro"
        const { data: muroType } = await supabase
          .from('building_types')
          .select('id')
          .eq('name', 'Muro')
          .single();
        
        const muroTypeId = muroType?.id;
        
        // Contar edificios excluyendo Ayuntamiento y Muros
        const { data: allUserBuildings, error: countError } = await supabase
          .from('user_buildings')
          .select(`
            id,
            building_type_id,
            building_types!inner(type)
          `)
          .eq('user_id', userId);
        
        if (countError) {
          console.error('❌ Error contando edificios:', countError);
          return res.status(500).json({ 
            success: false, 
            message: 'Error al verificar límite de edificios' 
          });
        }
        
        // Contar solo edificios que NO sean Ayuntamiento ni Muros
        const currentBuildingCount = allUserBuildings.filter(b => 
          b.building_types?.type !== 'special' && // Excluir Ayuntamiento
          (!muroTypeId || b.building_type_id !== muroTypeId) // Excluir Muros
        ).length;
        
        const maxForLevel = townHallLevel === 1 ? 5 : townHallLevel === 2 ? 10 : townHallLevel === 3 ? 15 : 25;
        const remainingSlots = maxForLevel - currentBuildingCount;

        console.log(`🏗️ Edificios actuales: ${currentBuildingCount}/${maxForLevel} (Ayuntamiento nivel ${townHallLevel})`);
        console.log(`🏗️ Espacios disponibles: ${remainingSlots}`);

        if (remainingSlots <= 0) {
          console.log(`❌ Límite alcanzado: ${currentBuildingCount}/${maxForLevel} edificios`);
          return res.status(400).json({ 
            success: false, 
            message: `Límite alcanzado: ${currentBuildingCount}/${maxForLevel} edificios (Nivel ${townHallLevel}). ¡Mejora tu Ayuntamiento para construir más!` 
          });
        }
      }

      // 🏰 VERIFICAR RESTRICCIONES DE EDIFICIOS ÚNICOS
      console.log('🏰 Verificando restricciones de edificios únicos...');
      
      const { data: uniqueCheckResult, error: uniqueError } = await supabase.rpc('check_unique_building_limit', {
        user_uuid: userId,
        building_type_id_to_build: buildingTypeId
      });

      if (uniqueError) {
        console.error('❌ Error verificando restricción de edificios únicos:', uniqueError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al verificar restricciones de edificios' 
        });
      }

      console.log('🏰 Resultado verificación edificios únicos:', uniqueCheckResult);

      if (!uniqueCheckResult.can_build) {
        console.log(`❌ ${uniqueCheckResult.message}`);
        return res.status(400).json({ 
          success: false, 
          message: uniqueCheckResult.message 
        });
      }

      console.log(`✅ ${uniqueCheckResult.message}`);
    }

    // Crear edificio
    const { data, error } = await supabase
      .from('user_buildings')
      .insert({
        user_id: userId,
        building_type_id: buildingTypeId,
        position_x: positionX,
        position_y: positionY,
        level: level
      })
      .select(`
        *,
        building_types (*)
      `)
      .single();

    if (error) {
      console.error('Error creating building:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al crear edificio' 
      });
    }

    console.log('✅ Edificio creado exitosamente, deduciendo recursos...');

    // 💸 DEDUCIR RECURSOS DESPUÉS DE LA CONSTRUCCIÓN EXITOSA
    // IMPORTANTE: Preservar last_updated para que la generación de recursos funcione correctamente
    const newResources = {
      wood: Math.max(0, userResources.wood - buildingType.base_cost_wood),
      stone: Math.max(0, userResources.stone - buildingType.base_cost_stone),
      food: Math.max(0, userResources.food - buildingType.base_cost_food),
      iron: Math.max(0, userResources.iron - buildingType.base_cost_iron),
      last_updated: userResources.last_updated // 🔒 Preservar timestamp para generación
    };

    console.log('💰 Nuevos recursos después de construcción:', newResources);

    const { error: updateResourcesError } = await supabase
      .from('user_resources')
      .update(newResources)
      .eq('user_id', userId);

    if (updateResourcesError) {
      console.error('❌ Error actualizando recursos tras construcción:', updateResourcesError);
      // NOTA: El edificio ya se creó, pero falló la actualización de recursos
      // En un sistema más robusto, implementaríamos transacciones para rollback
    } else {
      console.log('✅ Recursos actualizados exitosamente tras construcción');
    }

    res.json({
      success: true,
      data: data,
      message: 'Edificio creado exitosamente',
      newResources: newResources // Enviar los nuevos recursos al frontend
    });

  } catch (error) {
    console.error('Error in createBuilding:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Función helper para asegurar que el usuario tenga un Ayuntamiento
const ensureUserHasTownHall = async (userId) => {
  try {
    // Primero obtener el ID del tipo de edificio Ayuntamiento
    const { data: townHallType, error: townHallTypeError } = await supabase
      .from('building_types')
      .select('id')
      .eq('name', 'Ayuntamiento')
      .single();

    if (townHallTypeError || !townHallType) {
      console.error('Error: No se encontró el tipo de edificio Ayuntamiento:', townHallTypeError);
      return;
    }

    // Verificar si ya tiene un Ayuntamiento usando el building_type_id
    const { data: existingBuildings, error: checkError } = await supabase
      .from('user_buildings')
      .select('id')
      .eq('user_id', userId)
      .eq('building_type_id', townHallType.id);

    if (checkError) {
      console.error('Error verificando Ayuntamiento:', checkError);
      return;
    }

    // Si ya tiene al menos un Ayuntamiento, no crear otro
    if (existingBuildings && existingBuildings.length > 0) {
      console.log('✅ Usuario ya tiene Ayuntamiento');
      return;
    }

    console.log('🏛️ Usuario no tiene Ayuntamiento, creando uno automáticamente');

    // Buscar una posición libre cerca del centro
    let posX = 7, posY = 7;
    
    // Verificar si la posición central está ocupada
    const { data: centerBuilding } = await supabase
      .from('user_buildings')
      .select('id')
      .eq('user_id', userId)
      .eq('position_x', 7)
      .eq('position_y', 7)
      .single();

    if (centerBuilding) {
      // Buscar posición alternativa
      for (let offset = 1; offset <= 3; offset++) {
        const positions = [
          [7 + offset, 7], [7 - offset, 7], [7, 7 + offset], [7, 7 - offset],
          [7 + offset, 7 + offset], [7 - offset, 7 - offset]
        ];
        
        for (const [x, y] of positions) {
          if (x >= 0 && x < 15 && y >= 0 && y < 15) {
            const { data: existingBuilding } = await supabase
              .from('user_buildings')
              .select('id')
              .eq('user_id', userId)
              .eq('position_x', x)
              .eq('position_y', y)
              .single();
            
            if (!existingBuilding) {
              posX = x;
              posY = y;
              break;
            }
          }
        }
        if (posX !== 7 || posY !== 7) break;
      }
    }

    const { error: townHallError } = await supabase
      .from('user_buildings')
      .insert({
        user_id: userId,
        building_type_id: townHallType.id,
        level: 1,
        position_x: posX,
        position_y: posY
      });

    if (townHallError) {
      // Si el error es por duplicación de posición, intentar otra posición
      if (townHallError.code === '23505') {
        console.log('⚠️ Posición ocupada, buscando alternativa...');
        
        // Intentar posiciones alternativas
        for (let offset = 1; offset <= 5; offset++) {
          const altPositions = [
            [7 + offset, 7], [7 - offset, 7], [7, 7 + offset], [7, 7 - offset],
            [7 + offset, 7 + offset], [7 - offset, 7 - offset],
            [7 + offset, 7 - offset], [7 - offset, 7 + offset]
          ];
          
          for (const [x, y] of altPositions) {
            if (x >= 0 && x < 15 && y >= 0 && y < 15) {
              const { error: altError } = await supabase
                .from('user_buildings')
                .insert({
                  user_id: userId,
                  building_type_id: townHallType.id,
                  level: 1,
                  position_x: x,
                  position_y: y
                });
              
              if (!altError) {
                console.log(`✅ Ayuntamiento creado en posición alternativa (${x},${y})`);
                return;
              }
            }
          }
        }
        
        console.log('⚠️ No se pudo encontrar posición libre para Ayuntamiento');
        return;
      }
      
      console.error('Error creando Ayuntamiento:', townHallError);
      return;
    }

    console.log(`✅ Ayuntamiento creado exitosamente en posición (${posX},${posY})`);

  } catch (error) {
    console.error('Error in ensureUserHasTownHall:', error);
  }
};

// Función helper para obtener nivel requerido del Ayuntamiento
const getRequiredTownHallLevel = (buildingName, buildingType) => {
  const buildingPrerequisites = {
    // Edificios básicos
    'casa': 1,
    'aserradero': 1,
    'cantera': 1,
    'granja': 1,
    'mina_de_hierro': 1,
    'cuartel': 1,
    
    // Por tipo
    'house': 1,
    'resource_generator': 1,
    'barracks': 1,
    'defensive': 2,
    'special': 1
  };

  const buildingKey = buildingName?.toLowerCase().replace(/\s+/g, '_');
  return buildingPrerequisites[buildingKey] || 
         buildingPrerequisites[buildingType] || 1;
};

// Eliminar edificio
const deleteBuilding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { buildingId } = req.params;

    console.log('🗑️ ELIMINAR EDIFICIO - Iniciando proceso:', {
      userId,
      buildingId,
      buildingIdType: typeof buildingId,
      rawParams: req.params,
      url: req.originalUrl
    });

    if (!buildingId) {
      console.log('❌ ID del edificio no proporcionado');
      return res.status(400).json({ 
        success: false, 
        message: 'ID del edificio es requerido' 
      });
    }

    // Verificar que el edificio pertenece al usuario
    const { data: building, error: checkError } = await supabase
      .from('user_buildings')
      .select('*, building_types(*)')
      .eq('id', buildingId)
      .eq('user_id', userId)
      .single();

    if (checkError || !building) {
      console.log('❌ Error al buscar edificio:', {
        checkError,
        building,
        buildingId,
        userId
      });
      return res.status(404).json({ 
        success: false, 
        message: 'Edificio no encontrado' 
      });
    }

    console.log('🏗️ Edificio encontrado:', {
      id: building.id,
      type: building.building_types?.name,
      level: building.level,
      position: { x: building.position_x, y: building.position_y }
    });

    // No permitir eliminar ayuntamiento
    if (building.building_types?.type === 'special' || building.building_types?.name === 'Ayuntamiento') {
      console.log('❌ Intento de eliminar Ayuntamiento bloqueado');
      return res.status(400).json({ 
        success: false, 
        message: 'No se puede eliminar el Ayuntamiento' 
      });
    }

    console.log('🗑️ Procediendo a eliminar edificio...');

    // Eliminar edificio
    const { error: deleteError } = await supabase
      .from('user_buildings')
      .delete()
      .eq('id', buildingId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Error eliminando edificio:', deleteError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar edificio' 
      });
    }

    console.log('✅ Edificio eliminado exitosamente:', buildingId);

    res.json({
      success: true,
      message: 'Edificio eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error in deleteBuilding:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Obtener tipos de edificios disponibles
const getBuildingTypes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('building_types')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error loading building types:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al cargar tipos de edificios' 
      });
    }

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in getBuildingTypes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Asegurar que el usuario tiene un ayuntamiento
const ensureUserVillage = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ PASO 1: Verificar/crear entrada en tabla villages
    console.log('🏘️ Verificando entrada en tabla villages para usuario:', userId);
    
    const { data: existingVillage, error: villageCheckError } = await supabase
      .from('villages')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingVillage && villageCheckError?.code === 'PGRST116') {
      // Usuario no tiene entrada en villages, crearla
      console.log('🏘️ Creando entrada en tabla villages');
      
      // Obtener el username del usuario
      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .single();
      
      const username = userData?.username || 'Usuario';
      
      const { error: villageCreateError } = await supabase
        .from('villages')
        .insert({
          user_id: userId,
          village_name: `Aldea de ${username}`,
          village_icon: '🏘️',
          description: '¡Mi nueva aldea!'
        });

      if (villageCreateError) {
        console.error('❌ Error creando entrada en villages:', villageCreateError);
        return res.status(500).json({
          success: false,
          message: 'Error al crear aldea'
        });
      } else {
        console.log('✅ Entrada en tabla villages creada exitosamente');
      }
    } else if (existingVillage) {
      console.log('✅ Usuario ya tiene entrada en tabla villages');
    }

    // ✅ PASO 2: Verificar/crear Ayuntamiento
    // Primero obtener el ID del tipo de edificio Ayuntamiento
    const { data: townHallType, error: townHallTypeError } = await supabase
      .from('building_types')
      .select('id')
      .eq('name', 'Ayuntamiento')
      .single();

    if (townHallTypeError || !townHallType) {
      console.error('Error: No se encontró el tipo de edificio Ayuntamiento:', townHallTypeError);
      return res.status(500).json({
        success: false,
        message: 'Error al buscar tipo de edificio Ayuntamiento'
      });
    }

    // Verificar si ya tiene ayuntamiento
    const { data: existingTownHall, error: checkError } = await supabase
      .from('user_buildings')
      .select('*')
      .eq('user_id', userId)
      .eq('building_type_id', townHallType.id)
      .single();

    if (existingTownHall && !checkError) {
      // Verificar que también tenga recursos
      console.log('🪙 Usuario ya tiene Ayuntamiento, verificando recursos...');
      
      const { data: existingResources, error: resourceCheckError } = await supabase
        .from('user_resources')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!existingResources && resourceCheckError?.code === 'PGRST116') {
        // Usuario tiene Ayuntamiento pero no recursos, crear recursos iniciales
        console.log('🪙 Creando recursos iniciales para usuario existente');
        
        const { error: resourceCreateError } = await supabase
          .from('user_resources')
          .insert({
            user_id: userId,
            wood: 1000,
            stone: 500,
            food: 500,
            iron: 200
          });

        if (resourceCreateError) {
          console.error('Error creando recursos iniciales:', resourceCreateError);
        } else {
          console.log('✅ Recursos iniciales creados exitosamente');
        }
      }

      return res.json({
        success: true,
        message: 'Usuario ya tiene ayuntamiento',
        data: existingTownHall
      });
    }

    // Crear ayuntamiento en el centro del mapa
    const center = Math.floor(15 / 2);
    const { data: townHall, error: createError } = await supabase
      .from('user_buildings')
      .insert({
        user_id: userId,
        building_type_id: townHallType.id,
        position_x: center,
        position_y: center,
        level: 1
      })
      .select(`
        *,
        building_types (*)
      `)
      .single();

    if (createError) {
      // Si el error es por duplicación, buscar posición alternativa
      if (createError.code === '23505') {
        console.log('⚠️ Posición central ocupada, buscando alternativa...');
        
        // Intentar posiciones alternativas
        for (let offset = 1; offset <= 5; offset++) {
          const altPositions = [
            [center + offset, center], [center - offset, center], 
            [center, center + offset], [center, center - offset],
            [center + offset, center + offset], [center - offset, center - offset]
          ];
          
          for (const [x, y] of altPositions) {
            if (x >= 0 && x < 15 && y >= 0 && y < 15) {
              const { data: altTownHall, error: altError } = await supabase
                .from('user_buildings')
                .insert({
                  user_id: userId,
                  building_type_id: townHallType.id,
                  position_x: x,
                  position_y: y,
                  level: 1
                })
                .select(`
                  *,
                  building_types (*)
                `)
                .single();
              
              if (!altError) {
                // Asegurar que el usuario también tiene recursos iniciales
                console.log('🪙 Verificando recursos iniciales para usuario (posición alternativa):', userId);
                
                const { data: existingResources, error: resourceCheckError } = await supabase
                  .from('user_resources')
                  .select('*')
                  .eq('user_id', userId)
                  .single();

                if (!existingResources && resourceCheckError?.code === 'PGRST116') {
                  // Usuario no tiene recursos, crear recursos iniciales
                  console.log('🪙 Creando recursos iniciales para nuevo usuario');
                  
                  const { error: resourceCreateError } = await supabase
                    .from('user_resources')
                    .insert({
                      user_id: userId,
                      wood: 1000,
                      stone: 500,
                      food: 500,
                      iron: 200
                    });

                  if (resourceCreateError) {
                    console.error('Error creando recursos iniciales:', resourceCreateError);
                  } else {
                    console.log('✅ Recursos iniciales creados exitosamente');
                  }
                } else if (existingResources) {
                  console.log('🪙 Usuario ya tiene recursos:', {
                    wood: existingResources.wood,
                    stone: existingResources.stone,
                    food: existingResources.food,
                    iron: existingResources.iron
                  });
                }

                return res.json({
                  success: true,
                  message: 'Ayuntamiento creado exitosamente',
                  data: altTownHall
                });
              }
            }
          }
        }
        
        return res.status(500).json({
          success: false,
          message: 'No se pudo encontrar posición libre para el ayuntamiento'
        });
      }
      
      console.error('Error creating town hall:', createError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al crear ayuntamiento' 
      });
    }

    // Asegurar que el usuario también tiene recursos iniciales
    console.log('🪙 Verificando recursos iniciales para usuario:', userId);
    
    const { data: existingResources, error: resourceCheckError } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!existingResources && resourceCheckError?.code === 'PGRST116') {
      // Usuario no tiene recursos, crear recursos iniciales
      console.log('🪙 Creando recursos iniciales para nuevo usuario');
      
      const { error: resourceCreateError } = await supabase
        .from('user_resources')
        .insert({
          user_id: userId,
          wood: 1000,
          stone: 500,
          food: 500,
          iron: 200
        });

      if (resourceCreateError) {
        console.error('Error creando recursos iniciales:', resourceCreateError);
      } else {
        console.log('✅ Recursos iniciales creados exitosamente');
      }
    } else if (existingResources) {
      console.log('🪙 Usuario ya tiene recursos:', {
        wood: existingResources.wood,
        stone: existingResources.stone,
        food: existingResources.food,
        iron: existingResources.iron
      });
    }

    res.json({
      success: true,
      message: 'Ayuntamiento creado exitosamente',
      data: townHall
    });

  } catch (error) {
    console.error('Error in ensureUserVillage:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Limpiar ayuntamientos duplicados
const cleanupDuplicateTownHalls = async (req, res) => {
  try {
    const userId = req.user.id;

    // Primero obtener el ID del tipo de edificio Ayuntamiento
    const { data: townHallType, error: townHallTypeError } = await supabase
      .from('building_types')
      .select('id')
      .eq('name', 'Ayuntamiento')
      .single();

    if (townHallTypeError || !townHallType) {
      return res.status(500).json({
        success: false,
        message: 'Error al buscar tipo de edificio Ayuntamiento'
      });
    }

    // Obtener todos los ayuntamientos del usuario
    const { data: townHalls, error: fetchError } = await supabase
      .from('user_buildings')
      .select('*')
      .eq('user_id', userId)
      .eq('building_type_id', townHallType.id)
      .order('id', { ascending: true });

    if (fetchError) {
      console.error('Error fetching town halls:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener ayuntamientos'
      });
    }

    if (!townHalls || townHalls.length <= 1) {
      return res.json({
        success: true,
        message: 'Usuario tiene ' + (townHalls?.length || 0) + ' ayuntamiento(s), no necesita limpieza',
        townHallsCount: townHalls?.length || 0
      });
    }

    // Mantener el primer ayuntamiento (más antiguo) y eliminar los demás
    const townHallToKeep = townHalls[0];
    const townHallsToDelete = townHalls.slice(1);

    console.log(`🧹 Limpiando ${townHallsToDelete.length} ayuntamientos duplicados para usuario ${userId}`);
    console.log(`✅ Manteniendo ayuntamiento ID ${townHallToKeep.id} en posición (${townHallToKeep.position_x}, ${townHallToKeep.position_y})`);

    // Eliminar los ayuntamientos duplicados
    const deleteIds = townHallsToDelete.map(th => th.id);
    const { error: deleteError } = await supabase
      .from('user_buildings')
      .delete()
      .in('id', deleteIds);

    if (deleteError) {
      console.error('Error deleting duplicate town halls:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar ayuntamientos duplicados'
      });
    }

    res.json({
      success: true,
      message: `Limpieza exitosa: se eliminaron ${townHallsToDelete.length} ayuntamientos duplicados`,
      townHallKept: townHallToKeep,
      deletedCount: townHallsToDelete.length
    });

  } catch (error) {
    console.error('Error in cleanupDuplicateTownHalls:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Verificar límite de edificios basado en el nivel del ayuntamiento
const checkBuildingLimit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { townHallLevel } = req.query;

    // Usar la función RPC de la base de datos
    const { data, error } = await supabase.rpc('check_building_limit', {
      user_uuid: userId,
      town_hall_level: parseInt(townHallLevel)
    });

    if (error) {
      console.error('Error checking building limit:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al verificar límite de edificios' 
      });
    }

    res.json({
      success: true,
      data: data || 0
    });

  } catch (error) {
    console.error('Error in checkBuildingLimit:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Actualizar recursos del usuario
const updateUserResources = async (req, res) => {
  try {
    const userId = req.user.id;
    const { wood, stone, food, iron } = req.body;

    // Actualizar recursos en la base de datos
    const { error } = await supabase
      .from('user_resources')
      .update({
        wood: wood,
        stone: stone,
        food: food,
        iron: iron
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user resources:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar recursos' 
      });
    }

    res.json({
      success: true,
      message: 'Recursos actualizados exitosamente'
    });

  } catch (error) {
    console.error('Error in updateUserResources:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Mejorar un edificio existente
const upgradeBuilding = async (req, res) => {
  console.log('🚀 upgradeBuilding - INICIO DE FUNCIÓN');
  console.log('🚀 req.params:', req.params);
  console.log('🚀 req.body:', req.body);
  console.log('🚀 req.user:', req.user);
  
  try {
    const userId = req.user.id;
    const { buildingId } = req.params;
    const { newLevel } = req.body;

    console.log(`🔧 Intentando mejorar edificio ID ${buildingId} al nivel ${newLevel} para usuario ${userId}`);

    // Verificar que el edificio pertenece al usuario
    const { data: building, error: buildingError } = await supabase
      .from('user_buildings')
      .select('*, building_types(*)')
      .eq('id', buildingId)
      .eq('user_id', userId)
      .single();

    if (buildingError || !building) {
      console.log('❌ Edificio no encontrado:', buildingError);
      return res.status(404).json({ 
        success: false, 
        message: 'Edificio no encontrado' 
      });
    }

    console.log(`📋 Edificio encontrado: ${building.building_types?.name} nivel ${building.level}`);

    // Obtener nivel del Ayuntamiento
    const { data: townHallType, error: townHallTypeError } = await supabase
      .from('building_types')
      .select('id')
      .eq('name', 'Ayuntamiento')
      .single();

    if (townHallTypeError || !townHallType) {
      console.log('❌ Error buscando tipo Ayuntamiento:', townHallTypeError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al buscar tipo de edificio Ayuntamiento' 
      });
    }

    const { data: townHall, error: townHallError } = await supabase
      .from('user_buildings')
      .select('level')
      .eq('user_id', userId)
      .eq('building_type_id', townHallType.id)
      .single();

    if (townHallError || !townHall) {
      console.log('❌ Ayuntamiento no encontrado:', townHallError);
      return res.status(400).json({ 
        success: false, 
        message: 'Ayuntamiento requerido para mejorar edificios' 
      });
    }

    console.log(`🏛️ Ayuntamiento encontrado: nivel ${townHall.level}`);
    console.log(`🔍 Debug - Building type ID: ${building.building_type_id}, TownHall type ID: ${townHallType.id}`);
    console.log(`🔍 Debug - Building name: ${building.building_types?.name}`);

    // 💰 VALIDAR RECURSOS PARA LA MEJORA
    console.log('💰 Verificando recursos para la mejora...');
    
    // 🔍 Obtener costos de mejora desde building_level_config
    const nextLevel = building.level + 1;
    const { data: levelConfig, error: levelConfigError } = await supabase
      .from('building_level_config')
      .select('upgrade_cost_wood, upgrade_cost_stone, upgrade_cost_food, upgrade_cost_iron')
      .eq('building_type_id', building.building_type_id)
      .eq('level', nextLevel)
      .single();
    
    if (levelConfigError || !levelConfig) {
      console.log('❌ No se encontró configuración de nivel para nivel', nextLevel);
      return res.status(400).json({
        success: false,
        message: `No hay configuración de mejora disponible para el nivel ${nextLevel}`
      });
    }
    
    const upgradeCosts = {
      wood: levelConfig.upgrade_cost_wood || 0,
      stone: levelConfig.upgrade_cost_stone || 0,
      food: levelConfig.upgrade_cost_food || 0,
      iron: levelConfig.upgrade_cost_iron || 0
    };
    
    console.log('💰 Nivel actual del edificio:', building.level);
    console.log('💰 Nivel objetivo:', nextLevel);
    console.log('💰 Costos de mejora desde building_level_config:', upgradeCosts);
    
    // Obtener recursos actuales del usuario
    const { data: userResources, error: resourcesError } = await supabase
      .from('user_resources')
      .select('wood, stone, food, iron, last_updated')
      .eq('user_id', userId)
      .single();
      
    if (resourcesError || !userResources) {
      console.log('❌ Error obteniendo recursos del usuario:', resourcesError);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar recursos'
      });
    }
    
    console.log('💰 Recursos actuales del usuario:', userResources);
    
    // Verificar recursos suficientes
    const insufficientResources = [];
    if (upgradeCosts.wood > 0 && userResources.wood < upgradeCosts.wood) {
      insufficientResources.push(`madera: necesitas ${upgradeCosts.wood}, tienes ${userResources.wood}`);
    }
    if (upgradeCosts.stone > 0 && userResources.stone < upgradeCosts.stone) {
      insufficientResources.push(`piedra: necesitas ${upgradeCosts.stone}, tienes ${userResources.stone}`);
    }
    if (upgradeCosts.food > 0 && userResources.food < upgradeCosts.food) {
      insufficientResources.push(`comida: necesitas ${upgradeCosts.food}, tienes ${userResources.food}`);
    }
    if (upgradeCosts.iron > 0 && userResources.iron < upgradeCosts.iron) {
      insufficientResources.push(`hierro: necesitas ${upgradeCosts.iron}, tienes ${userResources.iron}`);
    }
    
    if (insufficientResources.length > 0) {
      console.log('❌ Recursos insuficientes:', insufficientResources);
      return res.status(400).json({
        success: false,
        message: `Recursos insuficientes para mejorar. ${insufficientResources.join(', ')}`
      });
    }
    
    console.log('✅ Recursos suficientes para la mejora');
    
    // Descontar recursos
    const newResources = {
      wood: userResources.wood - upgradeCosts.wood,
      stone: userResources.stone - upgradeCosts.stone,
      food: userResources.food - upgradeCosts.food,
      iron: userResources.iron - upgradeCosts.iron,
      last_updated: userResources.last_updated // 🔒 Preservar timestamp para generación
    };
    
    console.log('💰 Nuevos recursos después de la mejora:', newResources);
    
    // Actualizar recursos del usuario
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
    
    console.log('✅ Recursos actualizados correctamente');

    // Validar que el nuevo nivel no exceda el nivel del Ayuntamiento (excepto para el propio Ayuntamiento)
    const isUpgradingTownHall = building.building_type_id === townHallType.id;
    
    console.log(`🔍 Debug - isUpgradingTownHall: ${isUpgradingTownHall}`);
    
    // Los edificios pueden igualar el nivel del Ayuntamiento, pero no superarlo
    if (!isUpgradingTownHall && building.level >= townHall.level) {
      console.log(`❌ El edificio ya está al nivel máximo permitido por el Ayuntamiento (${townHall.level})`);
      return res.status(400).json({ 
        success: false, 
        message: `El edificio ya está al nivel máximo permitido por tu Ayuntamiento. Mejora tu Ayuntamiento primero.` 
      });
    }

    if (isUpgradingTownHall) {
      console.log(`🏛️ Mejorando Ayuntamiento: se permite superar el nivel actual`);
      
      // Validar nivel máximo del Ayuntamiento (4)
      if (newLevel > 4) {
        console.log(`❌ Nivel ${newLevel} excede el máximo del Ayuntamiento (4)`);
        return res.status(400).json({ 
          success: false, 
          message: 'El nivel máximo del Ayuntamiento es 4' 
        });
      }
    }

    // Validar nivel máximo general (solo para edificios que no sean Ayuntamiento)
    if (!isUpgradingTownHall && newLevel > 4) {
      console.log(`❌ Nivel ${newLevel} excede el máximo para edificios normales (4)`);
      return res.status(400).json({ 
        success: false, 
        message: 'El nivel máximo para edificios es 4' 
      });
    }

    console.log(`✅ Validaciones pasadas, actualizando edificio a nivel ${newLevel}`);

    // Actualizar el nivel del edificio
    const { data: updatedBuilding, error: updateError } = await supabase
      .from('user_buildings')
      .update({ level: newLevel })
      .eq('id', buildingId)
      .eq('user_id', userId)
      .select('*, building_types(*)')
      .single();

    if (updateError) {
      console.error('❌ Error actualizando edificio:', updateError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al mejorar edificio' 
      });
    }

    console.log(`✅ Edificio mejorado exitosamente a nivel ${newLevel}`);

    res.json({
      success: true,
      data: {
        building: updatedBuilding,
        newResources: newResources,
        upgradeCosts: upgradeCosts
      },
      message: 'Edificio mejorado exitosamente'
    });

  } catch (error) {
    console.error('Error in upgradeBuilding:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Obtener recursos del usuario
const getUserResources = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading user resources:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al cargar recursos' 
      });
    }

    res.json({
      success: true,
      data: data || {
        wood: 0,
        stone: 0,
        food: 0,
        iron: 0,
        gold: 0,
        elixir: 0,
        gems: 0
      }
    });

  } catch (error) {
    console.error('Error in getUserResources:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Funciones para entrenamiento de tropas
const startTroopTraining = async (req, res) => {
  try {
    const userId = req.user.id;
    const { troopTypeId, buildingId, quantity = 1 } = req.body;

    console.log('🚀 Iniciando entrenamiento de tropas:');
    console.log('👤 User ID:', userId);
    console.log('🏹 Troop Type ID:', troopTypeId);
    console.log('🏢 Building ID:', buildingId);
    console.log('📊 Quantity:', quantity);

    if (!troopTypeId || !buildingId || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'troopTypeId, buildingId y quantity (>0) son requeridos'
      });
    }

    // 1. Obtener información del tipo de tropa
    const { data: troopType, error: troopError } = await supabase
      .from('troop_types')
      .select('*')
      .eq('id', troopTypeId)
      .single();

    if (troopError || !troopType) {
      console.error('❌ Tipo de tropa no encontrado:', troopError);
      return res.status(404).json({
        success: false,
        message: 'Tipo de tropa no encontrado'
      });
    }

    // 2. Verificar que el edificio existe y pertenece al usuario
    const { data: building, error: buildingError } = await supabase
      .from('user_buildings')
      .select('*')
      .eq('id', buildingId)
      .eq('user_id', userId)
      .single();

    if (buildingError || !building) {
      console.error('❌ Edificio no encontrado:', buildingError);
      return res.status(404).json({
        success: false,
        message: 'Edificio no encontrado o no te pertenece'
      });
    }

    // 3. Verificar nivel del edificio vs requerimiento de tropa
    if (building.level < troopType.required_building_level) {
      return res.status(400).json({
        success: false,
        message: `Necesitas nivel ${troopType.required_building_level} del edificio (tienes nivel ${building.level})`
      });
    }

    // 4. Calcular costos totales
    const totalCost = {
      wood: (troopType.wood_cost || 0) * quantity,
      stone: (troopType.stone_cost || 0) * quantity,
      food: (troopType.food_cost || 0) * quantity,
      iron: (troopType.iron_cost || 0) * quantity
    };

    console.log('💰 Costo total:', totalCost);

    // 5. Obtener recursos actuales del usuario
    const { data: resources, error: resourcesError } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (resourcesError || !resources) {
      console.error('❌ Recursos no encontrados:', resourcesError);
      return res.status(404).json({
        success: false,
        message: 'Recursos del usuario no encontrados'
      });
    }

    // 6. Verificar que tiene suficientes recursos
    if (resources.wood < totalCost.wood ||
        resources.stone < totalCost.stone ||
        resources.food < totalCost.food ||
        resources.iron < totalCost.iron) {
      return res.status(400).json({
        success: false,
        message: 'No tienes suficientes recursos',
        required: totalCost,
        current: {
          wood: resources.wood,
          stone: resources.stone,
          food: resources.food,
          iron: resources.iron
        }
      });
    }

    // 7. Verificar límite de población
    const population = await calculatePopulation(userId);
    const populationCost = (troopType.population_cost || 1) * quantity;
    
    console.log(`👥 Población actual: ${population.current}/${population.limit}`);
    console.log(`👥 Costo de población de tropas: ${populationCost}`);
    
    if (population.current + populationCost > population.limit) {
      return res.status(400).json({
        success: false,
        message: `Población insuficiente. Necesitas ${population.current + populationCost}/${population.limit}. Construye más Casas para aumentar el límite.`,
        population: {
          current: population.current,
          required: population.current + populationCost,
          limit: population.limit,
          houses: population.houses
        }
      });
    }

    console.log('✅ Límite de población OK');

    // 8. Descontar recursos
    const { error: updateError } = await supabase
      .from('user_resources')
      .update({
        wood: resources.wood - totalCost.wood,
        stone: resources.stone - totalCost.stone,
        food: resources.food - totalCost.food,
        iron: resources.iron - totalCost.iron,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error descontando recursos:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Error descontando recursos'
      });
    }

    console.log('✅ Recursos descontados exitosamente');

    // 9. Calcular tiempo de finalización
    const trainingTimeMinutes = troopType.training_time_minutes || 1;
    const totalMinutes = trainingTimeMinutes * quantity;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + totalMinutes * 60000);

    // 10. Crear entrada en cola de entrenamiento
    const { data: queueEntry, error: queueError } = await supabase
      .from('troop_training_queue')
      .insert({
        user_id: userId,
        troop_type_id: troopTypeId,
        building_id: buildingId,
        quantity: quantity,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'training'
      })
      .select()
      .single();

    if (queueError) {
      console.error('❌ Error creando entrada en cola:', queueError);
      // Intentar revertir el descuento de recursos
      await supabase
        .from('user_resources')
        .update({
          wood: resources.wood,
          stone: resources.stone,
          food: resources.food,
          iron: resources.iron
        })
        .eq('user_id', userId);
      
      return res.status(500).json({
        success: false,
        message: 'Error creando entrada en cola de entrenamiento'
      });
    }

    console.log('✅ Entrenamiento iniciado exitosamente');

    res.json({
      success: true,
      message: `Entrenamiento de ${quantity} ${troopType.name}(s) iniciado`,
      data: {
        queueId: queueEntry.id,
        endTime: endTime.toISOString(),
        durationMinutes: totalMinutes
      }
    });

  } catch (error) {
    console.error('Error in startTroopTraining:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

const completeTroopTraining = async (req, res) => {
  try {
    const userId = req.user.id;
    const { queueId } = req.body;

    if (!queueId) {
      return res.status(400).json({
        success: false,
        message: 'queueId es requerido'
      });
    }

    // Llamar a la función de base de datos
    const { data, error } = await supabase
      .rpc('complete_troop_training', {
        p_queue_id: parseInt(queueId),
        p_user_id: userId
      });

    if (error) {
      console.error('Error completing troop training:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }

    if (!data.success) {
      return res.status(400).json({
        success: false,
        message: data.message
      });
    }

    res.json({
      success: true,
      message: data.message,
      data: {
        troopTypeId: data.troop_type_id,
        quantity: data.quantity
      }
    });

  } catch (error) {
    console.error('Error in completeTroopTraining:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const getTrainingQueue = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔄 getTrainingQueue - Obteniendo cola para usuario:', userId);

    // Consulta más robusta con JOIN explícito
    const { data, error } = await supabase
      .from('troop_training_queue')
      .select(`
        id,
        quantity,
        start_time,
        end_time,
        status,
        troop_type_id,
        building_id,
        troop_types!inner (
          id,
          name,
          category,
          required_building_level,
          training_time_minutes
        ),
        user_buildings (
          level
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'training')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error getting training queue:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }

    console.log('🔄 getTrainingQueue - Datos raw:', data);
    console.log('🔄 getTrainingQueue - Primer elemento raw:', data?.[0]);

    // Formatear los datos para que el frontend entienda
    const formattedData = (data || []).map(item => {
      console.log('🔄 getTrainingQueue - Procesando item:', item);
      console.log('🔄 getTrainingQueue - troop_types data:', item.troop_types);
      
      return {
        id: item.id,
        quantity: item.quantity,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status,
        troop_type_id: item.troop_type_id,
        building_id: item.building_id,
        troop_name: item.troop_types?.name || `Tropa_${item.troop_type_id}`, // Fallback más informativo
        required_building_level: item.troop_types?.required_building_level,
        training_time_minutes: item.troop_types?.training_time_minutes,
        building_level: item.user_buildings?.level
      };
    });

    console.log('🔄 getTrainingQueue - Datos formateados:', formattedData);

    res.json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error('Error in getTrainingQueue:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const getTroopTypes = async (req, res) => {
  try {
    console.log('🔍 getTroopTypes - Obteniendo tipos de tropas...');
    
    const { data, error } = await supabase
      .from('troop_types')
      .select('*')
      .in('category', ['cuartel', 'magic']) // ← Cambiado de 'torre_de_magos' a 'magic'
      .order('category', { ascending: true })
      .order('required_building_level', { ascending: true });

    if (error) {
      console.error('Error getting troop types:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }

    console.log('🔍 getTroopTypes - Datos encontrados:', data?.length || 0);
    console.log('🔍 getTroopTypes - Categorías:', [...new Set(data?.map(t => t.category) || [])]);

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error in getTroopTypes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener tropas del usuario
const getUserTroops = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🪖 Obteniendo tropas para usuario:', userId);

    const { data, error } = await supabase
      .from('user_troops')
      .select(`
        *,
        troop_types (
          name,
          power,
          category
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error al obtener tropas del usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener tropas del usuario'
      });
    }

    // Formatear la respuesta para que sea compatible con el frontend
    const formattedTroops = data.map(troop => ({
      id: troop.id,
      user_id: troop.user_id,
      troop_type_id: troop.troop_type_id,
      quantity: troop.quantity,
      created_at: troop.created_at,
      updated_at: troop.updated_at,
      troop_name: troop.troop_types.name,
      power: troop.troop_types.power,
      category: troop.troop_types.category
    }));

    console.log('✅ Tropas encontradas:', formattedTroops.length);
    
    res.json({
      success: true,
      data: formattedTroops
    });

  } catch (error) {
    console.error('Error in getUserTroops:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Mover edificio a nueva posición
const moveBuilding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { buildingId } = req.params;
    const { newPositionX, newPositionY } = req.body;

    console.log(`💚 Moviendo edificio ${buildingId} a posición (${newPositionX}, ${newPositionY})`);

    // Validar posición
    if (newPositionX < 0 || newPositionX >= 15 || newPositionY < 0 || newPositionY >= 15) {
      return res.status(400).json({ 
        success: false, 
        message: 'Posición inválida' 
      });
    }

    // Verificar que el edificio pertenece al usuario
    const { data: building, error: buildingError } = await supabase
      .from('user_buildings')
      .select('*, building_types(*)')
      .eq('id', buildingId)
      .eq('user_id', userId)
      .single();

    if (buildingError || !building) {
      return res.status(404).json({ 
        success: false, 
        message: 'Edificio no encontrado' 
      });
    }

    // Verificar que la nueva posición no esté ocupada (excluyendo el edificio actual)
    const { data: existingBuilding } = await supabase
      .from('user_buildings')
      .select('id')
      .eq('user_id', userId)
      .eq('position_x', newPositionX)
      .eq('position_y', newPositionY)
      .neq('id', buildingId)
      .single();

    if (existingBuilding) {
      return res.status(400).json({ 
        success: false, 
        message: 'Posición ya ocupada' 
      });
    }

    // Actualizar posición del edificio
    const { data: updatedBuilding, error: updateError } = await supabase
      .from('user_buildings')
      .update({ 
        position_x: newPositionX, 
        position_y: newPositionY 
      })
      .eq('id', buildingId)
      .eq('user_id', userId)
      .select('*, building_types(*)')
      .single();

    if (updateError) {
      console.error('❌ Error actualizando posición:', updateError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al mover edificio' 
      });
    }

    console.log(`✅ Edificio ${building.building_types.name} movido exitosamente`);

    res.json({
      success: true,
      message: `${building.building_types.name} movido exitosamente`,
      data: updatedBuilding
    });

  } catch (error) {
    console.error('Error in moveBuilding:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener información de población del usuario
const getUserPopulation = async (req, res) => {
  try {
    const userId = req.user.id;
    const population = await calculatePopulation(userId);

    res.json({
      success: true,
      data: population
    });

  } catch (error) {
    console.error('Error in getUserPopulation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// ========================================
// NUEVOS ENDPOINTS - LÓGICA DE VALIDACIÓN
// ========================================

/**
 * Obtener límites de edificios según nivel del ayuntamiento
 */
const getBuildingLimits = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener ayuntamiento del usuario
    const { data: townHall, error: townHallError } = await supabase
      .from('user_buildings')
      .select('*, building_types(*)')
      .eq('user_id', userId)
      .eq('building_types.name', 'Ayuntamiento')
      .single();

    if (townHallError) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el ayuntamiento'
      });
    }

    const townHallLevel = townHall.level;

    // Calcular límite de edificios según nivel del ayuntamiento
    let maxBuildings;
    switch (townHallLevel) {
      case 1: maxBuildings = 5; break;
      case 2: maxBuildings = 10; break;
      case 3: maxBuildings = 15; break;
      case 4: maxBuildings = 25; break;
      default: maxBuildings = 5;
    }

    // Contar edificios actuales (excluyendo ayuntamiento)
    const { data: buildings, error: buildingsError } = await supabase
      .from('user_buildings')
      .select('id, building_types(name)')
      .eq('user_id', userId);

    if (buildingsError) {
      throw buildingsError;
    }

    const currentBuildings = buildings.filter(b => b.building_types?.name !== 'Ayuntamiento').length;
    const remainingSlots = Math.max(0, maxBuildings - currentBuildings);

    res.json({
      success: true,
      data: {
        current: currentBuildings,
        max: maxBuildings,
        remaining: remainingSlots,
        townHallLevel,
        isAtLimit: remainingSlots === 0
      }
    });

  } catch (error) {
    console.error('Error in getBuildingLimits:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Calcular costo de mejora de un edificio
 */
const getUpgradeCost = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id;

    // Obtener edificio y su tipo
    const { data: building, error: buildingError } = await supabase
      .from('user_buildings')
      .select('*, building_types(*)')
      .eq('id', buildingId)
      .eq('user_id', userId)
      .single();

    if (buildingError || !building) {
      return res.status(404).json({
        success: false,
        message: 'Edificio no encontrado'
      });
    }

    const baseType = building.building_types;
    const currentLevel = building.level;
    const nextLevel = currentLevel + 1;

    // Obtener costos desde building_level_config
    const { data: levelConfig, error: configError } = await supabase
      .from('building_level_config')
      .select('upgrade_cost_wood, upgrade_cost_stone, upgrade_cost_food, upgrade_cost_iron')
      .eq('building_type_id', baseType.id)
      .eq('level', nextLevel)
      .single();

    if (configError || !levelConfig) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró la configuración de costos para este nivel'
      });
    }

    const cost = {
      wood: levelConfig.upgrade_cost_wood || 0,
      stone: levelConfig.upgrade_cost_stone || 0,
      food: levelConfig.upgrade_cost_food || 0,
      iron: levelConfig.upgrade_cost_iron || 0
    };

    res.json({
      success: true,
      data: {
        buildingId,
        buildingName: baseType.name,
        currentLevel,
        nextLevel,
        cost
      }
    });

  } catch (error) {
    console.error('Error in getUpgradeCost:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Validar si un edificio puede ser mejorado
 */
const canUpgradeBuildingEndpoint = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id;

    // Obtener edificio
    const { data: building, error: buildingError } = await supabase
      .from('user_buildings')
      .select('*, building_types(*)')
      .eq('id', buildingId)
      .eq('user_id', userId)
      .single();

    if (buildingError || !building) {
      return res.status(404).json({
        success: false,
        message: 'Edificio no encontrado'
      });
    }

    // Obtener ayuntamiento
    const { data: townHall } = await supabase
      .from('user_buildings')
      .select('level, building_types(name)')
      .eq('user_id', userId)
      .eq('building_types.name', 'Ayuntamiento')
      .single();

    const townHallLevel = townHall?.level || 1;
    const isAyuntamiento = building.building_types.name === 'Ayuntamiento';

    // Validar si puede mejorar
    const canUpgrade = isAyuntamiento 
      ? building.level < 4  // Ayuntamiento solo necesita estar bajo nivel 4
      : building.level < townHallLevel && building.level < 4; // Otros edificios necesitan nivel de ayuntamiento

    let reason = '';
    if (!canUpgrade) {
      if (building.level >= 4) {
        reason = 'El edificio ya alcanzó el nivel máximo (4)';
      } else if (!isAyuntamiento && building.level >= townHallLevel) {
        reason = `Necesitas mejorar tu ayuntamiento (nivel ${townHallLevel}) primero`;
      }
    }

    res.json({
      success: true,
      data: {
        canUpgrade,
        reason,
        buildingLevel: building.level,
        townHallLevel,
        maxLevel: 4
      }
    });

  } catch (error) {
    console.error('Error in canUpgradeBuildingEndpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Calcular tasa de producción de un edificio
 */
const getProductionRate = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const userId = req.user.id;

    // Obtener edificio
    const { data: building, error: buildingError } = await supabase
      .from('user_buildings')
      .select('*, building_types(*)')
      .eq('id', buildingId)
      .eq('user_id', userId)
      .single();

    if (buildingError || !building) {
      return res.status(404).json({
        success: false,
        message: 'Edificio no encontrado'
      });
    }

    if (building.building_types.type !== 'resource_generator') {
      return res.json({
        success: true,
        data: {
          isGenerator: false,
          productionRate: 0
        }
      });
    }

    const baseRate = building.building_types.base_production_rate || 0;
    const multiplier = building.production_multiplier ?? building.level_config?.production_multiplier ?? 1;
    const extra = building.extra_production ?? building.level_config?.extra_production ?? 0;
    const productionRate = baseRate * multiplier + extra;

    res.json({
      success: true,
      data: {
        isGenerator: true,
        productionRate,
        baseRate,
        multiplier,
        extra
      }
    });

  } catch (error) {
    console.error('Error in getProductionRate:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// 🏛️ Obtener información del Ayuntamiento con límites de edificios
const getTownHallInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener tipo de Ayuntamiento
    const { data: townHallType, error: townHallTypeError } = await supabase
      .from('building_types')
      .select('id')
      .eq('name', 'Ayuntamiento')
      .single();

    if (townHallTypeError || !townHallType) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de Ayuntamiento no encontrado'
      });
    }

    // Obtener Ayuntamiento del usuario
    const { data: townHall, error: townHallError } = await supabase
      .from('user_buildings')
      .select('*, building_types(*)')
      .eq('user_id', userId)
      .eq('building_type_id', townHallType.id)
      .single();

    if (townHallError || !townHall) {
      return res.status(404).json({
        success: false,
        message: 'Ayuntamiento no encontrado'
      });
    }

    // Calcular límites según nivel del ayuntamiento
    const getMaxBuildingsForLevel = (level) => {
      switch(level) {
        case 1: return 5;
        case 2: return 10;
        case 3: return 15;
        case 4: return 25;
        default: return 5;
      }
    };

    const currentMaxBuildings = getMaxBuildingsForLevel(townHall.level);
    const nextMaxBuildings = townHall.level < 4 ? getMaxBuildingsForLevel(townHall.level + 1) : null;

    res.json({
      success: true,
      data: {
        townHall,
        currentLevel: townHall.level,
        maxLevel: 4,
        currentMaxBuildings,
        nextMaxBuildings,
        canUpgrade: townHall.level < 4
      }
    });

  } catch (error) {
    console.error('Error in getTownHallInfo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  // 👤 Perfil de Usuario - Obtener información completa del usuario y su aldea
  getUserProfile,
  
  // 🏘️ Info de Aldea - Obtener solo la información de la aldea del usuario (nombre, icono, descripción)
  getUserVillage,
  
  // 🏗️ Edificios del Usuario - Listar todos los edificios construidos por el usuario
  getUserBuildings,
  
  // ➕ Crear Edificio - Construir nuevo edificio en la aldea (costo de recursos)
  createBuilding,
  
  // 🗑️ Eliminar Edificio - Demoler edificio existente de la aldea
  deleteBuilding,
  
  // 📋 Tipos de Edificios - Obtener catálogo de todos los edificios disponibles para construir
  getBuildingTypes,
  
  // ✅ Asegurar Aldea - Verificar que el usuario tenga aldea, crearla si no existe
  ensureUserVillage,
  
  // 🧹 Limpiar Ayuntamientos - Eliminar ayuntamientos duplicados (solo debe haber uno)
  cleanupDuplicateTownHalls,
  
  // 🔢 Verificar Límite - Comprobar si se puede construir más edificios (límite basado en nivel)
  checkBuildingLimit,
  
  // 💰 Actualizar Recursos - Modificar recursos del usuario (consumo/generación)
  updateUserResources,
  
  // ⬆️ Mejorar Edificio - Subir nivel de edificio existente (costo de recursos)
  upgradeBuilding,
  
  // 💎 Obtener Recursos - Consultar recursos actuales del usuario
  getUserResources,
  
  // 🔄 Mover Edificio - Cambiar posición de un edificio en el mapa de la aldea
  moveBuilding,
  
  // 👥 Obtener Población - Consultar población actual y límite del usuario
  getUserPopulation,
  
  // Funciones de entrenamiento de tropas
  
  // 🎯 Iniciar Entrenamiento - Comenzar entrenamiento de tropas en cuartel
  startTroopTraining,
  
  // ✅ Completar Entrenamiento - Finalizar entrenamiento y agregar tropas al inventario
  completeTroopTraining,
  
  // ⏳ Cola de Entrenamiento - Ver tropas que están en proceso de entrenamiento
  getTrainingQueue,
  
  // 🎖️ Tipos de Tropas - Obtener catálogo de tropas disponibles para entrenar
  getTroopTypes,
  
  // ⚔️ Tropas del Usuario - Listar tropas que posee el usuario
  getUserTroops,
  
  // 📊 NUEVOS ENDPOINTS - LÓGICA DE VALIDACIÓN
  getBuildingLimits,
  getUpgradeCost,
  canUpgradeBuildingEndpoint,
  getProductionRate,
  getTownHallInfo
};
