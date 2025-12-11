import React, { useState, useEffect } from 'react';
import chatAPI from '../services/chatAPI';

const UsersListBackend = ({ currentUser, onStartPrivateChat }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Cargando lista de usuarios desde backend...');
      
      const response = await chatAPI.getUsersForChat();
      
      if (response.success) {
        setUsers(response.data || []);
        console.log('✅ Usuarios cargados:', response.data?.length || 0);
      }
    } catch (err) {
      console.error('❌ Error cargando usuarios:', err);
      setError('Error al cargar la lista de usuarios');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (user) => {
    // Crear objeto de conversación
    const conversation = {
      otherUserId: user.user_id,
      targetUserName: user.user?.display_name || user.village_name || `Usuario ${user.user_id?.slice(-4)}`
    };
    
    onStartPrivateChat(conversation);
  };

  if (loading) {
    return (
      <div className="p-4 text-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-sm text-gray-400 mt-2">Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center bg-gray-900">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={loadUsers}
          className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-4 text-center bg-gray-900">
        <p className="text-sm text-gray-400">
          No hay otros jugadores disponibles para chatear.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-900">
      <div className="p-3">
        <h3 className="text-sm font-semibold text-purple-400 mb-2">
          Jugadores disponibles ({users.length})
        </h3>
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.user_id}
              onClick={() => handleStartChat(user)}
              className="w-full p-3 bg-gray-800 border border-purple-500 rounded-lg hover:bg-gray-700 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-white">
                    {user.user?.display_name || `Usuario ${user.user_id?.slice(-4)}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    🏰 {user.village_name || 'Aldea'}
                  </div>
                </div>
                <div className="text-purple-400">
                  →
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UsersListBackend;
