const supabase = require('../config/supabase');

/**
 * Controlador para el mapa global de aldeas
 */

// Obtener todas las aldeas para el mapa global
const getAllVillages = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🗺️ Cargando aldeas para el mapa global...');
    
    // Asegurar que el usuario actual tenga una aldea
    await ensureUserHasVillage(userId);
    
    // Cargar aldeas sin JOIN
    let villageData = [];
    
    try {
      const { data, error } = await supabase
        .from('villages')
        .select(`
          id,
          user_id,
          village_name,
          village_icon,
          position_x,
          position_y,
          description,
          level,
          created_at
        `);

      if (error) {
        if (error.code === '42P01') { // Tabla no existe
          console.log('ℹ️ Tabla villages no existe, devolviendo lista vacía');
          villageData = [];
        } else {
          throw error;
        }
      } else {
        villageData = data || [];
      }
    } catch (tableError) {
      console.log('⚠️ Error accediendo a tabla villages:', tableError.message);
      villageData = [];
    }

    // Obtener información de usuarios por separado
    const userIds = [...new Set(villageData.map(v => v.user_id))];
    let usersData = {};
    
    if (userIds.length > 0) {
      try {
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (!usersError && users?.users) {
          users.users.forEach(user => {
            if (userIds.includes(user.id)) {
              usersData[user.id] = {
                email: user.email,
                username: user.user_metadata?.username || user.email
              };
            }
          });
        }
      } catch (userError) {
        console.log('⚠️ Error obteniendo usuarios:', userError.message);
      }
    }

    // Formatear datos con nombres de usuario reales
    const data = villageData.map(village => {
      const userData = usersData[village.user_id];
      const displayName = userData?.username || userData?.email || `Jugador ${village.user_id.substring(0, 8)}`;
      
      console.log(`🏘️ Aldea: ${village.village_name} - Owner user_id: ${village.user_id}`);
      
      return {
        ...village,
        user_display_name: displayName
      };
    });

    console.log(`✅ Respuesta del mapa global: ${data.length} aldeas encontradas`);

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error in getAllVillages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Obtener detalles de una aldea específica
const getVillageDetails = async (req, res) => {
  try {
    const { villageId } = req.params;

    const { data: village, error: villageError } = await supabase
      .from('villages')
      .select(`
        *,
        users!villages_user_id_fkey (
          username,
          email
        )
      `)
      .eq('id', villageId)
      .single();

    if (villageError || !village) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aldea no encontrada' 
      });
    }

    // Obtener recursos públicos de la aldea
    const { data: resources, error: resourcesError } = await supabase
      .from('user_resources')
      .select('wood, stone, food, iron, gold')
      .eq('user_id', village.user_id)
      .single();

    // Obtener edificios de la aldea (solo información básica)
    const { data: buildings, error: buildingsError } = await supabase
      .from('user_buildings')
      .select(`
        level,
        building_types (
          name,
          emoji
        )
      `)
      .eq('user_id', village.user_id);

    const villageDetails = {
      ...village,
      user_display_name: village.users?.username || village.users?.email || 'Usuario desconocido',
      public_resources: resources || { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 },
      buildings_summary: buildings || []
    };

    res.json({
      success: true,
      data: villageDetails
    });

  } catch (error) {
    console.error('Error in getVillageDetails:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Actualizar información de la aldea del usuario
const updateUserVillage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { villageName, villageIcon, description } = req.body;

    console.log('🔧 Actualizando aldea del usuario:', userId);
    console.log('📝 Datos recibidos:', { villageName, villageIcon, description });

    // Obtener aldea actual del usuario
    const { data: currentVillage, error: findError } = await supabase
      .from('villages')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (findError) {
      console.error('❌ Error al buscar aldea:', findError);
      return res.status(404).json({ 
        success: false, 
        message: 'Aldea no encontrada' 
      });
    }

    // Actualizar aldea (nombre, icono y descripción)
    const updateData = {};
    if (villageName !== undefined) updateData.village_name = villageName;
    if (villageIcon !== undefined) updateData.village_icon = villageIcon;
    if (description !== undefined) updateData.description = description;

    console.log('💾 Datos a actualizar:', updateData);

    const { data: updatedVillage, error: updateError } = await supabase
      .from('villages')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating village:', updateError);
      return res.status(500).json({ 
        success: false, 
        message: `Error al actualizar aldea: ${updateError.message}` 
      });
    }

    console.log('✅ Aldea actualizada exitosamente:', updatedVillage);
    res.json({
      success: true,
      data: updatedVillage,
      message: 'Aldea actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error in updateUserVillage:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Donar recursos a otro usuario
const donateResources = async (req, res) => {
  try {
    const donorId = req.user.id;
    const { recipientUserId, donations } = req.body;

    console.log(`💝 Procesando donación de usuario ${donorId} a usuario ${recipientUserId}:`, donations);

    // Validar que hay donaciones
    if (!donations || typeof donations !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Datos de donación inválidos'
      });
    }

    // Calcular total de donación y validar
    const donationTypes = ['wood', 'stone', 'iron', 'food'];
    const normalizedDonations = {};
    let totalDonation = 0;

    donationTypes.forEach(type => {
      const amount = Number(donations[type] || 0);
      if (amount > 0) {
        normalizedDonations[type] = amount;
        totalDonation += amount;
      }
    });

    if (totalDonation === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes donar al menos un recurso'
      });
    }

    console.log(`💰 Donaciones normalizadas:`, normalizedDonations);

    // 1. OBTENER RECURSOS ACTUALES DEL DONADOR
    const { data: donorResources, error: donorError } = await supabase
      .from('user_resources')
      .select('wood, stone, iron, food')
      .eq('user_id', donorId)
      .single();

    if (donorError || !donorResources) {
      console.log('❌ Error obteniendo recursos del donador:', donorError);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar tus recursos'
      });
    }

    console.log('💰 Recursos actuales del donador:', donorResources);

    // 2. VALIDAR QUE EL DONADOR TIENE SUFICIENTES RECURSOS
    const insufficientResources = [];
    donationTypes.forEach(type => {
      if (normalizedDonations[type] > 0) {
        const available = donorResources[type] || 0;
        const required = normalizedDonations[type];
        if (available < required) {
          insufficientResources.push(`${type}: necesitas ${required}, tienes ${available}`);
        }
      }
    });

    if (insufficientResources.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Recursos insuficientes. ${insufficientResources.join(', ')}`
      });
    }

    console.log('✅ Validación de recursos exitosa');

    // 3. OBTENER O CREAR RECURSOS DEL RECEPTOR
    let { data: recipientResources, error: recipientError } = await supabase
      .from('user_resources')
      .select('wood, stone, iron, food')
      .eq('user_id', recipientUserId)
      .single();

    if (recipientError && recipientError.code === 'PGRST116') {
      // Crear recursos para el receptor si no existen
      console.log('🏗️ Creando recursos iniciales para el receptor');
      const { data: createdResources, error: createError } = await supabase
        .from('user_resources')
        .insert({
          user_id: recipientUserId,
          wood: 200,
          stone: 200,
          iron: 200,
          food: 200,
          gold: 0,
          elixir: 0,
          gems: 0,
          population: 0,
          max_population: 10
        })
        .select('wood, stone, iron, food')
        .single();

      if (createError) {
        console.error('❌ Error creando recursos del receptor:', createError);
        return res.status(500).json({
          success: false,
          message: 'Error al crear recursos del receptor'
        });
      }
      recipientResources = createdResources;
    } else if (recipientError) {
      console.error('❌ Error obteniendo recursos del receptor:', recipientError);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar recursos del receptor'
      });
    }

    console.log('💰 Recursos actuales del receptor:', recipientResources);

    // 4. CALCULAR NUEVOS RECURSOS
    const newDonorResources = {
      wood: Math.max(0, donorResources.wood - (normalizedDonations.wood || 0)),
      stone: Math.max(0, donorResources.stone - (normalizedDonations.stone || 0)),
      iron: Math.max(0, donorResources.iron - (normalizedDonations.iron || 0)),
      food: Math.max(0, donorResources.food - (normalizedDonations.food || 0))
    };

    const newRecipientResources = {
      wood: recipientResources.wood + (normalizedDonations.wood || 0),
      stone: recipientResources.stone + (normalizedDonations.stone || 0),
      iron: recipientResources.iron + (normalizedDonations.iron || 0),
      food: recipientResources.food + (normalizedDonations.food || 0)
    };

    console.log('💸 Nuevos recursos del donador:', newDonorResources);
    console.log('💰 Nuevos recursos del receptor:', newRecipientResources);

    // 5. ACTUALIZAR RECURSOS DEL DONADOR
    const { error: updateDonorError } = await supabase
      .from('user_resources')
      .update(newDonorResources)
      .eq('user_id', donorId);

    if (updateDonorError) {
      console.error('❌ Error actualizando recursos del donador:', updateDonorError);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar tus recursos'
      });
    }

    // 6. ACTUALIZAR RECURSOS DEL RECEPTOR
    const { error: updateRecipientError } = await supabase
      .from('user_resources')
      .update(newRecipientResources)
      .eq('user_id', recipientUserId);

    if (updateRecipientError) {
      console.error('❌ Error actualizando recursos del receptor:', updateRecipientError);
      // TODO: En un sistema robusto, hacer rollback de los recursos del donador
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar recursos del receptor'
      });
    }

    // 7. REGISTRAR HISTORIAL DE DONACIONES
    const donationRecords = [];
    Object.entries(normalizedDonations).forEach(([resourceType, amount]) => {
      donationRecords.push({
        donor_id: donorId,
        recipient_id: recipientUserId,
        resource_type: resourceType,
        amount: amount
        // created_at se genera automáticamente
      });
    });

    // Intentar registrar historial (no crítico si falla)
    try {
      const { error: historyError } = await supabase
        .from('resource_donations')
        .insert(donationRecords);

      if (historyError) {
        console.warn('⚠️ No se pudo registrar historial de donaciones:', historyError);
      } else {
        console.log('📝 Historial de donaciones registrado exitosamente');
      }
    } catch (historyError) {
      console.warn('⚠️ Error al registrar historial:', historyError);
    }

    console.log('✅ Donación completada exitosamente');

    res.json({
      success: true,
      message: 'Donación realizada exitosamente',
      data: {
        donorNewResources: newDonorResources,
        recipientNewResources: newRecipientResources,
        donatedAmounts: normalizedDonations
      }
    });

  } catch (error) {
    console.error('❌ Error in donateResources:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: error.message
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
        gold: 0,
        elixir: 0,
        gems: 0,
        wood: 0,
        stone: 0,
        food: 0,
        iron: 0
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

// Obtener recursos de un usuario específico (para ver detalles de aldea)
const getSpecificUserResources = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('📊 Obteniendo recursos para usuario:', userId);

    const { data, error } = await supabase
      .from('user_resources')
      .select('wood, stone, food, iron, population, max_population')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading specific user resources:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al cargar recursos del usuario' 
      });
    }

    res.json({
      success: true,
      data: data || {
        wood: 0,
        stone: 0,
        food: 0,
        iron: 0,
        population: 0,
        max_population: 10
      }
    });

  } catch (error) {
    console.error('Error in getSpecificUserResources:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Función helper para asegurar que el usuario tenga una aldea
const ensureUserHasVillage = async (userId) => {
  try {
    console.log('🏘️ Verificando aldea para usuario:', userId);
    
    // Si la tabla no existe, no hacer nada
    try {
      // Verificar si ya tiene una aldea
      const { data: existingVillage, error: checkError } = await supabase
        .from('villages')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingVillage && !checkError) {
        console.log('✅ Usuario ya tiene aldea');
        return;
      }

      // Crear aldea automáticamente solo si la tabla existe
      console.log('🏘️ Creando aldea automáticamente para usuario:', userId);
      
      const { error: createError } = await supabase
        .from('villages')
        .insert({
          user_id: userId,
          village_name: 'Mi Aldea',
          position_x: Math.floor(Math.random() * 20),
          position_y: Math.floor(Math.random() * 20),
          description: 'Una próspera aldea en el mundo de Clash',
          level: 1
        });

      if (createError) {
        console.error('Error creando aldea automáticamente:', createError);
      } else {
        console.log('✅ Aldea creada automáticamente');
      }

    } catch (tableError) {
      if (tableError.code === '42P01') {
        console.log('ℹ️ Tabla villages no existe, omitiendo creación de aldea');
      } else {
        console.log('⚠️ Error verificando aldea:', tableError.message);
      }
    }

  } catch (error) {
    console.error('Error in ensureUserHasVillage:', error);
  }
};

// Obtener historial de donaciones del usuario
const getUserDonations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // 'sent' o 'received'
    
    console.log('🌐 GET /api/map/donations llamado', {
      userId,
      type,
      query: req.query,
      url: req.originalUrl,
      method: req.method
    });
    
    console.log(`📋 Cargando donaciones ${type || 'todas'} para usuario:`, userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    let query = supabase
      .from('resource_donations')
      .select(`
        id,
        donor_id,
        recipient_id,
        resource_type,
        amount,
        created_at
      `)
      .order('created_at', { ascending: false });

    // Filtrar según el tipo
    if (type === 'sent') {
      query = query.eq('donor_id', userId);
    } else if (type === 'received') {
      query = query.eq('recipient_id', userId);
    } else {
      // Si no especifica tipo, obtener todas (enviadas y recibidas)
      query = query.or(`donor_id.eq.${userId},recipient_id.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error cargando donaciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cargar el historial de donaciones',
        error: error.message
      });
    }

    console.log(`✅ Donaciones cargadas: ${data?.length || 0} registros`);

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in getUserDonations:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener poder defensivo de un usuario específico para batallas
const getUserDefensePower = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🛡️ Calculando poder defensivo para usuario:', userId);

    // Primero intentar obtener desde user_defense_power
    const { data: defenseData } = await supabase
      .from('user_defense_power')
      .select('total_defense_power')
      .eq('user_id', userId)
      .single();

    if (defenseData?.total_defense_power) {
      console.log('🛡️ Poder defensivo desde torres:', defenseData.total_defense_power);
      return res.json({
        success: true,
        data: {
          defense_power: defenseData.total_defense_power,
          source: 'towers'
        }
      });
    }

    // Fallback: calcular desde tropas del usuario
    const { data: userTroops, error: troopsError } = await supabase
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

    if (troopsError) {
      console.error('Error obteniendo tropas:', troopsError);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo tropas del usuario'
      });
    }

    // Calcular poder total desde tropas
    const totalPower = (userTroops || []).reduce((total, troop) => {
      const power = troop.troop_types?.power || 0;
      return total + (troop.quantity * power);
    }, 0);

    console.log('🛡️ Poder defensivo calculado desde tropas:', totalPower);

    res.json({
      success: true,
      data: {
        defense_power: totalPower,
        source: 'troops',
        troop_count: userTroops?.length || 0
      }
    });

  } catch (error) {
    console.error('Error in getUserDefensePower:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para registrar batallas (puede ser llamada desde otros controladores)
const recordBattleUtil = async (battleData) => {
  try {
    const {
      attacker_id,
      defender_id,
      attacker_village_name = 'Aldea del Atacante',
      defender_village_name = 'Aldea del Defensor',
      attacker_power,
      defender_power,
      attacker_wins,
      stolen_wood = 0,
      stolen_stone = 0,
      stolen_food = 0,
      stolen_iron = 0,
      attacker_troop_losses = {},
      defender_troop_losses = {},
      attacking_troops = {},
      notes = null
    } = battleData;

    console.log('🏛️ Registrando batalla en historial...');
    console.log('📊 Atacante:', attacker_id);
    console.log('🛡️ Defensor:', defender_id);
    console.log('⚔️ Resultado:', attacker_wins ? 'Victoria atacante' : 'Victoria defensor');

    const { data: battle, error: battleError } = await supabase
      .from('battle_history')
      .insert({
        attacker_id,
        defender_id,
        attacker_village_name,
        defender_village_name,
        attacker_power,
        defender_power,
        attacker_wins,
        stolen_wood,
        stolen_stone,
        stolen_food,
        stolen_iron,
        attacker_troop_losses,
        defender_troop_losses,
        attacking_troops,
        notes
      })
      .select()
      .single();

    if (battleError) {
      console.error('❌ Error registrando batalla:', battleError);
      return { success: false, error: battleError };
    }

    console.log('✅ Batalla registrada exitosamente:', battle.id);
    return { success: true, data: battle };

  } catch (error) {
    console.error('Error in recordBattleUtil:', error);
    return { success: false, error };
  }
};

// Registrar una batalla en el historial
const recordBattle = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      defender_id,
      attacker_village_name,
      defender_village_name,
      attacker_power,
      defender_power,
      attacker_wins,
      stolen_wood = 0,
      stolen_stone = 0,
      stolen_food = 0,
      stolen_iron = 0,
      attacker_troop_losses = {},
      defender_troop_losses = {},
      attacking_troops = {},
      notes = null
    } = req.body;

    console.log('🏛️ Registrando batalla en historial...');
    console.log('📊 Atacante:', userId);
    console.log('🛡️ Defensor:', defender_id);
    console.log('⚔️ Resultado:', attacker_wins ? 'Victoria atacante' : 'Victoria defensor');

    const { data: battle, error: battleError } = await supabase
      .from('battle_history')
      .insert({
        attacker_id: userId,
        defender_id,
        attacker_village_name,
        defender_village_name,
        attacker_power,
        defender_power,
        attacker_wins,
        stolen_wood,
        stolen_stone,
        stolen_food,
        stolen_iron,
        attacker_troop_losses,
        defender_troop_losses,
        attacking_troops,
        notes
      })
      .select()
      .single();

    if (battleError) {
      console.error('❌ Error registrando batalla:', battleError);
      return res.status(500).json({
        success: false,
        message: 'Error registrando la batalla'
      });
    }

    console.log('✅ Batalla registrada exitosamente:', battle.id);

    res.json({
      success: true,
      message: 'Batalla registrada en el historial',
      data: battle
    });

  } catch (error) {
    console.error('Error in recordBattle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener historial de batallas del usuario
const getBattleHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'all', limit = 50, offset = 0 } = req.query;

    console.log('📋 Obteniendo historial de batallas para usuario:', userId);
    console.log('🔍 Tipo:', type, '| Límite:', limit, '| Offset:', offset);

    let query = supabase
      .from('battle_history')
      .select(`
        id,
        attacker_id,
        defender_id,
        attacker_village_name,
        defender_village_name,
        attacker_power,
        defender_power,
        attacker_wins,
        stolen_wood,
        stolen_stone,
        stolen_food,
        stolen_iron,
        attacker_troop_losses,
        defender_troop_losses,
        attacking_troops,
        battle_date,
        notes
      `)
      .order('battle_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar según el tipo solicitado
    if (type === 'attacks') {
      query = query.eq('attacker_id', userId);
    } else if (type === 'defenses') {
      query = query.eq('defender_id', userId);
    } else {
      // type === 'all' - mostrar tanto ataques como defensas
      query = query.or(`attacker_id.eq.${userId},defender_id.eq.${userId}`);
    }

    const { data: battles, error: battlesError } = await query;

    if (battlesError) {
      console.error('❌ Error obteniendo historial:', battlesError);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo historial de batallas'
      });
    }

    // Obtener información de usuarios para nombres
    const userIds = [...new Set([
      ...battles.map(b => b.attacker_id),
      ...battles.map(b => b.defender_id)
    ])];

    let usersData = {};
    if (userIds.length > 0) {
      try {
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (!usersError && users?.users) {
          users.users.forEach(user => {
            if (userIds.includes(user.id)) {
              usersData[user.id] = {
                email: user.email,
                username: user.user_metadata?.username || user.email
              };
            }
          });
        }
      } catch (userError) {
        console.log('⚠️ Error obteniendo usuarios:', userError.message);
      }
    }

    // Formatear datos con información adicional
    const formattedBattles = battles.map(battle => {
      const attackerData = usersData[battle.attacker_id];
      const defenderData = usersData[battle.defender_id];
      const isUserAttacker = battle.attacker_id === userId;
      
      return {
        ...battle,
        attacker_username: attackerData?.username || `Usuario ${battle.attacker_id.substring(0, 8)}`,
        defender_username: defenderData?.username || `Usuario ${battle.defender_id.substring(0, 8)}`,
        user_role: isUserAttacker ? 'attacker' : 'defender',
        user_won: isUserAttacker ? battle.attacker_wins : !battle.attacker_wins,
        total_stolen_resources: battle.stolen_wood + battle.stolen_stone + battle.stolen_food + battle.stolen_iron
      };
    });

    console.log(`✅ Historial obtenido: ${formattedBattles.length} batallas`);

    res.json({
      success: true,
      data: formattedBattles,
      meta: {
        count: formattedBattles.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        type
      }
    });

  } catch (error) {
    console.error('Error in getBattleHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  // 🗺️ Mapa Global - Obtener todas las aldeas con información básica para mostrar en el mapa global
  getAllVillages,
  
  // 🔍 Detalles de Aldea - Obtener información detallada de una aldea específica (recursos, edificios, etc.)
  getVillageDetails,
  
  // ⚙️ Actualizar Aldea - Permite al usuario cambiar nombre, descripción e icono de su aldea
  updateUserVillage,
  
  // 🎁 Donaciones - Transferir recursos de un usuario a otro (wood, stone, food, iron)
  donateResources,
  
  // 💰 Recursos del Usuario - Obtener los recursos actuales del usuario autenticado
  getUserResources,
  
  // 👤 Recursos de Usuario Específico - Obtener recursos de cualquier usuario por su ID
  getSpecificUserResources,
  
  // 📊 Historial de Donaciones - Ver todas las donaciones enviadas y recibidas por el usuario
  getUserDonations,
  
  // 🛡️ Poder Defensivo - Calcular el poder total de defensa de una aldea (tropas + edificios defensivos)
  getUserDefensePower,
  
  // ⚔️ Registrar Batalla - Guardar resultado de batalla en la base de datos con recursos robados
  recordBattle,
  
  // 🔧 Registrar Batalla (Utilidad) - Función auxiliar para registrar batallas desde otros controladores
  recordBattleUtil,
  
  // 📜 Historial de Batallas - Obtener historial completo de batallas del usuario (como atacante y defensor)
  getBattleHistory
};
