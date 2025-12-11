// Servicio para manejar chat a través del backend API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ChatAPI {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/chat`;
  }

  // Obtener token de autenticación
  getAuthToken() {
    return localStorage.getItem('auth-token');
  }

  // Headers comunes
  getHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Manejo de respuestas
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error en la petición');
    }
    
    return data;
  }

  // ========== MENSAJES GLOBALES ==========

  // Obtener mensajes globales
  async getGlobalMessages(limit = 50) {
    try {
      console.log('📨 API: Obteniendo mensajes globales');
      
      const response = await fetch(`${this.baseURL}/global?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Mensajes globales obtenidos:`, result.data?.length || 0);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo mensajes globales:`, error);
      throw error;
    }
  }

  // Enviar mensaje global
  async sendGlobalMessage(message) {
    try {
      console.log('📤 API: Enviando mensaje global');
      
      const response = await fetch(`${this.baseURL}/global`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ message })
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Mensaje global enviado`);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error enviando mensaje global:`, error);
      throw error;
    }
  }

  // ========== MENSAJES PRIVADOS ==========

  // Obtener conversaciones privadas
  async getPrivateConversations() {
    try {
      console.log('💬 API: Obteniendo conversaciones privadas');
      
      const response = await fetch(`${this.baseURL}/conversations`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Conversaciones obtenidas:`, result.data?.length || 0);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo conversaciones:`, error);
      throw error;
    }
  }

  // Obtener mensajes privados con otro usuario
  async getPrivateMessages(otherUserId, limit = 50) {
    try {
      console.log(`💬 API: Obteniendo mensajes privados con ${otherUserId}`);
      
      const response = await fetch(`${this.baseURL}/private/${otherUserId}?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Mensajes privados obtenidos:`, result.data?.length || 0);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo mensajes privados:`, error);
      throw error;
    }
  }

  // Enviar mensaje privado
  async sendPrivateMessage(recipientId, message) {
    try {
      console.log(`📤 API: Enviando mensaje privado a ${recipientId}`);
      
      const response = await fetch(`${this.baseURL}/private`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ recipientId, message })
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Mensaje privado enviado`);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error enviando mensaje privado:`, error);
      throw error;
    }
  }

  // ========== PRESENCIA ==========

  // Obtener usuarios en línea
  async getOnlineUsers() {
    try {
      const response = await fetch(`${this.baseURL}/online-users`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo usuarios en línea:`, error);
      throw error;
    }
  }

  // Actualizar presencia
  async updatePresence(status = 'online') {
    try {
      const response = await fetch(`${this.baseURL}/presence`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ status })
      });

      const result = await this.handleResponse(response);
      return result;
    } catch (error) {
      console.error(`❌ API: Error actualizando presencia:`, error);
      throw error;
    }
  }

  // ========== LISTA DE USUARIOS ==========

  // Obtener lista de usuarios para chat
  async getUsersForChat() {
    try {
      console.log('👥 API: Obteniendo lista de usuarios para chat');
      
      const response = await fetch(`${this.baseURL}/users`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Usuarios obtenidos:`, result.data?.length || 0);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo usuarios:`, error);
      throw error;
    }
  }

  // ========== OTRAS FUNCIONES ==========

  // Eliminar mensaje
  async deleteMessage(messageId) {
    try {
      console.log(`🗑️ API: Eliminando mensaje ${messageId}`);
      
      const response = await fetch(`${this.baseURL}/message/${messageId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Mensaje eliminado`);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error eliminando mensaje:`, error);
      throw error;
    }
  }
}

// Exportar instancia única
const chatAPI = new ChatAPI();
export default chatAPI;
