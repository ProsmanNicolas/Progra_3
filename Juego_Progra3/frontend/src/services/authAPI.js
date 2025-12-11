// Servicio para manejar autenticación a través del backend API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class AuthAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth-token');
  }

  // Configurar headers por defecto
  getHeaders(includeAuth = false) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Manejar respuestas de la API
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error en la solicitud');
    }
    
    return data;
  }

  // Registrar usuario
  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(userData)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  // Iniciar sesión
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(credentials)
      });

      const data = await this.handleResponse(response);
      
      // Guardar token si el login es exitoso
      if (data.success && data.data.session) {
        this.setToken(data.data.session.access_token);
      }

      return data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  // Cerrar sesión
  async logout() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(true)
      });

      const data = await this.handleResponse(response);
      
      // Limpiar token local
      this.clearToken();
      
      return data;
    } catch (error) {
      console.error('Error en logout:', error);
      // Limpiar token local incluso si hay error en el servidor
      this.clearToken();
      throw error;
    }
  }

  // Obtener información del usuario autenticado
  async getMe() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/me`, {
        method: 'GET',
        headers: this.getHeaders(true)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      // Si el token es inválido, limpiarlo
      if (error.message.includes('Token inválido') || error.message.includes('Token de autorización requerido')) {
        this.clearToken();
      }
      throw error;
    }
  }

  // Verificar si un email existe
  async checkEmail(email) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/check-email`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error al verificar email:', error);
      throw error;
    }
  }

  // Gestión de token
  setToken(token) {
    this.token = token;
    localStorage.setItem('auth-token', token);
  }

  getToken() {
    return this.token || localStorage.getItem('auth-token');
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth-token');
  }

  // Verificar si hay token válido
  hasValidToken() {
    return !!this.getToken();
  }

  // Verificar estado de autenticación
  async checkAuthStatus() {
    if (!this.hasValidToken()) {
      return { authenticated: false, user: null };
    }

    try {
      const response = await this.getMe();
      return {
        authenticated: true,
        user: response.data.user
      };
    } catch (error) {
      console.log('❌ Token inválido:', error.message);
      // Limpiar token inválido automáticamente
      this.clearToken();
      return { authenticated: false, user: null };
    }
  }
}

// Exportar instancia única
const authAPI = new AuthAPI();
export default authAPI;
