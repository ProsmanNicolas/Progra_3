import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import villageAPI from '../services/villageAPI';
import resourceAPI from '../services/resourceAPI';

export default function TownHallUpgradeModal({ isOpen, onClose, townHall, userResources, onUpgrade }) {
  const [levelConfig, setLevelConfig] = useState(null);
  const [nextLevelConfig, setNextLevelConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [localUserResources, setLocalUserResources] = useState(null);
  const [townHallInfo, setTownHallInfo] = useState(null);

  // Función helper para obtener el máximo de edificios según nivel (fallback local)
  const getMaxBuildingsForLevel = (level) => {
    switch(level) {
      case 1: return 5;
      case 2: return 10;
      case 3: return 15;
      case 4: return 25;
      default: return 5;
    }
  };

  // Función para obtener descripción correcta basada en el nivel
  const getDescriptionForLevel = (level) => {
    const maxBuildings = townHallInfo?.currentMaxBuildings || getMaxBuildingsForLevel(level);
    return `Nivel ${level} - Permite ${maxBuildings} edificios`;
  };

  useEffect(() => {
    if (isOpen && townHall) {
      loadTownHallInfo();
      loadLevelConfigs();
      loadUserResourcesIfNeeded();
    }
  }, [isOpen, townHall]);

  const loadTownHallInfo = async () => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${API_BASE_URL}/api/village/townhall-info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setTownHallInfo(result.data);
      }
    } catch (error) {
      console.error('Error cargando info del ayuntamiento:', error);
    }
  };

  const loadUserResourcesIfNeeded = async () => {
    try {
      // Si ya tenemos recursos, usarlos
      if (userResources) {
        setLocalUserResources(userResources);
        return;
      }

      console.log('🔄 TownHallModal: Cargando recursos directamente desde la API');
      const response = await resourceAPI.getUserResources();
      if (response.success) {
        setLocalUserResources(response.data);
        console.log('✅ TownHallModal: Recursos cargados:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading user resources:', error);
    }
  };

  const loadLevelConfigs = async () => {
    try {
      setLoading(true);
      
      // Cargar configuración del nivel actual
      const { data: currentConfig, error: currentError } = await supabase
        .from('building_level_config')
        .select('*')
        .eq('building_type_id', townHall.building_type_id)
        .eq('level', townHall.level)
        .single();

      if (currentError) {
        console.error('Error loading current level config:', currentError);
        setLoading(false);
        return;
      }

      setLevelConfig(currentConfig);

      // Solo intentar cargar siguiente nivel si no estamos en nivel máximo (4)
      if (townHall.level < 4) {
        const { data: nextConfig, error: nextError } = await supabase
          .from('building_level_config')
          .select('*')
          .eq('building_type_id', townHall.building_type_id)
          .eq('level', townHall.level + 1)
          .single();

        if (nextError) {
          console.log('No hay siguiente nivel disponible (nivel máximo alcanzado)');
          setNextLevelConfig(null);
        } else {
          setNextLevelConfig(nextConfig);
        }
      } else {
        // Nivel máximo alcanzado
        setNextLevelConfig(null);
      }
    } catch (error) {
      console.error('Error in loadLevelConfigs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Validación simple de UI (el backend validará realmente)
  const canUpgradeUI = () => {
    const resources = localUserResources || userResources;
    
    if (!nextLevelConfig || !resources) {
      return false;
    }
    
    // Verificación básica de recursos para UI
    const hasWood = (resources.wood || 0) >= (nextLevelConfig.upgrade_cost_wood || 0);
    const hasStone = (resources.stone || 0) >= (nextLevelConfig.upgrade_cost_stone || 0);
    const hasFood = (resources.food || 0) >= (nextLevelConfig.upgrade_cost_food || 0);
    const hasIron = (resources.iron || 0) >= (nextLevelConfig.upgrade_cost_iron || 0);
    
    return hasWood && hasStone && hasFood && hasIron;
  };

  const handleUpgrade = async () => {
    if (!canUpgradeUI() || upgrading) return;

    try {
      setUpgrading(true);

      console.log('🏛️ TownHallModal: Iniciando mejora usando villageAPI (backend maneja recursos)');

      // El backend ahora maneja toda la validación y deducción de recursos
      console.log('🏗️ TownHallModal: Llamando upgradeBuilding API');
      const result = await villageAPI.upgradeBuilding(townHall.id, townHall.level + 1);
      
      console.log('✅ TownHallModal: Mejora completada exitosamente', result);

      // Notificar al componente padre para que refresque los datos
      onUpgrade();
      onClose();

    } catch (error) {
      console.error('Error upgrading town hall:', error);
      alert(`Error al mejorar: ${error.message}`);
    } finally {
      setUpgrading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card-glass rounded-xl p-6 max-w-md w-full mx-4 max-h-screen overflow-y-auto border-2 border-yellow-400">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-yellow-400" style={{fontFamily: 'Cinzel, serif'}}>🏛️ Ayuntamiento</h2>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white text-3xl transition-colors"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="mt-2 text-gray-300">Cargando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Información del nivel actual */}
            {levelConfig && (
              <div className="bg-yellow-500 bg-opacity-20 border-2 border-yellow-500 rounded-lg p-4">
                <h3 className="font-bold text-yellow-300 mb-2">
                  Nivel Actual: {townHall.level}
                </h3>
                <p className="text-gray-300 text-sm mb-2">{getDescriptionForLevel(townHall.level)}</p>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-200">📦 Máximo edificios: <span className="font-semibold text-white">{townHallInfo?.currentMaxBuildings || getMaxBuildingsForLevel(townHall.level)}</span></p>
                  <p className="text-gray-200">🔓 Edificios disponibles: <span className="font-semibold text-white">{levelConfig.unlocks_buildings?.join(', ') || 'Todos los tipos básicos'}</span></p>
                </div>
              </div>
            )}

            {/* Información de la mejora */}
            {nextLevelConfig ? (
              <div className="bg-green-500 bg-opacity-20 border-2 border-green-500 rounded-lg p-4">
                <h3 className="font-bold text-green-300 mb-2">
                  Mejorar a Nivel {townHall.level + 1}
                </h3>
                <p className="text-gray-300 text-sm mb-3">{getDescriptionForLevel(townHall.level + 1)}</p>
                
                {/* Beneficios */}
                <div className="space-y-1 text-sm mb-4">
                  <p className="text-gray-200">📦 Máximo edificios: <span className="font-semibold text-white">{townHallInfo?.nextMaxBuildings || 10}</span></p>
                  <p className="text-gray-200">🔓 Nuevos edificios: <span className="font-semibold text-white">{nextLevelConfig.unlocks_buildings?.join(', ') || 'Mantiene los actuales'}</span></p>
                  <p className="text-gray-200">⏱️ Tiempo: <span className="font-semibold text-white">{nextLevelConfig.upgrade_time_minutes || 'Instantáneo'} {nextLevelConfig.upgrade_time_minutes ? 'minutos' : ''}</span></p>
                </div>

                {/* Costos */}
                <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 mb-4 border-2 border-gray-700">
                  <h4 className="font-semibold text-gray-200 mb-2">Costo de mejora:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {nextLevelConfig.upgrade_cost_wood > 0 && (
                      <div className={`flex items-center font-semibold ${(localUserResources || userResources)?.wood >= nextLevelConfig.upgrade_cost_wood ? 'text-green-400' : 'text-red-400'}`}>
                        🪵 {nextLevelConfig.upgrade_cost_wood}
                      </div>
                    )}
                    {nextLevelConfig.upgrade_cost_stone > 0 && (
                      <div className={`flex items-center font-semibold ${(localUserResources || userResources)?.stone >= nextLevelConfig.upgrade_cost_stone ? 'text-green-400' : 'text-red-400'}`}>
                        🪨 {nextLevelConfig.upgrade_cost_stone}
                      </div>
                    )}
                    {nextLevelConfig.upgrade_cost_food > 0 && (
                      <div className={`flex items-center font-semibold ${(localUserResources || userResources)?.food >= nextLevelConfig.upgrade_cost_food ? 'text-green-400' : 'text-red-400'}`}>
                        🍞 {nextLevelConfig.upgrade_cost_food}
                      </div>
                    )}
                    {nextLevelConfig.upgrade_cost_iron > 0 && (
                      <div className={`flex items-center font-semibold ${(localUserResources || userResources)?.iron >= nextLevelConfig.upgrade_cost_iron ? 'text-green-400' : 'text-red-400'}`}>
                        ⚙️ {nextLevelConfig.upgrade_cost_iron}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón de mejora */}
                <button
                  onClick={handleUpgrade}
                  disabled={!canUpgradeUI() || upgrading}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all ${
                    canUpgradeUI() && !upgrading
                      ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {upgrading ? 'Mejorando...' : canUpgradeUI() ? '⬆️ Mejorar Ayuntamiento' : '❌ Recursos insuficientes'}
                </button>

                {/* Debug info - mostrar detalles de los recursos */}
                {!canUpgradeUI() && (localUserResources || userResources) && nextLevelConfig && (
                  <div className="mt-2 p-2 bg-red-500 bg-opacity-20 border border-red-500 rounded text-xs">
                    <p className="font-semibold text-red-300 mb-1">Debug - Recursos actuales vs requeridos:</p>
                    <div className="grid grid-cols-2 gap-1 text-red-200">
                      <div>🪵 Tienes: {(localUserResources || userResources).wood || 0} | Necesitas: {nextLevelConfig.upgrade_cost_wood || 0}</div>
                      <div>🪨 Tienes: {(localUserResources || userResources).stone || 0} | Necesitas: {nextLevelConfig.upgrade_cost_stone || 0}</div>
                      <div>🍞 Tienes: {(localUserResources || userResources).food || 0} | Necesitas: {nextLevelConfig.upgrade_cost_food || 0}</div>
                      <div>⚙️ Tienes: {(localUserResources || userResources).iron || 0} | Necesitas: {nextLevelConfig.upgrade_cost_iron || 0}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-purple-500 bg-opacity-20 border-2 border-purple-500 rounded-lg p-4 text-center">
                <h3 className="font-bold text-purple-300 mb-2">¡Nivel Máximo Alcanzado!</h3>
                <p className="text-gray-300 text-sm">Tu Ayuntamiento ha alcanzado el nivel máximo disponible.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
