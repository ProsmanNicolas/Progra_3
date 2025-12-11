import { useState, useEffect, useContext, createContext } from 'react';
import authAPI from '../services/authAPI';
import chatAPI from '../services/chatAPI';

// Crear contexto de autenticación
const AuthContext = createContext();

// Hook para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

// Proveedor de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Verificar estado de autenticación al cargar
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const authStatus = await authAPI.checkAuthStatus();
      setAuthenticated(authStatus.authenticated);
      setUser(authStatus.user);
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authAPI.login(credentials);
      
      if (response.success) {
        setAuthenticated(true);
        setUser(response.data.user);
        return { success: true, message: response.message };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await authAPI.register(userData);
      
      if (response.success) {
        // No autenticar automáticamente en registro, requiere confirmación de email
        return { success: true, message: response.message, needsEmailConfirmation: true };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Actualizar presencia a offline antes de logout
      try {
        await chatAPI.updatePresence('offline');
      } catch (presenceError) {
        console.warn('Error actualizando presencia en logout:', presenceError);
      }

      await authAPI.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setAuthenticated(false);
      setUser(null);
      setLoading(false);
    }
  };

  const checkEmail = async (email) => {
    try {
      const response = await authAPI.checkEmail(email);
      return response.data.exists;
    } catch (error) {
      console.error('Error al verificar email:', error);
      return false;
    }
  };

  const value = {
    user,
    authenticated,
    loading,
    login,
    register,
    logout,
    checkEmail,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para autenticación (alternativa sin contexto)
export const useAuthService = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    if (isChecking) return; // Evitar llamadas duplicadas
    
    setIsChecking(true);
    setLoading(true);
    try {
      const authStatus = await authAPI.checkAuthStatus();
      setAuthenticated(authStatus.authenticated);
      setUser(authStatus.user);
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
      setIsChecking(false);
    }
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authAPI.login(credentials);
      
      if (response.success) {
        setAuthenticated(true);
        setUser(response.data.user);
        return { success: true, message: response.message };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await authAPI.register(userData);
      
      if (response.success) {
        return { success: true, message: response.message, needsEmailConfirmation: true };
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Actualizar presencia a offline antes de logout
      try {
        await chatAPI.updatePresence('offline');
      } catch (presenceError) {
        console.warn('Error actualizando presencia en logout:', presenceError);
      }

      await authAPI.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setAuthenticated(false);
      setUser(null);
      setLoading(false);
    }
  };

  const checkEmail = async (email) => {
    try {
      const response = await authAPI.checkEmail(email);
      return response.data.exists;
    } catch (error) {
      console.error('Error al verificar email:', error);
      return false;
    }
  };

  return {
    user,
    authenticated,
    loading,
    login,
    register,
    logout,
    checkEmail,
    checkAuthStatus
  };
};
