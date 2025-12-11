import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import chatAPI from '../services/chatAPI';
import UsersList from './UsersListBackend'; // ✅ Versión que usa backend

const ChatSystem = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('global'); // 'global' o 'private'
  const [privateConversations, setPrivateConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // Auto scroll a los mensajes más recientes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar mensajes globales desde el backend
  const loadGlobalMessages = async () => {
    try {
      console.log('🔄 Cargando mensajes globales desde backend...');
      
      const response = await chatAPI.getGlobalMessages(50);
      
      if (response.success) {
        setMessages(response.data || []);
        console.log('✅ Mensajes globales cargados:', response.data?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error cargando mensajes globales:', error);
      setMessages([]);
    }
  };

  // Cargar conversaciones privadas desde el backend
  const loadPrivateConversations = async () => {
    try {
      console.log('🔄 Cargando conversaciones privadas desde backend...');
      
      const response = await chatAPI.getPrivateConversations();
      
      if (response.success) {
        setPrivateConversations(response.data || []);
        console.log('✅ Conversaciones cargadas:', response.data?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
      setPrivateConversations([]);
    }
  };

  // Cargar mensajes de una conversación privada desde el backend
  const loadPrivateMessages = async (otherUserId) => {
    try {
      console.log(`🔄 Cargando mensajes privados con ${otherUserId}...`);
      
      const response = await chatAPI.getPrivateMessages(otherUserId, 50);
      
      if (response.success) {
        setMessages(response.data || []);
        console.log('✅ Mensajes privados cargados:', response.data?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error cargando mensajes privados:', error);
      setMessages([]);
    }
  };

  // Enviar mensaje
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;
    
    setLoading(true);
    console.log('📤 Enviando mensaje:', newMessage.trim());

    try {
      let response;

      if (activeTab === 'global') {
        // Enviar mensaje global
        response = await chatAPI.sendGlobalMessage(newMessage.trim());
      } else if (activeTab === 'private' && selectedConversation) {
        // Enviar mensaje privado
        const recipientId = selectedConversation.otherUserId;
        response = await chatAPI.sendPrivateMessage(recipientId, newMessage.trim());
      }

      if (response && response.success) {
        console.log('✅ Mensaje enviado correctamente');
        setNewMessage('');
        
        // Recargar mensajes
        if (activeTab === 'global') {
          await loadGlobalMessages();
        } else if (selectedConversation) {
          await loadPrivateMessages(selectedConversation.otherUserId);
        }
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      alert('Error al enviar mensaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Formatear nombre de usuario
  const getUserName = (user) => {
    if (!user) return 'Usuario';
    return user.display_name || user.email?.split('@')[0] || 'Usuario';
  };

  // Formatear tiempo
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  // Actualizar presencia del usuario
  const updatePresence = async (status = 'online') => {
    try {
      await chatAPI.updatePresence(status);
    } catch (error) {
      console.warn('⚠️ Error actualizando presencia:', error);
    }
  };

  // Cargar usuarios en línea
  const loadOnlineUsers = async () => {
    try {
      const response = await chatAPI.getOnlineUsers();
      if (response.success) {
        setOnlineUsers(response.data || []);
      }
    } catch (error) {
      console.warn('⚠️ Error cargando usuarios en línea:', error);
    }
  };

  // Inicializar chat
  useEffect(() => {
    if (user && isOpen) {
      // Actualizar presencia al abrir el chat
      updatePresence('online');
      
      if (activeTab === 'global') {
        loadGlobalMessages();
      } else {
        loadPrivateConversations();
      }
      
      loadOnlineUsers();
    }

    // Actualizar presencia al cerrar
    return () => {
      if (user && isOpen) {
        updatePresence('offline');
      }
    };
  }, [user, activeTab, isOpen]);

  // Suscripción en tiempo real a nuevos mensajes (solo notificaciones)
  useEffect(() => {
    if (!user || !isOpen) return;

    console.log('🔔 Configurando suscripción en tiempo real...');

    const channel = supabase
      .channel('chat_messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          console.log('📨 Nuevo mensaje recibido (notificación):', payload.new);
          
          // Recargar mensajes según el tab activo
          if (activeTab === 'global' && payload.new.message_type === 'global') {
            console.log('🔄 Recargando mensajes globales');
            loadGlobalMessages();
          } else if (activeTab === 'private' && payload.new.message_type === 'private') {
            // Verificar si el mensaje es para el usuario actual
            const isForCurrentUser = 
              payload.new.user_id === user.id || 
              payload.new.recipient_id === user.id;
            
            if (isForCurrentUser && selectedConversation) {
              const isForCurrentConversation = 
                (payload.new.user_id === selectedConversation.otherUserId && payload.new.recipient_id === user.id) ||
                (payload.new.recipient_id === selectedConversation.otherUserId && payload.new.user_id === user.id);
              
              if (isForCurrentConversation) {
                console.log('🔄 Recargando mensajes privados');
                loadPrivateMessages(selectedConversation.otherUserId);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Desuscribiendo de notificaciones en tiempo real');
      supabase.removeChannel(channel);
    };
  }, [user, activeTab, isOpen, selectedConversation]);

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Botón para abrir/cerrar chat */}
      <div 
        className={`transition-all duration-300 ${isOpen ? 'w-96 h-96' : 'w-14 h-14'}`}
      >
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl"
            title="Abrir chat"
          >
            💬
          </button>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-2xl border border-purple-500 h-full flex flex-col">
            {/* Header del chat */}
            <div className="bg-purple-600 text-white p-3 rounded-t-lg flex justify-between items-center border-b-2 border-purple-400">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('global')}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    activeTab === 'global' 
                      ? 'bg-white text-purple-600' 
                      : 'bg-purple-500 hover:bg-purple-400 text-white'
                  }`}
                >
                  Global
                </button>
                <button
                  onClick={() => setActiveTab('private')}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    activeTab === 'private' 
                      ? 'bg-white text-purple-600' 
                      : 'bg-purple-500 hover:bg-purple-400 text-white'
                  }`}
                >
                  Privado
                </button>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Contenido del chat */}
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Lista de usuarios para chat privado */}
              {activeTab === 'private' && !selectedConversation && (
                <UsersList 
                  currentUser={user}
                  onStartPrivateChat={(conversation) => {
                    setSelectedConversation(conversation);
                    loadPrivateMessages(conversation.otherUserId);
                  }}
                />
              )}

              {/* Header de conversación privada */}
              {activeTab === 'private' && selectedConversation && (
                <div className="px-3 py-2 bg-gray-100 border-b border-gray-300 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedConversation(null);
                        setMessages([]);
                        loadPrivateConversations();
                      }}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      ←
                    </button>
                    <span className="font-semibold text-sm">
                      {selectedConversation.targetUserName || `Usuario ${selectedConversation.otherUserId?.slice(-4)}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${
                      onlineUsers.some(u => u.user_id === selectedConversation.otherUserId)
                        ? 'bg-green-400'
                        : 'bg-gray-400'
                    }`}></div>
                    <span className="text-xs text-gray-600">
                      {onlineUsers.some(u => u.user_id === selectedConversation.otherUserId) ? 'online' : 'offline'}
                    </span>
                  </div>
                </div>
              )}

              {/* Área de mensajes */}
              {(activeTab === 'global' || (activeTab === 'private' && selectedConversation)) && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-sm">
                        {activeTab === 'global' 
                          ? '¡Sé el primero en escribir!' 
                          : 'Inicia una conversación'}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={msg.id || index} className={`text-sm ${
                        msg.user_id === user.id ? 'text-right' : 'text-left'
                      }`}>
                        <div className={`inline-block p-2 rounded-lg max-w-xs ${
                          msg.user_id === user.id
                            ? 'bg-blue-500 text-white'
                            : msg.is_system_message
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : 'bg-white border border-gray-300'
                        }`}>
                          {!msg.is_system_message && msg.user_id !== user.id && activeTab === 'global' && (
                            <div className="font-semibold text-xs text-gray-600 mb-1">
                              {getUserName(msg.user)}
                            </div>
                          )}
                          <div>{msg.message}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Formulario de envío */}
              {(activeTab === 'global' || (activeTab === 'private' && selectedConversation)) && (
                <div className="p-3 border-t border-gray-300">
                  <form onSubmit={sendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={
                        activeTab === 'global' 
                          ? 'Mensaje global...' 
                          : `Mensaje a ${selectedConversation?.targetUserName || 'usuario'}...`
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      maxLength="500"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading || !newMessage.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? '...' : '📤'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSystem;
