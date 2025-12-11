import React, { useState, useEffect } from 'react';
import { getTroopIcon } from '../utils/troopIcons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const UnifiedTroops = ({ user, userResources, setUserResources, userBuildings = [] }) => {
  const [userTroops, setUserTroops] = useState(null);
  const [troopTypes, setTroopTypes] = useState([]);
  const [trainingQueue, setTrainingQueue] = useState([]);
  const [selectedTroop, setSelectedTroop] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('barracks'); // barracks, magic
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date()); // Para actualizar temporizadores

  // Separar tropas por edificio
  const barracksTypes = ['Soldado', 'Arquero', 'Jinete', 'Cañón'];
  const magicTypes = ['Mago', 'Bruja', 'Fantasma', 'Esqueleto'];

  useEffect(() => {
    if (user) {
      loadData();
      // Cargar cola de entrenamiento cada 5 segundos (menos frecuente)
      const interval = setInterval(loadTrainingQueue, 5000);
      return () => clearInterval(interval);
    }
  }, [user, userBuildings]);

  // Timer para actualizar la visualización del tiempo cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTroopTypes(),
        loadUserTroops(),
        loadTrainingQueue()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTroopTypes = async () => {
    try {
      console.log('🔍 Debug - Iniciando carga de troop types...');
      const token = localStorage.getItem('auth-token');
      console.log('🔍 Debug - Token presente:', !!token);
      
      const response = await fetch(`${API_BASE_URL}/api/village/troop-types`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 Debug - Response status:', response.status);
      console.log('🔍 Debug - Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Debug - Raw response data:', data);
        
        // Verificar si la respuesta tiene el formato correcto
        if (data.success && Array.isArray(data.data)) {
          console.log('🔍 Tropas cargadas:', data.data.length, 'tipos');
          console.log('🔍 Nombres:', data.data.map(t => `${t.name} (${t.category})`).join(', '));
          setTroopTypes(data.data);
        } else {
          console.log('🔍 Debug - Setting troopTypes with raw data:', data);
          setTroopTypes(Array.isArray(data) ? data : []);
        }
      } else {
        console.error('❌ Error en respuesta:', response.status, response.statusText);
        setTroopTypes([]);
      }
    } catch (error) {
      console.error('Error cargando tipos de tropas:', error);
      setTroopTypes([]);
    }
  };

  const loadUserTroops = async () => {
    try {
      console.log('🔍 Debug - Iniciando carga de user troops...');
      const token = localStorage.getItem('auth-token');
      console.log('🔍 Debug - Token presente:', !!token);
      
      const response = await fetch(`${API_BASE_URL}/api/village/user-troops`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔍 Debug - User troops response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Debug - Raw user troops data:', data);
        
        if (data.success && Array.isArray(data.data)) {
          const troopsObject = {};
          data.data.forEach(troop => {
            if (troop.troop_name) {
              troopsObject[troop.troop_name] = troop.quantity;
            }
          });
          console.log('🔍 Debug - Processed troops object:', troopsObject);
          setUserTroops(troopsObject);
        } else {
          console.log('🔍 Debug - Unexpected data format:', data);
          setUserTroops({});
        }
      } else if (response.status !== 404) {
        console.error('❌ Error en respuesta user troops:', response.status, response.statusText);
        setUserTroops({});
      } else {
        // 404 - No hay tropas aún
        console.log('ℹ️ Usuario sin tropas (404)');
        setUserTroops({});
      }
    } catch (error) {
      console.error('❌ Error cargando tropas del usuario:', error);
      setUserTroops({});
    }
  };

  const loadTrainingQueue = async () => {
    try {
      console.log('🔄 loadTrainingQueue iniciado...');
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${API_BASE_URL}/api/village/training-queue`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔄 loadTrainingQueue response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔄 loadTrainingQueue result:', result);
        const queueArray = result.success ? result.data || [] : [];
        console.log('🔄 queueArray length:', queueArray.length);
        console.log('🔄 queueArray content:', queueArray);
        setTrainingQueue(queueArray);
        
        // TEMPORALMENTE DESHABILITADO: Auto-completar entrenamientos terminados
        // Para que puedas ver el temporizador funcionando
        /*
        const completedTrainings = queueArray.filter(training => {
          const endTime = new Date(training.end_time);
          const now = new Date();
          return endTime <= now;
        });
        
        // Completar entrenamientos terminados automáticamente (uno por uno para evitar conflictos)
        for (const completed of completedTrainings) {
          console.log('Auto-completando entrenamiento:', completed.id);
          try {
            // Solo intentar completar si aún está en status 'training'
            if (completed.status === 'training') {
              await completeTroopTraining(completed.id);
              // Esperar un poco entre completados para evitar conflictos
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              console.log('⚠️ Entrenamiento ya completado:', completed.id);
            }
          } catch (error) {
            console.error('Error auto-completando:', error);
            // Continuar con el siguiente aunque falle uno
          }
        }
        
        // Si se completaron entrenamientos, recargar datos después de un breve delay
        if (completedTrainings.length > 0) {
          setTimeout(() => {
            loadUserTroops();
            loadTrainingQueue(); // Recargar la cola para quitar los completados
          }, 1000);
        }
        */
      } else {
        console.log('❌ loadTrainingQueue response not ok:', response.status);
        setTrainingQueue([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cola de entrenamiento:', error);
      setTrainingQueue([]);
    }
  };

  const completeTroopTraining = async (queueId) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${API_BASE_URL}/api/village/training/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ queueId })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Entrenamiento completado exitosamente:', queueId);
        // Recargar datos después de completar
        await loadUserTroops();
        await loadTrainingQueue();
        return true;
      } else {
        console.warn('⚠️ No se pudo completar entrenamiento:', result.message || 'Error desconocido');
        return false;
      }
    } catch (error) {
      console.error('❌ Error completando entrenamiento:', error);
      return false;
    }
  };

  const startTraining = async (troopType, qty) => {
    try {
      console.log('🎯 INICIO startTraining:', { troopType: troopType.name, qty });
      
      const buildingTypeId = getBuildingTypeForTroop(troopType.name);
      console.log('🏗️ buildingTypeId requerido:', buildingTypeId);
      console.log('🏗️ userBuildings disponibles:', userBuildings);
      
      const building = userBuildings.find(b => b.building_type_id === buildingTypeId);
      console.log('🏗️ building encontrado:', building);
      
      if (!building) {
        console.error('❌ No tienes el edificio necesario');
        alert(`Necesitas construir un ${getBuildingNameForTroop(troopType.name)} primero`);
        return;
      }

      // Verificar si puede costear las tropas
      // NOTA: El backend validará esto, pero dejamos validación simple de UI
      console.log('💰 Enviando petición de entrenamiento...');
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${API_BASE_URL}/api/village/training/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          troopTypeId: troopType.id,
          buildingId: building.id,
          quantity: qty
        })
      });

      console.log('📡 Respuesta del servidor:', response.status);
      const result = await response.json();
      console.log('📦 Resultado:', result);
      
      if (result.success) {
        console.log(`✅ Iniciado entrenamiento de ${qty} ${troopType.name}(s)!`);
        
        // ✅ El backend ya descontó los recursos automáticamente
        // Ahora solo necesitamos obtener los recursos actualizados del backend
        const token = localStorage.getItem('auth-token');
        const resourcesResponse = await fetch(`${API_BASE_URL}/api/resources/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (resourcesResponse.ok) {
          const resourcesData = await resourcesResponse.json();
          if (resourcesData.success && resourcesData.data) {
            setUserResources(resourcesData.data);
            console.log('✅ Recursos actualizados desde backend:', resourcesData.data);
          }
        }
        
        // Recargar cola de entrenamiento
        console.log('🔄 Recargando cola de entrenamiento...');
        await loadTrainingQueue();
        
      } else {
        console.error('❌ Error del servidor:', result.message);
        alert(result.message || 'Error iniciando entrenamiento');
      }
    } catch (error) {
      console.error('❌ Error en startTraining:', error);
      alert('Error de conexión');
    }
  };

  const getBuildingTypeForTroop = (troopName) => {
    if (barracksTypes.includes(troopName)) return 14; // Cuartel
    if (magicTypes.includes(troopName)) return 15; // Torre de Magos (ID correcto)
    return null;
  };

  const getBuildingNameForTroop = (troopName) => {
    if (barracksTypes.includes(troopName)) return 'Cuartel';
    if (magicTypes.includes(troopName)) return 'Torre de Magos';
    return 'Edificio desconocido';
  };

  const getBuildingLevelForTroop = (troopName) => {
    const buildingTypeId = getBuildingTypeForTroop(troopName);
    
    // Validar que userBuildings sea un array
    if (!Array.isArray(userBuildings)) {
      console.warn('userBuildings no es un array:', userBuildings);
      return 0;
    }
    
    const building = userBuildings.find(b => b.building_type_id === buildingTypeId);
    return building ? building.level : 0;
  };

