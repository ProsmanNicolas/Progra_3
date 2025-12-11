const supabase = require('../config/supabase');

// Obtener mensajes globales
const getGlobalMessages = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    console.log('📨 Obteniendo mensajes globales...');
    
    // Consulta de mensajes
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('message_type', 'global')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('❌ Error obteniendo mensajes:', error);
      return res.status(400).json({
        success: false,
        message: 'Error al obtener mensajes',
        error: error.message
      });
    }

    if (!messages || messages.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No hay mensajes'
      });
    }

    // Obtener información de usuarios
    const userIds = [...new Set(messages.map(msg => msg.user_id))].filter(Boolean);
    let users = [];

    if (userIds.length > 0) {
      // Intentar obtener usuarios via función RPC
      let { data: usersData, error: usersError } = await supabase
        .rpc('get_users_by_ids', { user_ids: userIds });

      // Si falla, intentar con vista
      if (usersError) {
        console.log('Intentando con vista chat_users...');
        const { data: usersViaView, error: viewError } = await supabase
          .from('chat_users')
          .select('id, email, display_name')
          .in('id', userIds);
        
        if (!viewError) {
          usersData = usersViaView;
          usersError = null;
        }
      }

      // Si aún falla, usar datos básicos
      if (usersError) {
        console.warn('Usando fallback para usuarios');
        users = userIds.map(id => ({
          id,
          email: `Usuario_${id.slice(-4)}`,
          display_name: `Usuario_${id.slice(-4)}`
        }));
      } else {
        users = usersData || [];
      }
    }

    // Combinar mensajes con usuarios
    const messagesWithUsers = messages.map(msg => {
      const userData = users.find(u => u.id === msg.user_id);
      return {
        ...msg,
        user: userData ? {
          email: userData.email,
          display_name: userData.display_name || userData.email.split('@')[0],
          id: userData.id
        } : {
          email: `Usuario_${msg.user_id?.slice(-4) || 'XXXX'}`,
          display_name: `Usuario_${msg.user_id?.slice(-4) || 'XXXX'}`,
          id: msg.user_id
        }
      };
    });

    res.json({
      success: true,
      data: messagesWithUsers,
      count: messagesWithUsers.length
    });

  } catch (error) {
    console.error('💥 Error en getGlobalMessages:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Enviar mensaje global
const sendGlobalMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no puede estar vacío'
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no puede exceder 500 caracteres'
      });
    }

    console.log(`📤 Usuario ${userId} enviando mensaje global`);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: userId,
        message: message.trim(),
        message_type: 'global',
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Error enviando mensaje:', error);
      return res.status(400).json({
        success: false,
        message: 'Error al enviar mensaje',
        error: error.message
      });
    }

    console.log('✅ Mensaje global enviado correctamente');

    res.json({
      success: true,
      data: data[0],
      message: 'Mensaje enviado correctamente'
    });

  } catch (error) {
    console.error('💥 Error en sendGlobalMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener conversaciones privadas del usuario
const getPrivateConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`💬 Obteniendo conversaciones privadas para usuario ${userId}`);

    const { data, error } = await supabase
      .from('private_conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo conversaciones:', error);
      return res.status(400).json({
        success: false,
        message: 'Error al obtener conversaciones',
        error: error.message
      });
    }

    // Agregar ID del otro usuario
    const conversationsWithOtherUser = (data || []).map(conv => ({
      ...conv,
      otherUserId: conv.user1_id === userId ? conv.user2_id : conv.user1_id
    }));

    res.json({
      success: true,
      data: conversationsWithOtherUser,
      count: conversationsWithOtherUser.length
    });

  } catch (error) {
    console.error('💥 Error en getPrivateConversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener mensajes de una conversación privada
const getPrivateMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del otro usuario'
      });
    }

    console.log(`📨 Obteniendo mensajes privados entre ${userId} y ${otherUserId}`);

    // Consulta de mensajes privados entre ambos usuarios
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('message_type', 'private')
      .eq('is_deleted', false)
      .or(`and(user_id.eq.${userId},recipient_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('❌ Error obteniendo mensajes privados:', error);
      return res.status(400).json({
        success: false,
        message: 'Error al obtener mensajes',
        error: error.message
      });
    }

    if (!messages || messages.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No hay mensajes'
      });
    }

    // Obtener información de usuarios
    const userIds = [userId, otherUserId];
    let users = [];

    let { data: usersData, error: usersError } = await supabase
      .rpc('get_users_by_ids', { user_ids: userIds });

    if (usersError) {
      const { data: usersViaView, error: viewError } = await supabase
        .from('chat_users')
        .select('id, email, display_name')
        .in('id', userIds);
      
      if (!viewError) {
        usersData = usersViaView;
        usersError = null;
      }
    }

    if (usersError) {
      users = userIds.map(id => ({
        id,
        email: `Usuario_${id.slice(-4)}`,
        display_name: `Usuario_${id.slice(-4)}`
      }));
    } else {
      users = usersData || [];
    }

    // Combinar mensajes con usuarios
    const messagesWithUsers = messages.map(msg => {
      const userData = users.find(u => u.id === msg.user_id);
      return {
        ...msg,
        user: userData ? {
          email: userData.email,
          display_name: userData.display_name || userData.email.split('@')[0],
          id: userData.id
        } : {
          email: `Usuario_${msg.user_id?.slice(-4) || 'XXXX'}`,
          display_name: `Usuario_${msg.user_id?.slice(-4) || 'XXXX'}`,
          id: msg.user_id
        }
      };
    });

    res.json({
      success: true,
      data: messagesWithUsers,
      count: messagesWithUsers.length
    });

  } catch (error) {
    console.error('💥 Error en getPrivateMessages:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Enviar mensaje privado
const sendPrivateMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipientId, message } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del destinatario'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no puede estar vacío'
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no puede exceder 500 caracteres'
      });
    }

    console.log(`📤 Usuario ${userId} enviando mensaje privado a ${recipientId}`);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: userId,
        recipient_id: recipientId,
        message: message.trim(),
        message_type: 'private',
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Error enviando mensaje privado:', error);
      return res.status(400).json({
        success: false,
        message: 'Error al enviar mensaje',
        error: error.message
      });
    }

    // Actualizar o crear conversación
    const conversationUsers = [userId, recipientId].sort();
    const { error: convError } = await supabase
      .from('private_conversations')
      .upsert({
        user1_id: conversationUsers[0],
        user2_id: conversationUsers[1],
        last_message_at: new Date().toISOString()
      }, {
        onConflict: 'user1_id,user2_id'
      });

    if (convError) {
      console.warn('⚠️ Error actualizando conversación:', convError);
    }

    console.log('✅ Mensaje privado enviado correctamente');

    res.json({
      success: true,
      data: data[0],
      message: 'Mensaje enviado correctamente'
    });

  } catch (error) {
    console.error('💥 Error en sendPrivateMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener usuarios en línea
const getOnlineUsers = async (req, res) => {
  try {
    console.log('👥 Obteniendo usuarios en línea...');

    // Obtener usuarios con status 'online' en los últimos 2 minutos
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: onlineUsers, error } = await supabase
      .from('user_presence')
      .select(`
        user_id,
        status,
        last_seen,
        users (
          id,
          username,
          email
        )
      `)
      .eq('status', 'online')
      .gte('last_seen', twoMinutesAgo);

    if (error) {
      console.error('❌ Error obteniendo usuarios online:', error);
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    console.log(`✅ Usuarios online encontrados: ${onlineUsers?.length || 0}`);

    res.json({
      success: true,
      data: onlineUsers || [],
      count: onlineUsers?.length || 0
    });

  } catch (error) {
    console.error('💥 Error en getOnlineUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Actualizar presencia del usuario
const updatePresence = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body; // 'online', 'offline', 'away'

    console.log(`👤 Actualizando presencia de usuario ${userId} a ${status}`);

    // Actualizar o insertar presencia
    const { error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        status: status || 'online',
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ Error actualizando presencia:', error);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando presencia',
        error: error.message
      });
    }

    console.log(`✅ Presencia actualizada: ${userId} -> ${status}`);

    res.json({
      success: true,
      message: 'Presencia actualizada correctamente'
    });

  } catch (error) {
    console.error('💥 Error en updatePresence:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Eliminar mensaje (soft delete)
const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    // Verificar que el mensaje pertenece al usuario
    const { data: message, error: fetchError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado o no tienes permiso para eliminarlo'
      });
    }

    // Soft delete
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    if (error) {
      console.error('❌ Error eliminando mensaje:', error);
      return res.status(400).json({
        success: false,
        message: 'Error al eliminar mensaje',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Mensaje eliminado correctamente'
    });

  } catch (error) {
    console.error('💥 Error en deleteMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

// Obtener lista de usuarios para chat
const getUsersForChat = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    console.log('👥 Obteniendo lista de usuarios para chat...');

    // Obtener usuarios que tienen aldeas (están activos)
    const { data: villages, error: villagesError } = await supabase
      .from('villages')
      .select('user_id, village_name')
      .neq('user_id', currentUserId);

    if (villagesError) {
      console.error('❌ Error obteniendo aldeas:', villagesError);
      return res.status(400).json({
        success: false,
        message: 'Error al obtener usuarios',
        error: villagesError.message
      });
    }

    if (!villages || villages.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No hay otros usuarios disponibles'
      });
    }

    // Obtener información de usuarios
    const userIds = villages.map(v => v.user_id);
    let users = [];

    // Intentar obtener usuarios via RPC
    let { data: usersData, error: usersError } = await supabase
      .rpc('get_users_by_ids', { user_ids: userIds });

    // Si falla, intentar con vista
    if (usersError) {
      console.log('Intentando con vista chat_users...');
      const { data: usersViaView, error: viewError } = await supabase
        .from('chat_users')
        .select('id, email, display_name')
        .in('id', userIds);
      
      if (!viewError) {
        usersData = usersViaView;
        usersError = null;
      }
    }

    // Usar fallback si falla
    if (usersError) {
      console.warn('Usando fallback para usuarios');
      users = villages.map(village => ({
        user_id: village.user_id,
        village_name: village.village_name,
        user: {
          email: `Usuario_${village.user_id?.slice(-4) || 'XXXX'}@game.com`,
          display_name: `Usuario_${village.user_id?.slice(-4) || 'XXXX'}`
        }
      }));
    } else {
      // Combinar datos
      users = villages.map(village => {
        const userData = usersData?.find(u => u.id === village.user_id);
        return {
          user_id: village.user_id,
          village_name: village.village_name,
          user: userData ? {
            email: userData.email,
            display_name: userData.display_name || userData.email.split('@')[0]
          } : {
            email: `Usuario_${village.user_id?.slice(-4) || 'XXXX'}@game.com`,
            display_name: `Usuario_${village.user_id?.slice(-4) || 'XXXX'}`
          }
        };
      });
    }

    res.json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error) {
    console.error('💥 Error en getUsersForChat:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  // 🌍 Mensajes Globales - Obtener mensajes del chat global visible para todos los usuarios
  getGlobalMessages,
  
  // 📢 Enviar Global - Publicar mensaje en el chat global
  sendGlobalMessage,
  
  // 💬 Conversaciones - Listar todas las conversaciones privadas del usuario
  getPrivateConversations,
  
  // 📨 Mensajes Privados - Obtener mensajes de una conversación privada específica
  getPrivateMessages,
  
  // ✉️ Enviar Privado - Enviar mensaje privado a otro usuario
  sendPrivateMessage,
  
  // 🟢 Usuarios Online - Obtener lista de usuarios conectados actualmente
  getOnlineUsers,
  
  // 💓 Actualizar Presencia - Marcar al usuario como online/activo
  updatePresence,
  
  // 🗑️ Eliminar Mensaje - Borrar un mensaje enviado por el usuario
  deleteMessage,
  
  // 👥 Lista de Usuarios - Obtener todos los usuarios disponibles para chatear
  getUsersForChat
};
