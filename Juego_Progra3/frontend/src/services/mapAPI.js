// Servicio para manejar mapa global de aldeas a través del backend API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class MapAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Configurar headers con token de autenticación
  getHeaders() {
    const token = localStorage.getItem('auth-token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Manejar respuestas de la API
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      // Distinguir entre errores de validación (400) y errores técnicos
      if (response.status === 400) {
        // Error de validación de juego - mostrar como información
        console.info(`ℹ️ Validación de donación: ${data.message}`);
      } else {
        // Error técnico - mostrar como error
        console.error(`❌ Error técnico en donación: ${data.message}`);
      }
      throw new Error(data.message || 'Error en la solicitud');
    }
    
    return data;
  }

  // Obtener todas las aldeas para el mapa global
  async getAllVillages() {
    try {
      const response = await fetch(`${this.baseURL}/api/map/villages`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting all villages:', error);
      throw error;
    }
  }

  // Obtener detalles de una aldea específica
  async getVillageDetails(villageId) {
    try {
      const response = await fetch(`${this.baseURL}/api/map/villages/${villageId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting village details:', error);
      throw error;
    }
  }

  // Actualizar información de mi aldea
  async updateMyVillage(villageName, villageIcon, description) {
    try {
      const response = await fetch(`${this.baseURL}/api/map/my-village`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          villageName,
          villageIcon,
          description
        })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating village:', error);
      throw error;
    }
  }

  // Donar recursos a otro usuario
  async donateResources(recipientUserId, donations) {
    try {
      console.log('📤 Enviando donación al backend:', { recipientUserId, donations });
      
      const response = await fetch(`${this.baseURL}/api/map/donate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          recipientUserId,
          donations
        })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error donating resources:', error);
      throw error;
    }
  }

  // Obtener recursos del usuario
  async getUserResources() {
    try {
      const response = await fetch(`${this.baseURL}/api/map/user-resources`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting user resources:', error);
      throw error;
    }
  }

  // Obtener recursos de un usuario específico
  async getSpecificUserResources(userId) {
    try {
      const response = await fetch(`${this.baseURL}/api/map/user-resources/${userId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting specific user resources:', error);
      throw error;
    }
  }
}

// Exportar instancia única
const mapAPI = new MapAPI();
export default mapAPI;