// Validar si puede costear tropas (llamando al backend)
  const canAfford = async (troop, qty) => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${API_BASE_URL}/api/troops/can-afford`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ troopTypeId: troop.id, quantity: qty })
      });
      const result = await response.json();
      return result.success && result.data.canAfford;
    } catch (error) {
      console.error('Error validando recursos:', error);
      return false;
    }
  };

  const canTrain = (troop) => {
    const buildingLevel = getBuildingLevelForTroop(troop.name);
    return buildingLevel >= troop.required_building_level;
  };

  const getRemainingTime = (training) => {
    const endTime = new Date(training.end_time);
    const now = currentTime; // Usar el estado actualizado
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    
    if (remaining <= 0) {
      return '¡Completado!';
    }
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const currentTroops = Array.isArray(troopTypes) 
    ? (activeTab === 'barracks' 
        ? troopTypes.filter(t => barracksTypes.includes(t.name))
        : troopTypes.filter(t => magicTypes.includes(t.name)))
    : [];

  // Cola de entrenamiento: mostrar TODAS las tropas en entrenamiento
  const currentQueue = Array.isArray(trainingQueue) && Array.isArray(troopTypes)
    ? trainingQueue.filter(training => {
        const troop = troopTypes.find(t => t.name === training.troop_name);
        return troop; // Solo necesitamos que la tropa exista
      })
    : [];

  // Solo para el grid de tropas filtramos por pestaña
  const currentQueueForTab = Array.isArray(trainingQueue) && Array.isArray(troopTypes)
    ? trainingQueue.filter(training => {
        const troop = troopTypes.find(t => t.name === training.troop_name);
        if (!troop) return false;
        return activeTab === 'barracks' 
          ? barracksTypes.includes(troop.name)
          : magicTypes.includes(troop.name);
      })
    : [];

  // Debug crítico para cola de entrenamiento
  console.log('🚨 Debug Cola Entrenamiento:');
  console.log('- trainingQueue:', trainingQueue);
  console.log('- trainingQueue.length:', trainingQueue?.length);
  console.log('- troopTypes:', troopTypes);
  console.log('- troopTypes.length:', troopTypes?.length);
  console.log('- currentQueue:', currentQueue);
  console.log('- currentQueue.length:', currentQueue?.length);
  console.log('- Condición mostrar cola (currentQueue.length > 0):', currentQueue.length > 0);

  // Debug específico para tropas mágicas
  console.log('🔮 Debug Tropas Mágicas:');
  console.log('- activeTab:', activeTab);
  console.log('- magicTypes:', magicTypes);
  console.log('- userTroops:', userTroops);
  console.log('- currentTroops:', currentTroops);
  
  if (activeTab === 'magic') {
    console.log('🔮 Debug detallado Torre de Magos:');
    magicTypes.forEach(magicType => {
      const troopData = troopTypes.find(t => t.name === magicType);
      const troopCount = userTroops?.[magicType] || 0;
      console.log(`- ${magicType}: cantidad=${troopCount}, data=`, troopData);
    });
  }

  if (loading) {
    return <div className="text-center p-4">Cargando tropas...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2 text-center" style={{fontFamily: 'Cinzel, serif'}}>
          ⚔️ Gestión de Tropas
        </h2>
        <p className="text-gray-400 text-center text-sm">Entrena y administra tu ejército</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('barracks')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'barracks' 
              ? 'btn-primary' 
              : 'btn-secondary'
          }`}
        >
          🏰 Cuartel
        </button>
        <button
          onClick={() => setActiveTab('magic')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'magic' 
              ? 'btn-primary' 
              : 'btn-secondary'
          }`}
        >
          🔮 Torre de Magos
        </button>
      </div>

      {/* Cola de Entrenamiento - SIMPLIFICADA */}
      {Array.isArray(trainingQueue) && trainingQueue.length > 0 && (
        <div className="mb-8 card-glass p-5 rounded-xl border-2 border-yellow-400 border-opacity-30">
          <h3 className="text-xl font-bold mb-4 text-yellow-300">⏳ Cola de Entrenamiento</h3>
          <div className="space-y-2">
            {trainingQueue.map((training) => {
              const timeRemaining = getRemainingTime(training);
              const isCompleted = timeRemaining === '¡Completado!';
              
              // Debug específico para cada tropa en entrenamiento
              console.log('🔍 Tropa en entrenamiento:', {
                id: training.id,
                troop_name: training.troop_name,
                quantity: training.quantity,
                timeRemaining,
                isCompleted
              });
              
              return (
                <div key={training.id} className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  isCompleted ? 'bg-green-500 bg-opacity-20 border-green-400' : 'bg-gray-800 bg-opacity-50 border-gray-600'
                }`}>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getTroopIcon(training.troop_name)}</span>
                    <div>
                      <div className="font-semibold text-gray-800">
                        Entrenando: {training.quantity}x {training.troop_name || 'Tropa Desconocida'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Estado: {isCompleted ? 'Completado' : 'En progreso'}
                      </div>
                      {isCompleted && (
                        <div className="text-sm text-green-600 font-medium">
                          ¡Listo para recoger!
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                      {timeRemaining}
                    </div>
                    {isCompleted && (
                      <button
                        onClick={() => completeTroopTraining(training.id)}
                        className="mt-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Recoger
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tropas actuales */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-yellow-300">🛡️ Tus Tropas</h3>
          <button
            onClick={async () => {
              await loadUserTroops();
              console.log('🔄 Tropas recargadas:', userTroops);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            🔄 Recargar
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentTroops.map(troop => (
            <div key={troop.id} className="card-glass p-4 rounded-xl text-center border-2 border-gray-600 hover:border-yellow-400 transition-all">
              <div className="text-3xl mb-2">{getTroopIcon(troop.name)}</div>
              <div className="font-bold text-lg text-white">{troop.name}</div>
              <div className="text-green-400 font-bold text-xl">
                {userTroops?.[troop.name] || 0}
              </div>
              <div className="text-xs text-gray-200">Poder: {troop.power}</div>
              {troop.required_building_level > 1 && (
                <div className="text-xs text-blue-300">Nivel {troop.required_building_level}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Entrenar tropas */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-yellow-300">🎯 Entrenar Tropas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentTroops.map(troop => {
            const buildingLevel = getBuildingLevelForTroop(troop.name);
            const buildingName = getBuildingNameForTroop(troop.name);
            const canTrainTroop = canTrain(troop);
            // Validaci\u00f3n simple de UI (backend validar\u00e1 realmente)
            const hasEnoughWood = userResources?.wood >= troop.wood_cost;
            const hasEnoughStone = userResources?.stone >= troop.stone_cost;
            const hasEnoughFood = userResources?.food >= troop.food_cost;
            const hasEnoughIron = userResources?.iron >= troop.iron_cost;
            const canAffordBasic = hasEnoughWood && hasEnoughStone && hasEnoughFood && hasEnoughIron;

            return (
              <div key={troop.id} className={`card-glass border-2 rounded-xl p-5 transition-all ${
                canTrainTroop && canAffordBasic 
                  ? 'border-green-500 hover:border-green-400 hover:scale-105' 
                  : 'border-gray-600 opacity-75'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl">{getTroopIcon(troop.name)}</span>
                    <div>
                      <h4 className="font-bold text-lg text-white">{troop.name}</h4>
                      <p className="text-sm text-gray-200">Poder: {troop.power}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-300 mb-1">Costo:</div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-200">
                    {troop.wood_cost > 0 && <div>🪵 {troop.wood_cost}</div>}
                    {troop.stone_cost > 0 && <div>🪨 {troop.stone_cost}</div>}
                    {troop.food_cost > 0 && <div>🍞 {troop.food_cost}</div>}
                    {troop.iron_cost > 0 && <div>⚙️ {troop.iron_cost}</div>}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-300">
                    Requiere {buildingName} Nivel {troop.required_building_level}
                  </div>
                  <div className="text-xs text-gray-200">
                    Tu {buildingName}: Nivel {buildingLevel}
                  </div>
                </div>

                {canTrainTroop ? (
                  canAffordTroop ? (
                    <button
                      onClick={() => {
                        setSelectedTroop(troop);
                        setQuantity(1);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition-all hover:scale-105"
                    >
                      Entrenar
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-600 text-gray-300 py-2 px-4 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Sin recursos
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full bg-red-600 bg-opacity-50 text-gray-200 py-2 px-4 rounded-lg font-semibold cursor-not-allowed"
                  >
                    {buildingName} Nivel {troop.required_building_level} requerido
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Poder total */}
      <div className="card-glass p-5 rounded-xl border-2 border-yellow-400 border-opacity-30">
        <h3 className="text-lg font-semibold text-yellow-300 mb-2">💪 Poder Total</h3>
        <div className="text-3xl font-bold text-yellow-400">
          {(() => {
            const totalPower = currentTroops.reduce((total, troop) => {
              const troopCount = userTroops?.[troop.name] || 0;
              const troopPower = troop.power || 0;
              const subtotal = troopCount * troopPower;
              console.log(`💪 Power calc - ${troop.name}: ${troopCount} x ${troopPower} = ${subtotal}`);
              return total + subtotal;
            }, 0);
            
            console.log(`💪 Total power for ${activeTab}:`, totalPower);
            console.log(`💪 UserTroops:`, userTroops);
            console.log(`💪 CurrentTroops:`, currentTroops);
            
            return totalPower;
          })()}
        </div>
        <div className="text-sm text-gray-400">
          {activeTab === 'barracks' ? 'Tropas de Cuartel' : 'Tropas Mágicas'}
        </div>
      </div>

      {/* Modal de Entrenamiento */}
      {selectedTroop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-glass p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-yellow-400">
            <h3 className="text-xl font-bold mb-4 text-center text-yellow-300">
              {getTroopIcon(selectedTroop.name)} Entrenar {selectedTroop.name}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cantidad a entrenar:
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded font-semibold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center border-2 border-gray-600 bg-gray-800 text-white rounded px-2 py-1 font-semibold"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded font-semibold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-800 bg-opacity-50 rounded-lg border-2 border-gray-700">
              <div className="text-sm text-gray-300 mb-2">Costo total:</div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-200">
                <div>🪵 {selectedTroop.wood_cost * quantity}</div>
                <div>🪨 {selectedTroop.stone_cost * quantity}</div>
                <div>🍞 {selectedTroop.food_cost * quantity}</div>
                <div>⚙️ {selectedTroop.iron_cost * quantity}</div>
              </div>
              <div className="mt-2 text-sm text-gray-300">
                Tiempo: {(selectedTroop.training_time_minutes * quantity * 60).toFixed(0)}s
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedTroop(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  startTraining(selectedTroop, quantity);
                  setSelectedTroop(null);
                }}
                disabled={!canAfford(selectedTroop, quantity)}
                className={`flex-1 py-2 px-4 rounded font-semibold ${
                  canAfford(selectedTroop, quantity)
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                Entrenar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedTroops;
