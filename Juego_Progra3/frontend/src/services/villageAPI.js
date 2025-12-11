// Servicio para manejar aldeas y edificios a través del backend API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class VillageAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Configurar headers con token de autenticación
  async getHeaders() {
    const token = localStorage.getItem('auth-token');
    
    if (!token) {
      console.warn('⚠️ No auth token found in localStorage');
      // Intentar obtener token de Supabase
      try {
        const { supabase } = await import('../supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          localStorage.setItem('auth-token', session.access_token);
          if (session.refresh_token) {
            localStorage.setItem('refresh-token', session.refresh_token);
          }
          console.log('✅ Token obtained from Supabase session');
          return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          };
        }
      } catch (error) {
        console.error('❌ Could not get token from Supabase:', error);
      }
      
      // Si no hay token, redirigir al login
      console.warn('🚫 No valid token available, redirecting to login');
      window.location.href = '/login';
      return {
        'Content-Type': 'application/json',
        'Authorization': ''
      };
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Manejar respuestas de la API con renovación de token
  async handleResponse(response) {
    // Si el token expiró, intentar renovarlo
    if (response.status === 401) {
      console.log('🔒 Authentication failed (401), attempting to refresh token...');
      
      try {
        const refreshed = await this.attemptTokenRefresh();
        if (refreshed) {
          console.log('✅ Token refreshed successfully, request can be retried');
          throw new Error('TOKEN_REFRESH_NEEDED'); // Señal para reintentar la solicitud
        } else {
          console.warn('⚠️ Token refresh failed, but not forcing logout yet');
          // NO forzar logout inmediatamente, solo lanzar error para manejo superior
          throw new Error('Authentication may have expired. Some features may not work.');
        }
      } catch (refreshError) {
        console.warn('⚠️ Error during token refresh:', refreshError.message);
        throw new Error('Authentication issues detected. Please try again.');
      }
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      // Distinguir entre errores de validación del juego (400) y errores reales
      if (response.status === 400) {
        // Los errores 400 son validaciones esperadas del juego (recursos, posición, etc.)
        // NO registrar como error, solo como información del juego
        console.info(`🎮 Reglas del juego aplicadas:`, data.message || 'Validación fallida');
        return { success: false, message: data.message };
      } else {
        // Otros errores sí son problemáticos
        console.error(`❌ API Error ${response.status}:`, data.message || 'Unknown error');
      }
      
      // Mensajes de error más específicos para errores reales
      if (response.status === 403) {
        throw new Error('Access forbidden. Please check your permissions.');
      } else if (response.status === 404) {
        throw new Error(data.message || 'Resource not found');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      
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
      
      // Primero verificar si hay una sesión activa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session?.access_token && session?.expires_at) {
        // Verificar si el token actual aún es válido (con margen de 5 minutos)
        const expiresAt = session.expires_at * 1000; // Convertir a milisegundos
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (expiresAt > now + fiveMinutes) {
          // Token aún válido, actualizarlo
          localStorage.setItem('auth-token', session.access_token);
          if (session.refresh_token) {
            localStorage.setItem('refresh-token', session.refresh_token);
          }
          console.log('✅ Token still valid, updated in localStorage');
          return true;
        }
      }
      
      // Si el token está próximo a expirar o ya expiró, intentar renovar
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshData?.session?.access_token) {
        localStorage.setItem('auth-token', refreshData.session.access_token);
        if (refreshData.session.refresh_token) {
          localStorage.setItem('refresh-token', refreshData.session.refresh_token);
        }
        console.log('✅ Token refreshed successfully');
        return true;
      }
      
      // Si no se pudo renovar, limpiar tokens inválidos pero NO forzar logout
      console.warn('⚠️ Could not refresh token, clearing auth data but not redirecting');
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      
      // NO redirigir automáticamente, dejar que el componente lo maneje
      // window.location.href = '/login';
      console.log('🔄 Returning false to allow graceful handling');
      return false;
      
    } catch (error) {
      console.error('❌ Failed to refresh token:', error.message);
      // Limpiar tokens en caso de error pero NO redirigir
      localStorage.removeItem('auth-token');
      localStorage.removeItem('refresh-token');
      console.log('🔄 Returning false to allow graceful error handling');
      return false;
    }
  }

  // Wrapper para hacer solicitudes con retry automático
  async makeRequest(url, options = {}) {
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts) {
      try {
        console.log(`📡 API Request (attempt ${attempt + 1}):`, url);
        
        const headers = await this.getHeaders();
        const response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
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

  // Obtener información de la aldea del usuario
  async getUserVillage() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/info`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting user village:', error);
      throw error;
    }
  }

  // Obtener tipos de edificios disponibles
  async getBuildingTypes() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/building-types`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting building types:', error);
      throw error;
    }
  }

  // Obtener información de población
  async getUserPopulation() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/population`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting user population:', error);
      throw error;
    }
  }

  // Asegurar que el usuario tenga una aldea inicializada
  async ensureUserVillage() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/ensure-village`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error ensuring user village:', error);
      throw error;
    }
  }

  // Crear un nuevo edificio
  async createBuilding(buildingTypeId, positionX, positionY, level = 1) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/buildings`, {
        method: 'POST',
        body: JSON.stringify({
          buildingTypeId: buildingTypeId,
          positionX: positionX,
          positionY: positionY,
          level
        })
      });
    } catch (error) {
      console.error('Error creating building:', error);
      throw error;
    }
  }

  // Eliminar un edificio
  async deleteBuilding(buildingId) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/buildings/${buildingId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting building:', error);
      throw error;
    }
  }

  // Mejorar un edificio
  async upgradeBuilding(buildingId, newLevel) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/buildings/${buildingId}/upgrade`, {
        method: 'PUT',
        body: JSON.stringify({
          newLevel: newLevel
        })
      });
    } catch (error) {
      console.error('Error upgrading building:', error);
      throw error;
    }
  }

  // Mover un edificio a nueva posición
  async moveBuilding(buildingId, newPositionX, newPositionY) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/buildings/${buildingId}/move`, {
        method: 'PUT',
        body: JSON.stringify({
          newPositionX: newPositionX,
          newPositionY: newPositionY
        })
      });
    } catch (error) {
      console.error('Error moving building:', error);
      throw error;
    }
  }

  // Obtener recursos del usuario (método de conveniencia)
  async getUserResources() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/resources/`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting user resources via village API:', error);
      throw error;
    }
  }

  // Verificar límite de edificios
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

  // ========================================
  // NUEVOS MÉTODOS - LÓGICA DEL BACKEND
  // ========================================

  // Obtener límites de edificios según nivel del ayuntamiento
  async getBuildingLimits() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/townhall-info`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting building limits:', error);
      throw error;
    }
  }

  // Obtener costo de mejora de un edificio
  async getUpgradeCost(buildingId) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/buildings/${buildingId}/upgrade-cost`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting upgrade cost:', error);
      throw error;
    }
  }

  // Validar si un edificio puede ser mejorado
  async canUpgradeBuilding(buildingId) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/buildings/${buildingId}/can-upgrade`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error checking if can upgrade:', error);
      throw error;
    }
  }

  // Obtener tasa de producción de un edificio
  async getProductionRate(buildingId) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/village/buildings/${buildingId}/production-rate`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting production rate:', error);
      throw error;
    }
  }
}

// Exportar instancia única
const villageAPI = new VillageAPI();
export default villageAPI;
