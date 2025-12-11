// Servicio para gestión de donaciones
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class DonationAPI {
  constructor() {
    console.log('🔧 DonationAPI: API_BASE_URL =', API_BASE_URL);
    this.baseURL = `${API_BASE_URL}/api/map`;
    console.log('🔧 DonationAPI: Full baseURL =', this.baseURL);
  }

  // Obtener token de autenticación desde localStorage (consistente con otros servicios)
  getAuthToken() {
    const token = localStorage.getItem('auth-token'); // Cambiado de 'token' a 'auth-token'
    if (!token) {
      console.warn('⚠️ DonationAPI: No se encontró token de autenticación');
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
      console.warn('⚠️ DonationAPI: Realizando petición sin token de autenticación');
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

  // Obtener donaciones del usuario
  async getUserDonations(type = 'all') {
    try {
      console.log(`📋 API: Obteniendo donaciones tipo: ${type}`);
      
      const response = await fetch(`${this.baseURL}/donations?type=${type}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await this.handleResponse(response);
      console.log(`✅ API: Donaciones obtenidas:`, result.data?.length || 0);
      
      return result;
    } catch (error) {
      console.error(`❌ API: Error obteniendo donaciones:`, error);
      throw error;
    }
  }

  // Obtener donaciones enviadas
  async getSentDonations() {
    return this.getUserDonations('sent');
  }

  // Obtener donaciones recibidas
  async getReceivedDonations() {
    return this.getUserDonations('received');
  }
}

// Exportar instancia única
const donationAPI = new DonationAPI();
export default donationAPI;
