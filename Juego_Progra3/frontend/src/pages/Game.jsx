import React, { useState, useEffect } from 'react';
import { useAuthService } from '../hooks/useAuth';
import villageAPI from '../services/villageAPI';
import resourceAPI from '../services/resourceAPI';
import mapAPI from '../services/mapAPI';
import GameMap from '../components/GameMap';
import ResourceDisplay from '../components/ResourceDisplay';
import BuildingManager from '../components/BuildingManager';
import GlobalMapClean from '../components/GlobalMapClean';
import DonationHistory from '../components/DonationHistory';
import BattleHistory from '../components/BattleHistory';
import ChatSystem from '../components/ChatSystemBackend'; // ✅ Nuevo componente con backend
import OfflineCollector from '../components/OfflineCollector';
import UnifiedTroops from '../components/UnifiedTroops';
import VillageSettingsModal from '../components/VillageSettingsModal';
import useResourcePolling from '../hooks/useResourcePolling'; // ✅ Polling desde backend

export default function Game({ onLogout }) {
  const { user: authUser, authenticated, logout } = useAuthService();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [userResources, setUserResources] = useState(null);
  const [userBuildings, setUserBuildings] = useState([]); // Nuevo estado centralizado
  const [showGlobalMap, setShowGlobalMap] = useState(false); // Nuevo estado para el mapa global
  const [forceRender, setForceRender] = useState(0); // Estado para forzar re-render
  const [showBuildingManager, setShowBuildingManager] = useState(false); // Estado para mostrar/ocultar BuildingManager
  const [userVillage, setUserVillage] = useState(null); // Información de la aldea del usuario
  const [showVillageSettings, setShowVillageSettings] = useState(false); // Modal de configuración de aldea

  // ✅ Polling de recursos desde backend (el backend calcula automáticamente)
  useResourcePolling(user, setUserResources);

  useEffect(() => {
    // Verificar que tenemos todos los datos necesarios antes de inicializar
    if (!authenticated || !authUser || !authUser.id) {
      console.log('⏳ Esperando datos de autenticación...');
      return;
    }

    const initializeGame = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Usar los datos del usuario autenticado desde el backend
        setUser({
          id: authUser.id,
          email: authUser.email,
          username: authUser.username || authUser.email
        });
        
        // NO crear aldea automáticamente - solo cargar edificios existentes
        await villageAPI.ensureUserVillage();
        
        // Cargar edificios del usuario
        const buildingsResponse = await villageAPI.getUserBuildings();
        setUserBuildings(buildingsResponse.data || []);
        
        // Cargar información de la aldea
        const villageResponse = await villageAPI.getUserVillage();
        setUserVillage(villageResponse.data || null);
        
      } catch (error) {
        console.error('Error al inicializar juego:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeGame();
  }, [authenticated, authUser]);

  // Detectar cuando el usuario se desconecta para guardar timestamp
  useEffect(() => {
    if (!user) return;

    // Guardar timestamp de conexión inicial
    const connectTime = new Date().toISOString();
    localStorage.setItem(`last_active_${user.id}`, connectTime);
    console.log('🔗 Usuario conectado, timestamp inicial:', connectTime);

    // Heartbeat para actualizar timestamp cada 30 segundos
    const heartbeatInterval = setInterval(() => {
      const heartbeatTime = new Date().toISOString();
      localStorage.setItem(`last_active_${user.id}`, heartbeatTime);
      console.log('💓 Heartbeat actualizado:', heartbeatTime);
    }, 30000); // 30 segundos

    const handleBeforeUnload = () => {
      const disconnectTime = new Date().toISOString();
      localStorage.setItem(`disconnect_time_${user.id}`, disconnectTime);
      console.log('🚪 beforeunload: guardando timestamp:', disconnectTime);
      console.log('📋 LocalStorage después:', {
        disconnect_time: localStorage.getItem(`disconnect_time_${user.id}`),
        last_active: localStorage.getItem(`last_active_${user.id}`)
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const disconnectTime = new Date().toISOString();
        localStorage.setItem(`disconnect_time_${user.id}`, disconnectTime);
        console.log('👁️ visibilitychange (hidden): guardando timestamp:', disconnectTime);
        console.log('📋 LocalStorage después:', {
          disconnect_time: localStorage.getItem(`disconnect_time_${user.id}`),
          last_active: localStorage.getItem(`last_active_${user.id}`)
        });
      }
    };

    const handlePageHide = () => {
      const disconnectTime = new Date().toISOString();
      localStorage.setItem(`disconnect_time_${user.id}`, disconnectTime);
      console.log('📱 pagehide: guardando timestamp:', disconnectTime);
      console.log('📋 LocalStorage después:', {
        disconnect_time: localStorage.getItem(`disconnect_time_${user.id}`),
        last_active: localStorage.getItem(`last_active_${user.id}`)
      });
    };

    // Múltiples eventos para mayor confiabilidad
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Función para refrescar edificios (llamada desde componentes hijos)
  const refreshBuildings = async () => {
    if (user?.id) {
      try {
        console.log('🔄 [Game] Iniciando refreshBuildings...');
        const response = await villageAPI.getUserBuildings();
        
        // SOLUCIÓN: Forzar un nuevo array para que React detecte el cambio
        const newBuildings = response.data || [];
        console.log(`🏗️ [Game] Edificios obtenidos del backend: ${newBuildings.length}`);
        
        setUserBuildings([...newBuildings]); // Nueva referencia de array
        
        // FORZAR actualización de recursos cuando cambian los edificios
        console.log('💰 [Game] Forzando actualización de recursos después de cambio de edificios...');
        await handleResourceChange();
        
        // SISTEMA DE FORZADO DE RE-RENDER MÚLTIPLE
        setForceRender(prev => prev + 1);
        console.log('🔄 [Game] Forzando re-render #1');
        
        // Segunda actualización forzada
        setTimeout(() => {
          setUserBuildings(prev => [...newBuildings]); // Otra nueva referencia
          setForceRender(prev => prev + 1);
          console.log('🔄 [Game] Forzando re-render #2');
        }, 100);
        
        // Tercera actualización forzada
        setTimeout(() => {
          setUserBuildings([...newBuildings]);
          setForceRender(prev => prev + 1);
          console.log('🔄 [Game] Forzando re-render #3');
        }, 300);
        
        // Cuarta actualización final como backup
        setTimeout(() => {
          setUserBuildings([...newBuildings]);
          setForceRender(prev => prev + 1);
          console.log('🔄 [Game] Forzando re-render #4 (final)');
        }, 600);
        
      } catch (error) {
        console.error('❌ Error refreshing buildings:', error);
      }
    }
  };

  const handleResourceUpdate = (resources) => {
    setUserResources(resources);
  };

  const handleResourceChange = async (newResources = null) => {
    if (newResources) {
      // Si se pasan recursos específicos, usarlos inmediatamente
      setUserResources(newResources);
      console.log('💰 Recursos actualizados con datos específicos:', newResources);
      return;
    }
    
    // Si no hay recursos específicos, cargar desde API con múltiples intentos
    try {
      console.log('🔄 Recargando recursos desde API...');
      const resourceResponse = await resourceAPI.getUserResources(user.id);
      if (resourceResponse.success) {
        setUserResources(resourceResponse.data);
        console.log('💰 Recursos actualizados desde API:', resourceResponse.data);
        
        // Forzar un segundo intento después de 500ms para asegurar sincronización
        setTimeout(async () => {
          try {
            const secondResponse = await resourceAPI.getUserResources(user.id);
            if (secondResponse.success) {
              setUserResources(secondResponse.data);
              console.log('💰 SEGUNDA CARGA: Recursos reforzados:', secondResponse.data);
            }
          } catch (error) {
            console.warn('⚠️ Segundo intento de carga de recursos falló:', error);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error al actualizar recursos:', error);
    }
  };

  // Guardar configuración de la aldea
  const handleSaveVillageSettings = async (settings) => {
    try {
      console.log('🔄 Enviando actualización de aldea al servidor...');
      const response = await mapAPI.updateMyVillage(
        settings.villageName,
        settings.villageIcon,
        settings.description
      );
      
      console.log('📥 Respuesta del servidor:', response);
      
      if (response.success) {
        setUserVillage(response.data);
        console.log('✅ Aldea actualizada en el estado:', response.data);
      } else {
        throw new Error(response.message || 'Error al actualizar aldea');
      }
    } catch (error) {
      console.error('❌ Error al actualizar aldea:', error);
      throw error;
    }
  };

  // Mostrar pantalla de carga inicial mientras se verifican los datos de autenticación
  if (!authenticated || !authUser || !authUser.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center card-glass p-8 rounded-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-yellow-400 text-lg font-semibold">
            {loading ? '🏰 Cargando tu reino...' : '💰 Calculando recursos generados offline...'}
          </p>
        </div>
      </div>
    );
  }

  const handleCreateVillage = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🏗️ Creando aldea manualmente...');
      
      // Llamar al endpoint para crear la aldea
      await villageAPI.ensureUserVillage();
      
      console.log('✅ Aldea creada exitosamente');
      
      // Recargar la página para inicializar el juego
      window.location.reload();
    } catch (error) {
      console.error('❌ Error al crear aldea:', error);
      setError(`Error al crear aldea: ${error.message}`);
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center card-glass p-8 rounded-xl max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error de Conexión</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleCreateVillage} 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              🏗️ Crear Aldea
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary px-6 py-3 rounded-lg font-bold"
            >
              🔄 Recargar Página
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center card-glass p-8 rounded-xl max-w-md">
          <div className="text-6xl mb-4">🔑</div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Sesión Requerida</h2>
          <p className="text-gray-300 mb-6">No hay una sesión activa</p>
          <button 
            onClick={onLogout} 
            className="btn-primary px-6 py-3 rounded-lg font-bold"
          >
            ⬅️ Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Recaudador Offline */}
      <OfflineCollector 
        user={user}
        onResourcesCollected={(updatedResources) => {
          console.log('🔄 Game.jsx recibió recursos actualizados:', updatedResources);
          setUserResources(updatedResources);
        }}
      />
      
      {/* Recursos compactos en esquina superior derecha */}
      {user?.id && activeTab !== 'map' && (
        <ResourceDisplay 
          userId={user.id} 
          onResourceUpdate={handleResourceUpdate}
          compact={true}
        />
      )}
      
      {/* Header simplificado */}
      <header className="card-glass border-b-2 border-yellow-400 border-opacity-30">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{userVillage?.village_icon || '🏰'}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-yellow-400" style={{fontFamily: 'Cinzel, serif'}}>
                    {userVillage?.village_name || 'Mi Reino'}
                  </h1>
                  <button
                    onClick={() => setShowVillageSettings(true)}
                    className="text-gray-400 hover:text-yellow-400 transition-colors"
                    title="Configurar aldea"
                  >
                    ⚙️
                  </button>
                </div>
                <p className="text-sm text-gray-400">Gobernante: <span className="text-yellow-300 font-semibold">{user.username || user.email}</span></p>
              </div>
            </div>
            <button 
              className="btn-secondary px-5 py-2 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              onClick={onLogout}
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="card-glass border-b border-yellow-400 border-opacity-20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex overflow-x-auto">
          <button
            className={`tab-button ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            🗺️ Mi Aldea
          </button>
          <button
            className={`tab-button ${activeTab === 'buildings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('buildings');
              setShowBuildingManager(true);
            }}
          >
            🏗️ Edificios
          </button>
          <button
            className={`tab-button ${activeTab === 'global' ? 'active' : ''}`}
            onClick={() => setActiveTab('global')}
          >
            🌍 Mapa Global
          </button>
          <button
            className={`tab-button ${activeTab === 'donations' ? 'active' : ''}`}
            onClick={() => setActiveTab('donations')}
          >
            🎁 Donaciones
          </button>
          <button
            className={`tab-button ${activeTab === 'troops' ? 'active' : ''}`}
            onClick={() => setActiveTab('troops')}
          >
            ⚔️ Tropas
          </button>
          <button
            className={`tab-button ${activeTab === 'battles' ? 'active' : ''}`}
            onClick={() => setActiveTab('battles')}
          >
            🛡️ Batallas
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 pb-20">
        {activeTab === 'map' && user?.id && (
          <GameMap 
            key={`gamemap-${user.id}-${forceRender}`}
            userId={user.id} 
            userResources={userResources}
            userBuildings={userBuildings}
            onResourceChange={handleResourceChange}
            onBuildingsChange={refreshBuildings}
          />
        )}
        {activeTab === 'buildings' && user?.id && showBuildingManager && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="card-glass rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => {
                  setShowBuildingManager(false);
                  setActiveTab('map');
                }}
                className="sticky top-0 right-0 float-right m-4 text-3xl text-gray-400 hover:text-white transition-colors z-10"
              >
                ✕
              </button>
              <BuildingManager 
                userId={user.id}
                userResources={userResources}
                userBuildings={userBuildings}
                onResourceChange={handleResourceChange}
                onBuildingsChange={refreshBuildings}
              />
            </div>
          </div>
        )}
        {activeTab === 'global' && user?.id && (
          <GlobalMapClean 
            user={user}
            userResources={userResources}
            onResourceChange={handleResourceChange}
          />
        )}
        {activeTab === 'troops' && user?.id && (
          <UnifiedTroops 
            user={user}
            userResources={userResources}
            setUserResources={setUserResources}
            userBuildings={userBuildings}
          />
        )}
        {activeTab === 'donations' && user?.id && (
          <DonationHistory 
            user={user}
          />
        )}
        {activeTab === 'battles' && user?.id && (
          <BattleHistory />
        )}
      </main>

      {/* Sistema de Chat */}
      <ChatSystem user={user} />

      {/* Modal de Configuración de Aldea */}
      <VillageSettingsModal
        show={showVillageSettings}
        onClose={() => setShowVillageSettings(false)}
        currentVillage={userVillage}
        onSave={handleSaveVillageSettings}
      />
    </div>
  );
}
