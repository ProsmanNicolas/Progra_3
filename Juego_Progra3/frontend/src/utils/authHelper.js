// Utilidad para manejar problemas de autenticación
import { supabase } from '../supabaseClient';

class AuthHelper {
  constructor() {
    this.refreshPromise = null; // Para evitar múltiples refresh simultáneos
  }

  // Verificar si el token está próximo a expirar
  isTokenNearExpiry() {
    const token = localStorage.getItem('auth-token');
    if (!token) return true;

    try {
      // Decodificar el payload del JWT sin verificación
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const margin = 600; // 10 minutos de margen (aumentado de 5)
      
      const isNearExpiry = payload.exp < (now + margin);
      
      if (isNearExpiry) {
        console.log(`🕐 Token expira en ${payload.exp - now} segundos`);
      }
      
      return isNearExpiry;
    } catch (error) {
      console.warn('⚠️ Error parsing token (asumiendo válido):', error.message);
      return false; // Asumir que es válido si no se puede parsear
    }
  }

  // Renovar token de forma segura (evitando múltiples intentos simultáneos)
  async ensureFreshToken() {
    // Si ya hay una renovación en progreso, esperar a que termine
    if (this.refreshPromise) {
      console.log('⏳ Token refresh already in progress, waiting...');
      return await this.refreshPromise;
    }

    // Si el token no está próximo a expirar, no hacer nada
    if (!this.isTokenNearExpiry()) {
      return true;
    }

    // Iniciar proceso de renovación
    console.log('🔄 Starting token refresh process...');
    this.refreshPromise = this._performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null; // Limpiar la promesa
    }
  }

  // Realizar la renovación real del token
  async _performTokenRefresh() {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        console.log(`🔄 Attempting token refresh (${attempts}/${maxAttempts}) via Supabase...`);
        
        // Intentar renovar explícitamente
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshData?.session?.access_token) {
          this._updateTokens(refreshData.session);
          console.log('✅ Token refreshed successfully via explicit refresh');
          return true;
        }
        
        // Si no funcionó, intentar obtener sesión existente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          this._updateTokens(session);
          console.log('✅ Token obtained from existing session');
          return true;
        }
        
        // Log de errores para diagnóstico
        if (refreshError) {
          console.warn(`⚠️ Refresh error (attempt ${attempts}):`, refreshError.message);
        }
        if (error) {
          console.warn(`⚠️ Session error (attempt ${attempts}):`, error.message);
        }
        
        // Esperar antes del siguiente intento (excepto en el último)
        if (attempts < maxAttempts) {
          console.log(`⏳ Esperando 2 segundos antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.warn(`⚠️ Token refresh attempt ${attempts} failed:`, error.message);
        
        // Esperar antes del siguiente intento (excepto en el último)
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    console.warn(`⚠️ Could not refresh token after ${maxAttempts} attempts`);
    return false;
  }

  // Actualizar tokens en localStorage
  _updateTokens(session) {
    localStorage.setItem('auth-token', session.access_token);
    if (session.refresh_token) {
      localStorage.setItem('refresh-token', session.refresh_token);
    }
  }

  // Limpiar tokens cuando falle la autenticación
  clearTokens() {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('refresh-token');
    console.log('🧹 Tokens cleared from localStorage');
  }

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    return !!localStorage.getItem('auth-token');
  }
}

// Exportar instancia única
const authHelper = new AuthHelper();
export default authHelper;
