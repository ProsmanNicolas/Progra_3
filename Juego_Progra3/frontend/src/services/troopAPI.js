// Servicio para gestión de tropas
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class TroopAPI {
  constructor() {
    console.log('🔧 TroopAPI: API_BASE_URL =', API_BASE_URL);
    this.baseURL = `${API_BASE_URL}/api/troops`;
    console.log('🔧 TroopAPI: Full baseURL =', this.baseURL);
  }

  // Obtener token de autenticación desde localStorage
  getAuthToken() {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      console.warn('⚠️ TroopAPI: No se encontró token de autenticación');
    }
    return token;
  }

  // Headers comunes para todas las peticiones
  getHeaders() {
    const token = this.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('⚠️ TroopAPI: Realizando petición sin token de autenticación');
    }
    
    return headers;
  }

  // Manejo de respuestas
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error en la petición');
    }
    
    return data;
  }

  // Obtener tipos de tropas disponibles
  async getTroopTypes() {
    try {
      console.log('🪖 API: Obteniendo tipos de tropas');
      
      const response = await fetch(`${this.baseURL}/types`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Tipos de tropas obtenidos:`, result.data?.length || 0);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo tipos de tropas:`, error);
      throw error;
    }
  }

  // Obtener tropas del usuario
  async getUserTroops() {
    try {
      console.log('👥 API: Obteniendo tropas del usuario');
      
      const response = await fetch(`${this.baseURL}/user-troops`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Tropas del usuario obtenidas:`, result.data?.length || 0);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo tropas del usuario:`, error);
      throw error;
    }
  }

  // Crear/entrenar una tropa
  async createTroop(troopTypeId) {
    try {
      console.log('🏭 API: Creando tropa tipo:', troopTypeId);
      
      const response = await fetch(`${this.baseURL}/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ troopTypeId })
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Tropa creada exitosamente`);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error creando tropa:`, error);
      throw error;
    }
  }

  // Eliminar una tropa
  async deleteTroop(troopTypeId) {
    try {
      console.log('🗑️ API: Eliminando tropa tipo:', troopTypeId);
      
      const response = await fetch(`${this.baseURL}/delete`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ troopTypeId })
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Tropa eliminada exitosamente`);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error eliminando tropa:`, error);
      throw error;
    }
  }

  // Obtener poder defensivo del usuario
  async getUserDefensePower() {
    try {
      console.log('🛡️ API: Obteniendo poder defensivo');
      
      const response = await fetch(`${this.baseURL}/defense-power`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Poder defensivo obtenido:`, result.data?.defensePower || 0);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo poder defensivo:`, error);
      throw error;
    }
  }

  // Asignar tropas a defensa
  async assignTroopsToDefense(buildingId, assignments) {
    try {
      console.log('🛡️ API: Asignando tropas a defensa torre:', buildingId, assignments);
      
      const response = await fetch(`${this.baseURL}/assign-defense`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ buildingId, assignments })
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Tropas asignadas a defensa exitosamente`);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error asignando tropas a defensa:`, error);
      throw error;
    }
  }

  // Obtener asignaciones de tropas de una torre específica
  async getTowerDefenseAssignments(buildingId) {
    try {
      console.log('🏰 API: Obteniendo asignaciones de torre:', buildingId);
      
      const response = await fetch(`${this.baseURL}/tower-defense/${buildingId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Asignaciones de torre obtenidas:`, result.data?.assignedTroops || {});
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo asignaciones de torre:`, error);
      throw error;
    }
  }

  // Obtener todas las asignaciones de defensa del usuario
  async getAllDefenseAssignments() {
    try {
      console.log('🛡️ API: Obteniendo todas las asignaciones de defensa del usuario');
      
      const response = await fetch(`${this.baseURL}/all-defense-assignments`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Todas las asignaciones de defensa obtenidas:`, result.data?.assignments || {});
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo asignaciones de defensa:`, error);
      throw error;
    }
  }

  // Obtener poder defensivo de un usuario específico (para ataques)
  async getTargetDefensePower(targetUserId) {
    try {
      console.log('🎯 API: Obteniendo poder defensivo del objetivo:', targetUserId);
      console.log('🎯 API: URL completa:', `${this.baseURL}/target-defense/${targetUserId}`);
      
      const response = await fetch(`${this.baseURL}/target-defense/${targetUserId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      console.log('📡 API: Respuesta HTTP recibida, status:', response.status);

      const result = await this.handleResponse(response);
      console.log(`✅ API: Poder defensivo del objetivo obtenido:`, result);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo poder defensivo del objetivo:`, error);
      // Retornar estructura válida en caso de error
      return {
        success: false,
        message: error.message,
        data: { defensePower: 0 }
      };
    }
  }

  // Ejecutar batalla
  async executeBattle({ defenderId, attackingTroops }) {
    try {
      console.log('⚔️ API: Ejecutando batalla contra:', defenderId, 'con tropas:', attackingTroops);
      
      const response = await fetch(`${this.baseURL}/battle`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ 
          defenderId,
          attackingTroops
        })
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Batalla ejecutada exitosamente`);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error ejecutando batalla:`, error);
      throw error;
    }
  }
}

// Exportar instancia única
const troopAPI = new TroopAPI();
export default troopAPI;
