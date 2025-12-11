import React, { useState, useEffect } from 'react';
import villageAPI from '../services/villageAPI';
import resourceAPI from '../services/resourceAPI';
import { getBuildingIcon } from '../utils/buildingIcons';

export default function BuildingManager({ userId, userResources, userBuildings, onResourceChange, onBuildingsChange }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [buildingCosts, setBuildingCosts] = useState({}); // Cachear costos del backend

  // Cargar costo de mejora desde backend
  const loadUpgradeCost = async (buildingId) => {
    try {
      const response = await villageAPI.getUpgradeCost(buildingId);
      if (response.success) {
        setBuildingCosts(prev => ({
          ...prev,
          [buildingId]: response.data.cost
        }));
        return response.data.cost;
      }
    } catch (error) {
      console.error('Error cargando costo de mejora:', error);
    }
    return { wood: 0, stone: 0, food: 0, iron: 0 };
  };

  // Cargar costos para todos los edificios al montar
  useEffect(() => {
    if (userBuildings) {
      userBuildings.forEach(building => {
        loadUpgradeCost(building.id);
      });
    }
  }, [userBuildings]);

  // Verificar que userBuildings sea válido
  if (!userBuildings || !Array.isArray(userBuildings)) {
    return <div>Cargando edificios...</div>;
  }

  const upgradeBuilding = async (building) => {
    console.log('🎯 upgradeBuilding called for:', building.id);
    
    // Validar con backend si puede mejorar
    try {
      const canUpgradeResponse = await villageAPI.canUpgradeBuilding(building.id);
      if (!canUpgradeResponse.success || !canUpgradeResponse.data.canUpgrade) {
        setMessage(canUpgradeResponse.data.reason || 'No puedes mejorar este edificio');
        setTimeout(() => setMessage(''), 4000);
        return;
      }
    } catch (error) {
      console.error('Error validando mejora:', error);
      setMessage('Error al validar mejora');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    console.log('✅ Validaciones pasadas, iniciando upgrade...');
    setLoading(true);

    try {
      const cost = calculateUpgradeCost(building);
      console.log(`🔧 Frontend: Costo calculado para mostrar:`, cost);
      console.log(`🔧 Frontend: Iniciando upgrade de edificio ID ${building.id} de nivel ${building.level} a ${building.level + 1}`);
      
      // ✅ El backend se encarga de descontar los recursos automáticamente
      console.log(`🏗️ Frontend: Llamando a villageAPI.upgradeBuilding...`);
      const upgradeResponse = await villageAPI.upgradeBuilding(building.id, building.level + 1);
      console.log(`✅ Frontend: Respuesta del upgrade:`, upgradeResponse);

      setMessage(`${building.building_types?.name || 'Edificio'} mejorado al nivel ${building.level + 1}`);
      setTimeout(() => setMessage(''), 3000);

      // Notificar cambio de recursos y edificios para recargar desde backend
      if (onResourceChange) {
        console.log('🔄 Solicitando actualización de recursos desde backend...');
        onResourceChange();
      }
      if (onBuildingsChange) {
        console.log('🔄 Actualizando edificios después de mejora...');
        onBuildingsChange();
      }

    } catch (error) {
      console.error('Error upgrading building:', error);
      setMessage('Error al mejorar el edificio: ' + (error.message || ''));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const destroyBuilding = async (building) => {
    // No permitir destruir el ayuntamiento
    if (building.building_types?.name === 'Ayuntamiento') {
      setMessage('No puedes destruir el Ayuntamiento');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres destruir ${building.building_types?.name || 'este edificio'}?`)) {
      return;
    }

    setLoading(true);

    try {
      // Eliminar edificio usando villageAPI
      await villageAPI.deleteBuilding(building.id);

      setMessage(`${building.building_types?.name || 'Edificio'} destruido`);
      setTimeout(() => setMessage(''), 3000);

      // Notificar cambio de edificios
      if (onBuildingsChange) {
        onBuildingsChange();
      }

    } catch (error) {
      console.error('Error destroying building:', error);
      setMessage('Error al destruir el edificio: ' + (error.message || ''));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost) => {
    const costs = [];
    if (cost.wood > 0) costs.push(`🪵${cost.wood}`);
    if (cost.stone > 0) costs.push(`🪨${cost.stone}`);
    if (cost.food > 0) costs.push(`🍞${cost.food}`);
    if (cost.iron > 0) costs.push(`⚙️${cost.iron}`);
    return costs.join(' ');
  };

  const groupedBuildings = userBuildings.reduce((acc, building) => {
    const type = building.building_types?.name || building.name || 'Edificio Desconocido';
    if (!acc[type]) acc[type] = [];
    acc[type].push(building);
    return acc;
  }, {});
    
    const type = building.building_types?.name || building.name || 'Edificio Desconocido';
    if (!acc[type]) acc[type] = [];
    acc[type].push(building);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2" style={{fontFamily: 'Cinzel, serif'}}>
          🏗️ Gestión de Edificios
        </h2>
        <p className="text-gray-400 text-sm">Mejora y administra tus edificios construidos</p>
      </div>

      {message && (
        <div className="mb-4 p-4 bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded-lg text-blue-300">
          {message}
        </div>
      )}

      {Object.keys(groupedBuildings).length === 0 ? (
        <div className="text-center py-12 card-glass rounded-xl">
          <div className="text-6xl mb-4">🏗️</div>
          <p className="text-gray-300 text-lg mb-2">No tienes edificios construidos</p>
          <p className="text-gray-500 text-sm">Ve a la pestaña "Mi Aldea" para construir edificios</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedBuildings).map(([buildingName, buildings]) => (
            <div key={buildingName} className="card-glass rounded-xl p-5">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-300">
                {getBuildingIcon(buildingName)} {buildingName}
                <span className="text-sm font-normal text-gray-400">
                  ({buildings.length} edificio{buildings.length !== 1 ? 's' : ''})
                </span>
              </h3>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {buildings.map((building, index) => {
                  // Obtener costo desde cache del backend
                  const upgradeCost = buildingCosts[building.id] || { wood: 0, stone: 0, food: 0, iron: 0 };
                  
                  // Validar si puede costear (solo UI, backend valida en upgradeBuilding)
                  const canAfford = userResources && (
                    userResources.wood >= upgradeCost.wood &&
                    userResources.stone >= upgradeCost.stone &&
                    userResources.food >= upgradeCost.food &&
                    userResources.iron >= upgradeCost.iron
                  );

                  return (
                    <div key={building.id} className="bg-gray-800 bg-opacity-50 border-2 border-gray-700 hover:border-yellow-400 transition-all rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-white text-lg">
                            {buildingName} #{index + 1}
                          </h4>
                          <p className="text-sm text-yellow-400 font-semibold">
                            Nivel {building.level}
                          </p>
                          <p className="text-xs text-gray-500">
                            Pos: ({building.position_x}, {building.position_y})
                          </p>
                        </div>
                        <div className="text-right">
                          {building.building_types?.type === 'resource_generator' && (
                            <div className="text-sm font-semibold text-green-400 bg-green-900 bg-opacity-30 px-2 py-1 rounded">
                              Generador
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {/* Solo mostrar botón de mejorar si NO es ayuntamiento */}
                        {building.building_types?.name !== 'Ayuntamiento' && (
                          <button
                            onClick={() => upgradeBuilding(building)}
                            disabled={!canAfford || !canUpgrade || loading}
                            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                              canAfford && canUpgrade && !loading
                                ? 'btn-primary'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                            title={!canUpgrade ? 'No puedes mejorar: el nivel de tu ayuntamiento es insuficiente o ya alcanzaste el nivel máximo (4)' : `Costo: ${formatCost(upgradeCost)}`}
                          >
                            ⬆️ Mejorar
                          </button>
                        )}
                        
                        {/* Para el ayuntamiento, mostrar mensaje informativo */}
                        {building.building_types?.name === 'Ayuntamiento' && (
                          <div className="flex-1 px-3 py-2 text-sm rounded-lg bg-blue-500 bg-opacity-20 border border-blue-500 text-blue-300 text-center font-semibold">
                            Mejora desde el mapa de la aldea
                          </div>
                        )}
                        
                        {building.building_types?.name !== 'Ayuntamiento' && (
                          <button
                            onClick={() => destroyBuilding(building)}
                            disabled={loading}
                            className="px-3 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600 disabled:text-gray-400 font-semibold transition-all"
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      {/* Solo mostrar costos de mejora si NO es ayuntamiento */}
                      {building.building_types?.name !== 'Ayuntamiento' && (
                        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                          <span className="font-semibold">Costo mejora:</span> {formatCost(upgradeCost)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Estadísticas del tipo de edificio */}
              <div className="mt-4 p-4 bg-gray-800 bg-opacity-50 rounded-lg border border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-yellow-400">Total construidos:</span> 
                    <span className="text-white ml-2">{buildings.length}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-yellow-400">Nivel promedio:</span> 
                    <span className="text-white ml-2">{
                      (buildings.reduce((sum, b) => sum + b.level, 0) / buildings.length).toFixed(1)
                    }</span>
                  </div>
                  {buildings[0].building_types?.type === 'resource_generator' && (
                    <>
                      <div>
                        <span className="font-semibold text-yellow-400">Edificios de este tipo:</span> 
                        <span className="text-green-400 ml-2 font-semibold">{buildings.length}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-yellow-400">Recurso:</span> 
                        <span className="text-white ml-2">{
                          buildings[0].building_types?.resource_type === 'wood' ? '🪵 Madera' :
                          buildings[0].building_types?.resource_type === 'stone' ? '🪨 Piedra' :
                          buildings[0].building_types?.resource_type === 'food' ? '🍞 Comida' :
                          buildings[0].building_types?.resource_type === 'iron' ? '⚙️ Hierro' : ''
                        }</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="card-glass p-8 rounded-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-yellow-400 font-semibold">Procesando...</p>
          </div>
        </div>
      )}
    </div>
  );
}
