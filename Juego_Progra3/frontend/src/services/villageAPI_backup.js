// Servicio para manejar aldeas y edificios a través del backend API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class VillageAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Configurar headers con token de autenticación
  getHeaders() {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      console.warn('No auth token found in localStorage');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Manejar respuestas de la API con renovación de token
  async handleResponse(response) {
    // Si el token expiró, intentar renovarlo
    if (response.status === 401) {
      console.log('🔒 Token expired (401), attempting to refresh...');
      const refreshed = await this.attemptTokenRefresh();
      if (refreshed) {
        throw new Error('TOKEN_REFRESH_NEEDED'); // Señal para reintentar la solicitud
      } else {
        // Si no se pudo refrescar, mostrar error más claro
        console.error('❌ Could not refresh token, user needs to login again');
        throw new Error('Authentication expired. Please login again.');
      }
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ API Error ${response.status}:`, data.message || 'Unknown error');
      throw new Error(data.message || 'Error en la solicitud');
    }
    
    return data;
  }

  // Intentar renovar el token usando Supabase directamente
  async attemptTokenRefresh() {
    try {
      console.log('🔄 Attempting token refresh...');
      
      // Intentar usar Supabase para renovar la sesión
      const { supabase } = await import('../supabaseClient');
      
      // Primero intentar renovar explícitamente
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshData?.session?.access_token) {
        localStorage.setItem('auth-token', refreshData.session.access_token);
        if (refreshData.session.refresh_token) {
          localStorage.setItem('refresh-token', refreshData.session.refresh_token);
        }
        console.log('✅ Token refreshed successfully via explicit refresh');
        return true;
      }
      
      // Si no funcionó, intentar obtener sesión existente
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        localStorage.setItem('auth-token', session.access_token);
        if (session.refresh_token) {
          localStorage.setItem('refresh-token', session.refresh_token);
        }
        console.log('✅ Token obtained from existing session');
        return true;
      }
      
      if (refreshError) {
        console.warn('⚠️ Supabase refresh error:', refreshError);
      }
      if (error) {
        console.warn('⚠️ Supabase session error:', error);
      }
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
    }
    
    // Si no se puede renovar, NO limpiar tokens inmediatamente
    // Dar una oportunidad más al usuario de reautenticarse
    console.warn('⚠️ Unable to refresh token automatically');
    
    return false;
  }

  // Wrapper para hacer solicitudes con retry automático
  async makeRequest(url, options = {}) {
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts) {
      try {
        console.log(`📡 API Request (attempt ${attempt + 1}):`, url);
        
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.getHeaders(),
            ...options.headers
          }
        });
        
        return await this.handleResponse(response);
      } catch (error) {
        // Si necesita renovar token, intentar una vez más
        if (error.message === 'TOKEN_REFRESH_NEEDED' && attempt === 0) {
          console.log('🔄 Retrying request with refreshed token...');
          attempt++;
          continue;
        }
        
        // Si es el último intento o un error diferente, lanzar el error
        console.error(`❌ API Request failed after ${attempt + 1} attempts:`, error);
        throw error;
      }
    }
  }

  // Obtener perfil completo del usuario (usuario + aldea)
  async getUserProfile() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/profile`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Obtener edificios del usuario
  async getUserBuildings() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/buildings`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting user buildings:', error);
      throw error;
    }
  }

  // Obtener tipos de edificios disponibles
  async getBuildingTypes() {
    try {
      const response = await fetch(`${this.baseURL}/api/village/building-types`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting building types:', error);
      throw error;
    }
  }

  // Asegurar que el usuario tiene una aldea inicializada
  async ensureUserVillage() {
    try {
      const response = await fetch(`${this.baseURL}/api/village/ensure-village`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error ensuring user village:', error);
      throw error;
    }
  }

  // Crear un nuevo edificio
  async createBuilding(buildingTypeId, positionX, positionY, level = 1) {
    try {
      const response = await fetch(`${this.baseURL}/api/village/buildings`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          buildingTypeId,
          positionX,
          positionY,
          level
        })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating building:', error);
      throw error;
    }
  }

  // Eliminar un edificio
  async deleteBuilding(buildingId) {
    try {
      const response = await fetch(`${this.baseURL}/api/village/buildings/${buildingId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting building:', error);
      throw error;
    }
  }

  // Mejorar un edificio existente
  async upgradeBuilding(buildingId, newLevel) {
    try {
      console.log(`🔗 VillageAPI: Enviando upgrade para edificio ${buildingId} a nivel ${newLevel}`);
      
      const response = await fetch(`${this.baseURL}/api/village/buildings/${buildingId}/upgrade`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          newLevel
        })
      });

      console.log(`📡 VillageAPI: Respuesta recibida, status:`, response.status);
      
      const result = await this.handleResponse(response);
      console.log(`✅ VillageAPI: Resultado procesado:`, result);
      
      return result;
    } catch (error) {
      console.error('❌ VillageAPI: Error upgrading building:', error);
      throw error;
    }
  }

  // Obtener recursos del usuario
  async getUserResources() {
    try {
      const response = await fetch(`${this.baseURL}/api/village/resources`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error getting user resources:', error);
      throw error;
    }
  }

  // Verificar límite de edificios basado en el nivel del ayuntamiento
  async checkBuildingLimit(townHallLevel) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/building-limit?townHallLevel=${townHallLevel}`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error checking building limit:', error);
      throw error;
    }
  }

  // Actualizar recursos del usuario (delegado a resourceAPI por consistencia)
  async updateUserResources(resources) {
    try {
      // Usar resourceAPI para mantener consistencia
      const resourceAPI = (await import('./resourceAPI')).default;
      return await resourceAPI.updateUserResources(resources);
    } catch (error) {
      console.error('Error updating user resources:', error);
      throw error;
    }
  }

  // Limpiar ayuntamientos duplicados
  async cleanupDuplicateTownHalls() {
    try {
      const response = await fetch(`${this.baseURL}/api/village/cleanup-duplicate-townhalls`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error cleaning up duplicate town halls:', error);
      throw error;
    }
  }
}

// Exportar instancia única
const villageAPI = new VillageAPI();
export default villageAPI;
