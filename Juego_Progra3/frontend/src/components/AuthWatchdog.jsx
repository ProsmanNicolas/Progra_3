// Componente para monitorear y mantener la sesión activa
import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import authHelper from '../utils/authHelper';

const AuthWatchdog = ({ onAuthError, user }) => {
  useEffect(() => {
    if (!user) return;

    console.log('🔍 AuthWatchdog: Iniciando monitoreo de sesión para:', user.email);

    // Verificar el estado de la sesión cada 5 minutos (aumentado de 2)
    const checkInterval = setInterval(async () => {
      try {
        console.log('� AuthWatchdog: Verificando estado de la sesión...');

        // Verificar si el token está próximo a expirar
        if (authHelper.isTokenNearExpiry()) {
          console.log('🔄 AuthWatchdog: Token próximo a expirar, intentando renovar...');
          
          const refreshed = await authHelper.ensureFreshToken();
          
          if (!refreshed) {
            console.warn('⚠️ AuthWatchdog: No se pudo renovar el token, pero continuando...');
            // NO cerrar sesión automáticamente, solo logging
            // if (onAuthError) {
            //   onAuthError('Token expired and could not be refreshed. Please login again.');
            // }
          } else {
            console.log('✅ AuthWatchdog: Token renovado exitosamente');
          }
        } else {
          console.log('💓 AuthWatchdog: Token válido');
        }
      } catch (error) {
        console.warn('⚠️ AuthWatchdog: Error verificando sesión (continuando):', error.message);
        // No cerrar sesión por errores de red temporales
      }
    }, 5 * 60 * 1000); // Cada 5 minutos

    // Listener para cambios de estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔍 AuthWatchdog: Auth state changed:', event);
      
      switch (event) {
        case 'TOKEN_REFRESHED':
          console.log('✅ AuthWatchdog: Token refreshed automatically by Supabase');
          if (session?.access_token) {
            localStorage.setItem('auth-token', session.access_token);
            if (session.refresh_token) {
              localStorage.setItem('refresh-token', session.refresh_token);
            }
          }
          break;
          
        case 'SIGNED_OUT':
          console.log('👋 AuthWatchdog: User signed out');
          authHelper.clearTokens();
          if (onAuthError) {
            onAuthError('Session expired. Please login again.');
          }
          break;
          
        case 'TOKEN_REFRESH_FAILED':
          console.warn('⚠️ AuthWatchdog: Token refresh failed, pero no cerrando sesión aún');
          // Intentar un refresh manual antes de cerrar sesión
          setTimeout(async () => {
            try {
              const refreshed = await authHelper.ensureFreshToken();
              if (!refreshed) {
                console.error('❌ AuthWatchdog: Múltiples intentos de refresh fallaron');
                if (onAuthError) {
                  onAuthError('Authentication failed. Please login again.');
                }
              }
            } catch (error) {
              console.error('❌ AuthWatchdog: Error en retry manual:', error);
            }
          }, 5000); // Esperar 5 segundos antes de intentar
          break;
      }
    });

    // Verificación inicial del estado
    const initialCheck = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('⚠️ AuthWatchdog: Error getting initial session:', error.message);
          // No cerrar sesión por error inicial, podría ser temporal
        }
        
        if (!session) {
          console.warn('⚠️ AuthWatchdog: No active session found');
          // Solo cerrar si realmente no hay token local tampoco
          if (!authHelper.isAuthenticated() && !localStorage.getItem('auth-token')) {
            console.log('💀 AuthWatchdog: No hay token local, considerando logout...');
            // Dar una oportunidad más antes de cerrar sesión
            setTimeout(() => {
              if (!authHelper.isAuthenticated()) {
                if (onAuthError) {
                  onAuthError('No active session. Please login again.');
                }
              }
            }, 10000); // Esperar 10 segundos
          } else {
            console.log('🔄 AuthWatchdog: Token local existe, manteniendo sesión');
          }
        } else {
          console.log('✅ AuthWatchdog: Active session found');
        }
      } catch (error) {
        console.warn('⚠️ AuthWatchdog: Error in initial check (ignorando):', error.message);
        // No hacer nada por errores de verificación inicial
      }
    };

    initialCheck();

    // Cleanup
    return () => {
      clearInterval(checkInterval);
      subscription.unsubscribe();
      console.log('🔍 AuthWatchdog: Limpieza completada');
    };
  }, [user, onAuthError]);

  // Este componente no renderiza nada
  return null;
};

export default AuthWatchdog;
