// Servicio para manejar recursos a través del backend API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ResourceAPI {
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

  // Obtener recursos del usuario
  async getUserResources() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/resources/`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('Error getting user resources:', error);
      throw error;
    }
  }

  // Inicializar recursos del usuario
  async initializeUserResources() {
    try {
      return await this.makeRequest(`${this.baseURL}/api/resources/initialize`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error initializing user resources:', error);
      throw error;
    }
  }

  // Actualizar recursos del usuario
  async updateUserResources(resources) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/resources/`, {
        method: 'PUT',
        body: JSON.stringify(resources)
      });
    } catch (error) {
      console.error('Error updating user resources:', error);
      throw error;
    }
  }

  // Calcular recursos offline
  async calculateOfflineResources(minutesOffline) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/resources/calculate-offline`, {
        method: 'POST',
        body: JSON.stringify({ minutesOffline })
      });
    } catch (error) {
      console.error('Error calculating offline resources:', error);
      throw error;
    }
  }

  // Recolectar recursos offline
  async collectOfflineResources(minutesOffline) {
    try {
      return await this.makeRequest(`${this.baseURL}/api/resources/collect-offline`, {
        method: 'POST',
        body: JSON.stringify({ minutesOffline })
      });
    } catch (error) {
      console.error('Error collecting offline resources:', error);
      throw error;
    }
  }
}

// Exportar instancia única
const resourceAPI = new ResourceAPI();
export default resourceAPI;
