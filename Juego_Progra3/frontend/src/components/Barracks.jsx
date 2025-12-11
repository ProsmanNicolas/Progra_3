import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getTroopIcon } from '../utils/troopIcons';

const Barracks = ({ user, userResources, setUserResources, userBuildings }) => {
  const [userTroops, setUserTroops] = useState(null);
  const [troopTypes, setTroopTypes] = useState([]);
  const [trainingQueue, setTrainingQueue] = useState([]);
  const [selectedTroop, setSelectedTroop] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isTraining, setIsTraining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [barracksBuilding, setBarracksBuilding] = useState(null);

  // Encontrar el cuartel del usuario
  useEffect(() => {
    if (userBuildings) {
      const barrack = userBuildings.find(building => 
        building.building_type_id === 14 // ID del Cuartel
      );
      setBarracksBuilding(barrack);
    }
  }, [userBuildings]);

  // Cargar tipos de tropas desde el backend
  useEffect(() => {
    const loadTroopTypes = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        const response = await fetch('http://localhost:3001/api/village/troop-types', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setTroopTypes(result.data || []);
        }
      } catch (error) {
        console.error('Error cargando tipos de tropas:', error);
        // Fallback a consulta directa si el endpoint falla
        const { data, error: dbError } = await supabase
          .from('troop_types')
          .select('*')
          .order('required_building_level', { ascending: true });
        
        if (!dbError && data) {
          setTroopTypes(data);
        }
      }
    };

    loadTroopTypes();
  }, [user]);

  // Cargar tropas del usuario
  useEffect(() => {
    if (user) {
      loadUserTroops();
      loadTrainingQueue();
    }
  }, [user]);

  // Actualizar cola de entrenamiento cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      loadTrainingQueue();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadUserTroops = async () => {
    try {
      const { data, error } = await supabase
        .from('user_troops')
        .select(`
          *,
          troop_types (
            name,
            power
          )
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        // Convertir array a objeto para compatibilidad con la interfaz actual
        const troopsObject = {};
        data.forEach(troop => {
          if (troop.troop_types) {
            troopsObject[troop.troop_types.name] = troop.quantity;
          }
        });
        setUserTroops(troopsObject);
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error cargando tropas:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingQueue = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('http://localhost:3001/api/village/training-queue', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setTrainingQueue(result.data || []);
        
        // Auto-completar entrenamientos terminados basándose en end_time
        const completedTrainings = result.data?.filter(training => {
          const endTime = new Date(training.end_time);
          const now = new Date();
          return endTime <= now;
        }) || [];
        
        // Completar entrenamientos terminados automáticamente
        for (const completed of completedTrainings) {
          console.log('Auto-completando entrenamiento:', completed.id);
          await completeTraining(completed.id);
        }
        
        // Si se completaron entrenamientos, recargar datos
        if (completedTrainings.length > 0) {
          setTimeout(() => {
            loadUserTroops();
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error cargando cola de entrenamiento:', error);
    }
  };

  const completeTraining = async (queueId) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('http://localhost:3001/api/village/training/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ queueId })
      });

      if (response.ok) {
        loadUserTroops();
        loadTrainingQueue();
      }
    } catch (error) {
      console.error('Error completando entrenamiento:', error);
    }
  };

  const canAfford = (troop, qty) => {
    const totalCost = {
      wood: troop.wood_cost * qty,
      stone: troop.stone_cost * qty,
      food: troop.food_cost * qty,
      iron: troop.iron_cost * qty
    };

    return (
      userResources.wood >= totalCost.wood &&
      userResources.stone >= totalCost.stone &&
      userResources.food >= totalCost.food &&
      userResources.iron >= totalCost.iron
    );
  };

  const canTrainTroop = (troop) => {
    if (!barracksBuilding) return false;
    return barracksBuilding.level >= (troop.required_building_level || 1);
  };

  const getRemainingTime = (training) => {
    // Calcular tiempo restante basado en end_time
    const now = new Date();
    const endTime = new Date(training.end_time);
    const diffMs = endTime - now;
    const seconds = Math.max(0, Math.floor(diffMs / 1000));
    
    if (seconds <= 0) return 'Completado';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const trainTroops = async () => {
    if (!selectedTroop || !canAfford(selectedTroop, quantity) || !canTrainTroop(selectedTroop) || isTraining || !barracksBuilding) return;

    setIsTraining(true);

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('http://localhost:3001/api/village/training/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          troopTypeId: selectedTroop.id,
          buildingId: barracksBuilding.id,
          quantity: quantity
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Calcular costos y actualizar recursos localmente
        const totalCost = {
          wood: selectedTroop.wood_cost * quantity,
          stone: selectedTroop.stone_cost * quantity,
          food: selectedTroop.food_cost * quantity,
          iron: selectedTroop.iron_cost * quantity
        };

        const newResources = {
          wood: userResources.wood - totalCost.wood,
          stone: userResources.stone - totalCost.stone,
          food: userResources.food - totalCost.food,
          iron: userResources.iron - totalCost.iron,
          last_updated: new Date().toISOString()
        };

        // Actualizar recursos en la base de datos
        await supabase
          .from('user_resources')
          .update(newResources)
          .eq('user_id', user.id);

        setUserResources(newResources);
        setQuantity(1);
        setSelectedTroop(null);
        loadTrainingQueue();

        console.log(`✅ Iniciado entrenamiento de ${quantity} ${selectedTroop.name}(s)!`);
      } else {
        alert(result.message || 'Error iniciando entrenamiento');
      }
    } catch (error) {
      console.error('Error entrenando tropas:', error);
      alert('Error iniciando entrenamiento');
    } finally {
      setIsTraining(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Cargando cuartel...</div>;
  }

  if (!barracksBuilding) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center mb-6">
          <span className="text-3xl mr-3">🏰</span>
          <h2 className="text-2xl font-bold text-gray-800">Cuartel</h2>
        </div>
        <p className="text-center text-gray-600">Necesitas construir un Cuartel para entrenar tropas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <span className="text-3xl mr-3">🏰</span>
        <h2 className="text-2xl font-bold text-gray-800">
          Cuartel (Nivel {barracksBuilding.level})
        </h2>
      </div>

      {/* Cola de entrenamiento */}
      {trainingQueue.length > 0 && (
        <div className="mb-8 bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">⏳ En entrenamiento:</h3>
          <div className="space-y-2">
            {trainingQueue.map((training) => (
              <div key={training.id} className="bg-white p-3 rounded-lg flex justify-between items-center border">
                <div>
                  <span className="font-medium capitalize">
                    {training.quantity}x {training.troop_types?.name || 'Tropa'}
                  </span>
                </div>
                <div className="text-blue-600 font-mono font-bold">
                  ⏱️ {getRemainingTime(training)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tropas actuales */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">🛡️ Tus Tropas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {troopTypes.map(troop => (
            <div key={troop.id} className="bg-gray-100 p-3 rounded-lg text-center">
              <div className="text-2xl mb-2">
                {getTroopIcon(troop.name)}
              </div>
              <div className="font-semibold">{troop.name}</div>
              <div className="text-green-600 font-bold">
                {userTroops?.[troop.name] || 0}
              </div>
              <div className="text-xs text-gray-500">Poder: {troop.power}</div>
              {troop.required_building_level > 1 && (
                <div className="text-xs text-blue-500">Nivel {troop.required_building_level}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Entrenar tropas */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">🎯 Entrenar Tropas</h3>
        
        {/* Seleccionar tipo de tropa */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {troopTypes.map(troop => {
            const canTrain = canTrainTroop(troop);
            return (
              <button
                key={troop.id}
                onClick={() => canTrain && setSelectedTroop(troop)}
                disabled={!canTrain}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedTroop?.id === troop.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : canTrain
                    ? 'border-gray-200 hover:border-blue-300'
                    : 'border-red-200 bg-red-50 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="text-2xl mb-1">
                  {getTroopIcon(troop.name)}
                </div>
                <div className="text-xs font-semibold">{troop.name}</div>
                <div className="text-xs text-gray-500">Poder: {troop.power}</div>
                {troop.required_building_level && (
                  <div className={`text-xs mt-1 ${canTrain ? 'text-green-500' : 'text-red-500'}`}>
                    Nivel {troop.required_building_level} req.
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detalles de la tropa seleccionada */}
        {selectedTroop && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-3">
                {getTroopIcon(selectedTroop.name)}
              </span>
              <h4 className="text-lg font-bold">{selectedTroop.name}</h4>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>💪 Poder: <span className="font-bold">{selectedTroop.power}</span></div>
              <div>🪵 Madera: <span className="font-bold">{selectedTroop.wood_cost}</span></div>
              <div>🪨 Piedra: <span className="font-bold">{selectedTroop.stone_cost}</span></div>
              <div>🍞 Comida: <span className="font-bold">{selectedTroop.food_cost}</span></div>
              <div>⚡ Hierro: <span className="font-bold">{selectedTroop.iron_cost}</span></div>
              <div>⏰ Tiempo: <span className="font-bold">{Math.round((selectedTroop.training_time_minutes || 0) * 60)}s</span></div>
              {selectedTroop.required_building_level && (
                <div>🏗️ Nivel req: <span className="font-bold">{selectedTroop.required_building_level}</span></div>
              )}
            </div>

            <div className="flex items-center gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cantidad:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded"
                />
              </div>

              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">Costo total:</div>
                <div className="flex gap-3 text-sm">
                  {selectedTroop.wood_cost > 0 && (
                    <span className={`${userResources.wood >= selectedTroop.wood_cost * quantity ? 'text-green-600' : 'text-red-500'}`}>
                      🪵 {selectedTroop.wood_cost * quantity}
                    </span>
                  )}
                  {selectedTroop.stone_cost > 0 && (
                    <span className={`${userResources.stone >= selectedTroop.stone_cost * quantity ? 'text-green-600' : 'text-red-500'}`}>
                      🪨 {selectedTroop.stone_cost * quantity}
                    </span>
                  )}
                  {selectedTroop.food_cost > 0 && (
                    <span className={`${userResources.food >= selectedTroop.food_cost * quantity ? 'text-green-600' : 'text-red-500'}`}>
                      🍞 {selectedTroop.food_cost * quantity}
                    </span>
                  )}
                  {selectedTroop.iron_cost > 0 && (
                    <span className={`${userResources.iron >= selectedTroop.iron_cost * quantity ? 'text-green-600' : 'text-red-500'}`}>
                      ⚡ {selectedTroop.iron_cost * quantity}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={trainTroops}
                disabled={!canAfford(selectedTroop, quantity) || !canTrainTroop(selectedTroop) || isTraining}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  canAfford(selectedTroop, quantity) && canTrainTroop(selectedTroop) && !isTraining
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isTraining ? 'Entrenando...' : `Entrenar ${quantity}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Poder total del ejército */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-700">⚡ Poder Total del Ejército</h3>
        <div className="text-2xl font-bold text-green-600">
          {troopTypes.reduce((total, troop) => {
            return total + (userTroops?.[troop.name] || 0) * troop.power;
          }, 0)}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Este es tu poder de combate total para las batallas
        </div>
      </div>
    </div>
  );
};

export default Barracks;
