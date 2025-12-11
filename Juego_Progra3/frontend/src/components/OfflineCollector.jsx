import React, { useState, useEffect } from 'react';
import resourceAPI from '../services/resourceAPI';

const OfflineCollector = ({ user, onResourcesCollected }) => {
  const [offlineTime, setOfflineTime] = useState(0);
  const [availableResources, setAvailableResources] = useState(null);
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    if (user) {
      checkOfflineTime();
      
      // Actualizar timestamp cuando el usuario cierra la página/pestaña
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          // Página se oculta, marcar como offline
          localStorage.setItem(`lastSessionTime_${user.id}`, new Date().toISOString());
          console.log('📱 Página oculta, guardando timestamp:', new Date().toISOString());
        } else if (document.visibilityState === 'visible') {
          // Página se vuelve visible, verificar tiempo offline
          console.log('👀 Página visible de nuevo, verificando tiempo offline');
          setTimeout(checkOfflineTime, 500); // Pequeño delay para asegurar que se actualice
        }
      };

      const handleBeforeUnload = () => {
        localStorage.setItem(`lastSessionTime_${user.id}`, new Date().toISOString());
        console.log('🚪 Cerrando aplicación, guardando timestamp:', new Date().toISOString());
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user]);

  const checkOfflineTime = async () => {
    try {
      console.log('🔍 Verificando tiempo offline para usuario:', user.id);

      // Obtener timestamp de cuando se cerró la aplicación (localStorage)
      const lastSessionTime = localStorage.getItem(`lastSessionTime_${user.id}`);
      const now = new Date();

      if (!lastSessionTime) {
        console.log('📝 Primera vez que abre la aplicación, guardando timestamp');
        localStorage.setItem(`lastSessionTime_${user.id}`, now.toISOString());
        setOfflineTime(0);
        setAvailableResources(null);
        return;
      }

      // Calcular tiempo offline basado en localStorage
      const lastSession = new Date(lastSessionTime);
      const timeDifference = now.getTime() - lastSession.getTime();
      const minutesOffline = Math.floor(timeDifference / (1000 * 60));

      console.log('⏰ Cálculo de tiempo offline (localStorage):', {
        ultimaSesion: lastSession.toISOString(),
        ultimaSesionFormatted: lastSession.toLocaleString(),
        ahora: now.toISOString(),
        ahoraFormatted: now.toLocaleString(),
        diferenciaMs: `${timeDifference} ms`,
        diferenciaMsFormated: `${(timeDifference / 1000).toFixed(1)} segundos`,
        minutosOffline: minutesOffline,
        umbralMinimo: 'Mínimo 2 minutos para mostrar offline'
      });

      // Aumentar el mínimo a 2 minutos para evitar falsas detecciones
      if (minutesOffline >= 2) {
        // Llamar al backend para calcular recursos offline
        const response = await resourceAPI.calculateOfflineResources(minutesOffline);
        
        if (response.success && response.data) {
          console.log('💰 Recursos offline calculados por backend:', response.data);
          setOfflineTime(minutesOffline);
          setAvailableResources(response.data);
        } else {
          console.log('❌ Error calculando recursos offline:', response);
          setOfflineTime(0);
          setAvailableResources(null);
        }
      } else {
        console.log('ℹ️ No hay tiempo offline suficiente:', minutesOffline, 'minutos (mínimo 2 minutos)');
        setOfflineTime(0);
        setAvailableResources(null);
      }
    } catch (error) {
      console.error('❌ Error en checkOfflineTime:', error);
    }
  };

  const collectOfflineResources = async () => {
    if (!availableResources || isCollecting) return;

    try {
      setIsCollecting(true);

      // Recolectar recursos offline usando resourceAPI
      const response = await resourceAPI.collectOfflineResources(offlineTime);

      if (response.success) {
        // Actualizar estado local con los nuevos recursos totales
        if (onResourcesCollected && response.data?.newTotalResources) {
          onResourcesCollected(response.data.newTotalResources);
        }

        // Actualizar timestamp de sesión en localStorage
        localStorage.setItem(`lastSessionTime_${user.id}`, new Date().toISOString());

        // Limpiar disponibles
        setAvailableResources(null);
        setOfflineTime(0);

        console.log('✅ Recursos offline recolectados:', response.data);
      } else {
        console.log('❌ Error recolectando recursos:', response);
      }
    } catch (error) {
      console.error('❌ Error recolectando recursos offline:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  // No mostrar nada si no hay recursos offline disponibles
  if (!availableResources || offlineTime < 1) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 bg-gradient-to-br from-green-600 to-green-800 text-white p-6 rounded-xl shadow-2xl border-2 border-green-400 z-[60] max-w-sm">
      <div className="flex items-center mb-4">
        <span className="text-3xl mr-3">💰</span>
        <div>
          <h3 className="text-lg font-bold">¡Recaudador Offline!</h3>
          <p className="text-green-200 text-sm">Estuviste ausente {offlineTime.toLocaleString()} minutos</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {availableResources.wood > 0 && (
          <div className="flex items-center justify-between bg-green-700 bg-opacity-50 rounded px-3 py-1">
            <span className="flex items-center">
              <span className="mr-2">🪵</span>
              <span>Madera</span>
            </span>
            <span className="font-bold text-yellow-300">+{availableResources.wood}</span>
          </div>
        )}
        {availableResources.stone > 0 && (
          <div className="flex items-center justify-between bg-green-700 bg-opacity-50 rounded px-3 py-1">
            <span className="flex items-center">
              <span className="mr-2">🪨</span>
              <span>Piedra</span>
            </span>
            <span className="font-bold text-yellow-300">+{availableResources.stone}</span>
          </div>
        )}
        {availableResources.food > 0 && (
          <div className="flex items-center justify-between bg-green-700 bg-opacity-50 rounded px-3 py-1">
            <span className="flex items-center">
              <span className="mr-2">🍞</span>
              <span>Comida</span>
            </span>
            <span className="font-bold text-yellow-300">+{availableResources.food}</span>
          </div>
        )}
        {availableResources.iron > 0 && (
          <div className="flex items-center justify-between bg-green-700 bg-opacity-50 rounded px-3 py-1">
            <span className="flex items-center">
              <span className="mr-2">⚙️</span>
              <span>Hierro</span>
            </span>
            <span className="font-bold text-yellow-300">+{availableResources.iron}</span>
          </div>
        )}
      </div>

      <button
        onClick={collectOfflineResources}
        disabled={isCollecting}
        className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
      >
        {isCollecting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Recaudando...
          </span>
        ) : (
          '🎁 Recaudar Recursos'
        )}
      </button>

      <p className="text-center text-green-200 text-xs mt-2">
        Producción: 5 madera, 3 piedra, 4 comida, 2 hierro por minuto
      </p>
    </div>
  );
};

export default OfflineCollector;
