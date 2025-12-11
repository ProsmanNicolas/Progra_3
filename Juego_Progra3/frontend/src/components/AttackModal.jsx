import React, { useState, useEffect } from 'react';
import troopAPI from '../services/troopAPI';
import { getTroopIcon } from '../utils/troopIcons';

/**
 * Modal para atacar una aldea enemiga
 * Permite seleccionar tropas para el ataque y ver estimación de poder
 */
function AttackModal({ 
  isOpen, 
  onClose, 
  targetVillage, 
  currentUser, 
  onAttackComplete 
}) {
  const [userTroops, setUserTroops] = useState([]);
  const [troopTypes, setTroopTypes] = useState([]);
  const [selectedTroops, setSelectedTroops] = useState({});
  const [defenseAssignments, setDefenseAssignments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [targetDefensePower, setTargetDefensePower] = useState(null);

  // Resetear cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setTargetDefensePower(null);
      setSelectedTroops({});
      setError('');
      setUserTroops([]);
      setTroopTypes([]);
      setDefenseAssignments({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentUser && targetVillage) {
      // Resetear estados al abrir el modal
      setTargetDefensePower(null);
      setError('');
      
      console.log('🔄 AttackModal useEffect ejecutándose');
      console.log('🔄 currentUser:', currentUser);
      console.log('🔄 targetVillage:', targetVillage);
      
      // Cargar datos
      loadUserTroops();
      loadTroopTypes();
      loadDefenseAssignments();
      
      // Pequeño delay para asegurar que targetVillage esté completamente cargado
      setTimeout(() => {
        calculateTargetDefense();
      }, 100);
    }
  }, [isOpen, currentUser?.id, targetVillage?.id]); // Usar IDs específicos

  const loadUserTroops = async () => {
    try {
      const response = await troopAPI.getUserTroops();
      if (response.success) {
        setUserTroops(response.data);
        // Inicializar selección en 0 para todas las tropas
        const initialSelection = {};
        response.data.forEach(troop => {
          initialSelection[troop.troop_type_id] = 0;
        });
        setSelectedTroops(initialSelection);
      }
    } catch (error) {
      console.error('Error cargando tropas:', error);
      setError('Error al cargar tus tropas');
    }
  };

  const loadTroopTypes = async () => {
    try {
      const response = await troopAPI.getTroopTypes();
      if (response.success) {
        setTroopTypes(response.data);
      }
    } catch (error) {
      console.error('Error cargando tipos de tropas:', error);
    }
  };

  const loadDefenseAssignments = async () => {
    try {
      const response = await troopAPI.getAllDefenseAssignments();
      if (response.success) {
        setDefenseAssignments(response.data.assignments || {});
      }
    } catch (error) {
      console.error('Error cargando asignaciones de defensa:', error);
      setDefenseAssignments({});
    }
  };

  const calculateTargetDefense = async () => {
    try {
      console.log('🎯 AttackModal: Calculando defensa del objetivo');
      console.log('🎯 targetVillage completo:', JSON.stringify(targetVillage, null, 2));
      console.log('🎯 Propiedades de targetVillage:', Object.keys(targetVillage || {}));
      console.log('🎯 user_id del objetivo:', targetVillage?.user_id);
      console.log('🎯 Tipo de user_id:', typeof targetVillage?.user_id);
      
      if (!targetVillage?.user_id) {
        console.error('❌❌❌ CRITICAL: No se encontró user_id del objetivo');
        console.error('❌ targetVillage:', targetVillage);
        console.error('❌ Todas las propiedades:', targetVillage ? Object.keys(targetVillage) : 'targetVillage es null/undefined');
        setTargetDefensePower(0);
        return;
      }

      console.log('📡 Llamando a troopAPI.getTargetDefensePower con user_id:', targetVillage.user_id);
      const response = await troopAPI.getTargetDefensePower(targetVillage.user_id);
      console.log('📥 Respuesta recibida completa:', response);
      console.log('📥 response.success:', response.success);
      console.log('📥 response.data:', response.data);
      console.log('📥 response.data.defensePower:', response.data?.defensePower);
      
      if (response.success && response.data) {
        const power = response.data.defensePower ?? 0;
        console.log('✅ Poder defensivo obtenido:', power);
        setTargetDefensePower(power);
      } else {
        console.warn('⚠️ No se pudo obtener poder defensivo del objetivo, respuesta:', response);
        setTargetDefensePower(0);
      }
    } catch (error) {
      console.error('❌ Error calculando defensa del objetivo:', error);
      setTargetDefensePower(0);
    }
  };

  const handleTroopSelection = (troopTypeId, change) => {
    const currentUserTroop = userTroops.find(troop => troop.troop_type_id === troopTypeId);
    if (!currentUserTroop) return;

    const currentSelection = selectedTroops[troopTypeId] || 0;
    const newSelection = currentSelection + change;

    // Calcular tropas disponibles para ataque (total - asignadas a defensa)
    const assignedToDefense = defenseAssignments[troopTypeId] || 0;
    const availableForAttack = currentUserTroop.quantity - assignedToDefense;

    // Validar límites
    if (newSelection < 0 || newSelection > availableForAttack) {
      return;
    }

    setSelectedTroops(prev => ({
      ...prev,
      [troopTypeId]: newSelection
    }));
  };

  // Estado para poder de ataque (calculado por backend)
  const [attackPower, setAttackPower] = useState(0);

  // Calcular poder de ataque usando backend
  const calculateAttackPower = async () => {
    try {
      const response = await troopAPI.calculateAttackPower(selectedTroops);
      if (response.success) {
        setAttackPower(response.data.totalPower);
        return response.data.totalPower;
      }
    } catch (error) {
      console.error('Error calculando poder de ataque:', error);
    }
    return 0;
  };

  // Recalcular cuando cambien tropas seleccionadas
  useEffect(() => {
    if (Object.keys(selectedTroops).length > 0) {
      calculateAttackPower();
    } else {
      setAttackPower(0);
    }
  }, [selectedTroops]);

  const getTotalSelectedTroops = () => {
    return Object.values(selectedTroops).reduce((total, quantity) => total + quantity, 0);
  };

  const handleAttack = async () => {
    if (getTotalSelectedTroops() === 0) {
      setError('Debes seleccionar al menos una tropa para atacar');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await troopAPI.executeBattle({
        defenderId: targetVillage.user_id,
        attackingTroops: selectedTroops
      });

      if (response.success) {
        alert(`¡Batalla completada! ${response.data.result === 'victory' ? 'Victoria' : 'Derrota'}`);
        onAttackComplete && onAttackComplete(response.data);
        onClose();
      } else {
        setError(response.message || 'Error en la batalla');
      }
    } catch (error) {
      console.error('Error ejecutando batalla:', error);
      setError('Error de conexión durante la batalla');
    } finally {
      setLoading(false);
    }
  };

  const getTroopTypeById = (troopTypeId) => {
    return troopTypes.find(type => type.id === troopTypeId);
  };

  if (!isOpen) return null;

  const defensePower = targetDefensePower ?? 0; // Usar ?? en lugar de ||
  const isDefenseCalculated = targetDefensePower !== null;
  const battlePrediction = attackPower > defensePower ? 'Victoria probable' : 
                          attackPower === defensePower ? 'Batalla equilibrada' : 'Derrota probable';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card-glass rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-red-500">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-red-400" style={{fontFamily: 'Cinzel, serif'}}>
              ⚔️ Atacar Aldea
            </h2>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white text-3xl transition-colors"
            >
              ×
            </button>
          </div>

          {/* Target Info */}
          <div className="bg-red-500 bg-opacity-20 border-2 border-red-500 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-300 mb-2">🎯 Objetivo</h3>
            <p className="text-gray-200">
              <strong className="text-white">Aldea:</strong> {targetVillage?.village_name || 'Aldea enemiga'}
            </p>
            <p className="text-gray-200">
              <strong className="text-white">Jugador:</strong> {targetVillage?.user_display_name || 'Desconocido'}
            </p>
            <p className="text-gray-200">
              <strong className="text-white">Poder defensivo estimado:</strong> {isDefenseCalculated ? defensePower : '⏳ Calculando...'}
            </p>
          </div>

          {/* Battle Prediction */}
          {isDefenseCalculated ? (
            <div className={`border-2 rounded-lg p-4 mb-6 ${
              battlePrediction.includes('Victoria') ? 'bg-green-500 bg-opacity-20 border-green-500' :
              battlePrediction.includes('equilibrada') ? 'bg-yellow-500 bg-opacity-20 border-yellow-500' :
              'bg-red-500 bg-opacity-20 border-red-500'
            }`}>
              <div className="flex justify-between items-center mb-2 text-gray-200">
                <span className="font-semibold">Tu poder de ataque:</span>
                <span className="text-xl font-bold text-white">{attackPower}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-gray-200">
                <span className="font-semibold">Poder defensivo enemigo:</span>
                <span className="text-xl font-bold text-white">{defensePower}</span>
              </div>
              <div className={`text-center font-bold text-lg ${
                battlePrediction.includes('Victoria') ? 'text-green-300' :
                battlePrediction.includes('equilibrada') ? 'text-yellow-300' :
                'text-red-300'
              }`}>
                {battlePrediction}
              </div>
            </div>
          ) : (
            <div className="border-2 rounded-lg p-4 mb-6 bg-gray-800 bg-opacity-50 border-gray-700">
              <div className="text-center text-gray-300">
                <span className="animate-pulse">⏳ Calculando poder defensivo del enemigo...</span>
              </div>
            </div>
          )}

          {/* Troop Selection */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-yellow-300">🪖 Seleccionar Tropas</h3>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {userTroops.map(userTroop => {
                const troopType = getTroopTypeById(userTroop.troop_type_id);
                if (!troopType) return null;

                const selected = selectedTroops[userTroop.troop_type_id] || 0;
                const total = userTroop.quantity;
                const assignedToDefense = defenseAssignments[userTroop.troop_type_id] || 0;
                const availableForAttack = total - assignedToDefense;

                return (
                  <div key={userTroop.troop_type_id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getTroopIcon(troopType.name)}</span>
                      <div>
                        <p className="font-bold text-lg text-gray-900">{troopType.name}</p>
                        <p className="text-sm text-gray-700">
                          Poder: {troopType.power}
                        </p>
                        <p className="text-sm text-gray-600">
                          Total: {total} | En defensa: {assignedToDefense} | Disponibles: {availableForAttack}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTroopSelection(userTroop.troop_type_id, -1)}
                        disabled={selected === 0}
                        className="w-8 h-8 bg-red-500 text-white rounded disabled:bg-gray-300"
                      >
                        -
                      </button>
                      
                      <span className="w-12 text-center font-semibold">
                        {selected}
                      </span>
                      
                      <button
                        onClick={() => handleTroopSelection(userTroop.troop_type_id, 1)}
                        disabled={selected >= availableForAttack}
                        className="w-8 h-8 bg-green-500 text-white rounded disabled:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const totalAvailableForAttack = userTroops.reduce((total, troop) => {
                const assignedToDefense = defenseAssignments[troop.troop_type_id] || 0;
                return total + (troop.quantity - assignedToDefense);
              }, 0);

              if (userTroops.length === 0) {
                return (
                  <p className="text-gray-500 text-center py-4">
                    No tienes tropas entrenadas
                  </p>
                );
              } else if (totalAvailableForAttack === 0) {
                return (
                  <p className="text-yellow-600 text-center py-4">
                    ⚠️ Todas tus tropas están asignadas a la defensa de torres
                  </p>
                );
              }
              return null;
            })()}
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
            
            <button
              onClick={handleAttack}
              disabled={loading || getTotalSelectedTroops() === 0}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Atacando...' : `⚔️ Atacar (${getTotalSelectedTroops()} tropas)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttackModal;
