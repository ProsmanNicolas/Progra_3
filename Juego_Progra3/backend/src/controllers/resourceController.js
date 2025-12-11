const supabase = require('../config/supabase');

/**
 * Controlador para gestión de recursos de usuario
 */

// Obtener recursos actuales del usuario (con generación automática)
const getUserResources = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener recursos actuales
    const { data: currentResources, error } = await supabase
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

    // Si no existen recursos, devolver recursos por defecto
    if (!currentResources) {
      const defaultResources = {
        wood: 1000,
        stone: 800,
        food: 600,
        iron: 400,
        gold: 0,
        elixir: 0,
        gems: 0,
        population: 0,
        max_population: 10
      };

      return res.json({
        success: true,
        data: defaultResources
      });
    }

    // Calcular recursos generados desde la última actualización
    const lastUpdated = new Date(currentResources.last_updated || currentResources.updated_at || new Date());
    const now = new Date();
    const minutesElapsed = Math.floor((now - lastUpdated) / (1000 * 60));

    console.log(`⏰ Verificando generación de recursos - Minutos transcurridos: ${minutesElapsed}`);

    // Solo calcular si ha pasado al menos 1 minuto
    if (minutesElapsed >= 1) {
      console.log(`⏰ Han pasado ${minutesElapsed} minutos desde la última actualización, calculando recursos...`);

      // Obtener edificios generadores de recursos CON datos de nivel
      const { data: buildings, error: buildingsError } = await supabase
        .from('user_buildings_with_level_config')
        .select('*')
        .eq('user_id', userId);

      if (buildingsError) {
        console.error('❌ Error obteniendo edificios:', buildingsError);
      }

      if (!buildingsError && buildings && buildings.length > 0) {
        console.log(`🏗️ Edificios encontrados: ${buildings.length}`);
        
        const resourceGenerators = buildings.filter(
          building => building.building_type === 'resource_generator'
        );

        console.log(`⚙️ Generadores de recursos: ${resourceGenerators.length}`);

        if (resourceGenerators.length > 0) {
          let generatedWood = 0;
          let generatedStone = 0;
          let generatedFood = 0;
          let generatedIron = 0;

          // Calcular recursos generados por cada edificio
          resourceGenerators.forEach(building => {
            const resourceType = building.resource_type;
            const baseRate = building.base_production_rate || 0;
            
            // Calcular producción considerando nivel del edificio
            const multiplier = building.production_multiplier || 1;
            const extra = building.extra_production || 0;
            const resourcesPerMinute = (baseRate * multiplier) + extra;
            const totalGenerated = resourcesPerMinute * minutesElapsed;

            console.log(`🏭 ${building.building_type_name || resourceType} (Nv.${building.level}): ${resourcesPerMinute}/min (base:${baseRate} × mult:${multiplier} + extra:${extra}) * ${minutesElapsed}min = ${totalGenerated}`);

            switch(resourceType) {
              case 'wood':
                generatedWood += totalGenerated;
                break;
              case 'stone':
                generatedStone += totalGenerated;
                break;
              case 'food':
                generatedFood += totalGenerated;
                break;
              case 'iron':
                generatedIron += totalGenerated;
                break;
            }
          });

          // Actualizar recursos con lo generado
          const updatedResources = {
            wood: (currentResources.wood || 0) + Math.floor(generatedWood),
            stone: (currentResources.stone || 0) + Math.floor(generatedStone),
            food: (currentResources.food || 0) + Math.floor(generatedFood),
            iron: (currentResources.iron || 0) + Math.floor(generatedIron),
            last_updated: now.toISOString()
          };

          const { data: updated, error: updateError } = await supabase
            .from('user_resources')
            .update(updatedResources)
            .eq('user_id', userId)
            .select()
            .single();

          if (!updateError) {
            console.log(`✅ Recursos generados: +${Math.floor(generatedWood)} madera, +${Math.floor(generatedStone)} piedra, +${Math.floor(generatedFood)} comida, +${Math.floor(generatedIron)} hierro`);
            
            return res.json({
              success: true,
              data: updated,
              generated: {
                wood: Math.floor(generatedWood),
                stone: Math.floor(generatedStone),
                food: Math.floor(generatedFood),
                iron: Math.floor(generatedIron),
                minutesElapsed
              }
            });
          } else {
            console.error('❌ Error actualizando recursos:', updateError);
          }
        } else {
          console.log('⚠️ No hay edificios generadores de recursos');
        }
      } else {
        console.log('⚠️ No se encontraron edificios');
      }
    } else {
      console.log(`⏸️ Solo han pasado ${minutesElapsed} minutos, esperando al menos 1 minuto`);
    }

    // Si no se generó nada, devolver recursos actuales (sin actualizar last_updated)
    res.json({
      success: true,
      data: currentResources
    });

  } catch (error) {
    console.error('Error in getUserResources:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Inicializar recursos del usuario si no existen
const initializeUserResources = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verificar si ya existen recursos
    const { data: existingResources, error: checkError } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingResources) {
      return res.json({
        success: true,
        data: existingResources,
        message: 'Recursos ya existían'
      });
    }

    // Crear recursos iniciales
    const { data: newResources, error: createError } = await supabase
      .from('user_resources')
      .insert({
        user_id: userId,
        wood: 1000,
        stone: 800,
        food: 600,
        iron: 400,
        gold: 0,
        elixir: 0,
        gems: 0,
        population: 0,
        max_population: 10,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating initial resources:', createError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al crear recursos iniciales' 
      });
    }

    res.json({
      success: true,
      data: newResources,
      message: 'Recursos inicializados exitosamente'
    });

  } catch (error) {
    console.error('Error in initializeUserResources:', error);
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
    const { wood, stone, food, iron, gold, elixir, gems, population, max_population } = req.body;

    // 🔍 Primero obtener recursos actuales para preservar last_updated
    const { data: currentResources, error: fetchError } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !currentResources) {
      console.error('Error fetching current resources:', fetchError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener recursos actuales' 
      });
    }

    const updateData = {};
    if (wood !== undefined) updateData.wood = wood;
    if (stone !== undefined) updateData.stone = stone;
    if (food !== undefined) updateData.food = food;
    if (iron !== undefined) updateData.iron = iron;
    if (gold !== undefined) updateData.gold = gold;
    if (elixir !== undefined) updateData.elixir = elixir;
    if (gems !== undefined) updateData.gems = gems;
    if (population !== undefined) updateData.population = population;
    if (max_population !== undefined) updateData.max_population = max_population;
    
    // 🔒 Preservar last_updated para que la generación automática funcione
    updateData.last_updated = currentResources.last_updated;

    const { data: updatedResources, error } = await supabase
      .from('user_resources')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user resources:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar recursos' 
      });
    }

    res.json({
      success: true,
      data: updatedResources,
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

// Calcular recursos offline basado en edificios del usuario
const calculateOfflineResources = async (req, res) => {
  try {
    const userId = req.user.id;
    const { minutesOffline } = req.body;

    if (!minutesOffline || minutesOffline <= 0) {
      return res.json({
        success: true,
        data: {
          wood: 0,
          stone: 0,
          food: 0,
          iron: 0,
          totalMinutes: 0
        }
      });
    }

    // Obtener edificios generadores de recursos del usuario (sin building_level_config por ahora)
    const { data: buildings, error: buildingsError } = await supabase
      .from('user_buildings')
      .select(`
        *,
        building_types (
          type,
          resource_type,
          base_production_rate
        )
      `)
      .eq('user_id', userId);

    if (buildingsError) {
      console.error('Error loading user buildings:', buildingsError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al cargar edificios' 
      });
    }

    // Filtrar solo edificios generadores de recursos
    const resourceGenerators = (buildings || []).filter(
      building => building.building_types?.type === 'resource_generator'
    );

    let totalWood = 0;
    let totalStone = 0;
    let totalFood = 0;
    let totalIron = 0;

    // Calcular recursos generados por cada edificio
    resourceGenerators.forEach(building => {
      const resourceType = building.building_types.resource_type;
      const baseRate = building.building_types.base_production_rate || 0;
      
      // Usar el nivel del edificio como multiplicador simple por ahora
      const multiplier = building.level || 1;
      
      const resourcesPerMinute = baseRate * multiplier;
      const totalGenerated = resourcesPerMinute * minutesOffline;

      switch(resourceType) {
        case 'wood':
          totalWood += totalGenerated;
          break;
        case 'stone':
          totalStone += totalGenerated;
          break;
        case 'food':
          totalFood += totalGenerated;
          break;
        case 'iron':
          totalIron += totalGenerated;
          break;
      }
    });

    res.json({
      success: true,
      data: {
        wood: Math.floor(totalWood),
        stone: Math.floor(totalStone),
        food: Math.floor(totalFood),
        iron: Math.floor(totalIron),
        totalMinutes: minutesOffline,
        buildingsCount: resourceGenerators.length
      }
    });

  } catch (error) {
    console.error('Error in calculateOfflineResources:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Recolectar recursos offline y actualizar recursos del usuario
const collectOfflineResources = async (req, res) => {
  try {
    const userId = req.user.id;
    const { minutesOffline } = req.body;

    if (!minutesOffline || minutesOffline <= 0) {
      return res.json({
        success: true,
        data: {
          collectedResources: { wood: 0, stone: 0, food: 0, iron: 0 },
          newTotalResources: null
        }
      });
    }

    // Obtener edificios generadores de recursos del usuario
    const { data: buildings, error: buildingsError } = await supabase
      .from('user_buildings')
      .select(`
        *,
        building_types (
          type,
          resource_type,
          base_production_rate
        )
      `)
      .eq('user_id', userId);

    if (buildingsError) {
      console.error('Error loading user buildings:', buildingsError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al cargar edificios' 
      });
    }

    const resourceGenerators = (buildings || []).filter(
      building => building.building_types?.type === 'resource_generator'
    );

    let totalWood = 0;
    let totalStone = 0;
    let totalFood = 0;
    let totalIron = 0;

    resourceGenerators.forEach(building => {
      const resourceType = building.building_types.resource_type;
      const baseRate = building.building_types.base_production_rate || 0;
      
      // Usar el nivel del edificio como multiplicador simple
      const multiplier = building.level || 1;
      
      const resourcesPerMinute = baseRate * multiplier;
      const totalGenerated = resourcesPerMinute * minutesOffline;

      switch(resourceType) {
        case 'wood':
          totalWood += totalGenerated;
          break;
        case 'stone':
          totalStone += totalGenerated;
          break;
        case 'food':
          totalFood += totalGenerated;
          break;
        case 'iron':
          totalIron += totalGenerated;
          break;
      }
    });

    // Obtener recursos actuales
    const { data: currentResources, error: resourceError } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (resourceError) {
      console.error('Error loading current resources:', resourceError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al cargar recursos actuales' 
      });
    }

    // Calcular nuevos totales
    const collectedResources = {
      wood: Math.floor(totalWood),
      stone: Math.floor(totalStone),
      food: Math.floor(totalFood),
      iron: Math.floor(totalIron)
    };

    const newResources = {
      wood: (currentResources.wood || 0) + collectedResources.wood,
      stone: (currentResources.stone || 0) + collectedResources.stone,
      food: (currentResources.food || 0) + collectedResources.food,
      iron: (currentResources.iron || 0) + collectedResources.iron,
      last_updated: new Date().toISOString()
    };

    // Actualizar recursos en la base de datos
    const { data: updatedResources, error: updateError } = await supabase
      .from('user_resources')
      .update(newResources)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating resources:', updateError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar recursos' 
      });
    }

    res.json({
      success: true,
      data: {
        collectedResources,
        newTotalResources: updatedResources,
        minutesOffline,
        buildingsCount: resourceGenerators.length
      }
    });

  } catch (error) {
    console.error('Error in collectOfflineResources:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

module.exports = {
  // 💰 Obtener Recursos - Consultar recursos actuales del usuario (wood, stone, food, iron)
  getUserResources,
  
  // 🆕 Inicializar Recursos - Crear registro inicial de recursos para nuevo usuario
  initializeUserResources,
  
  // 📝 Actualizar Recursos - Modificar cantidades de recursos del usuario
  updateUserResources,
  
  // ⏰ Calcular Offline - Calcular recursos generados mientras el usuario estuvo desconectado
  calculateOfflineResources,
  
  // 📦 Recolectar Offline - Aplicar recursos generados offline al inventario del usuario
  collectOfflineResources
};
