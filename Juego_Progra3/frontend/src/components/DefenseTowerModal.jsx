import React, { useState, useEffect } from 'react';
import troopAPI from '../services/troopAPI';

export default function DefenseTowerModal({ isOpen, onClose, tower, userTroops, onAssignmentChange }) {
  const [loading, setLoading] = useState(false);
  const [assignedTroops, setAssignedTroops] = useState({});
  const [troopTypes, setTroopTypes] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen && tower) {
      loadData();
    }
  }, [isOpen, tower]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar tipos de tropas
      const typesResponse = await troopAPI.getTroopTypes();
      setTroopTypes(typesResponse.data || []);
      
      // Cargar asignaciones actuales de la torre
      if (tower?.id) {
        const assignmentsResponse = await troopAPI.getTowerDefenseAssignments(tower.id);
        setAssignedTroops(assignmentsResponse.data?.assignedTroops || {});
        console.log('✅ Asignaciones cargadas para torre:', tower.id, assignmentsResponse.data?.assignedTroops);
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos de defensa:', error);
      setMessage('Error cargando datos de defensa');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTroop = async (troopTypeId) => {
    const availableQuantity = userTroops[troopTypeId] || 0;
    const currentlyAssigned = assignedTroops[troopTypeId] || 0;
    
    if (availableQuantity <= currentlyAssigned) {
      setMessage('❌ No tienes más tropas de este tipo disponibles');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      // Asignar una tropa más a la defensa
      const newAssignment = {
        ...assignedTroops,
        [troopTypeId]: currentlyAssigned + 1
      };
      
      // Guardar en el backend
      await troopAPI.assignTroopsToDefense(tower.id, newAssignment);
      
      // Actualizar estado local solo si el backend tuvo éxito
      setAssignedTroops(newAssignment);
      
      setMessage(`✅ Tropa asignada a la defensa`);
      setTimeout(() => setMessage(''), 2000);
      
    } catch (error) {
      console.error('❌ Error asignando tropa:', error);
      setMessage(`❌ ${error.message || 'Error asignando tropa'}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRemoveTroop = async (troopTypeId) => {
    const currentlyAssigned = assignedTroops[troopTypeId] || 0;
    
    if (currentlyAssigned <= 0) {
      return;
    }

    try {
      // Remover una tropa de la defensa
      const newAssignment = {
        ...assignedTroops,
        [troopTypeId]: Math.max(0, currentlyAssigned - 1)
      };
      
      // Guardar en el backend
      await troopAPI.assignTroopsToDefense(tower.id, newAssignment);
      
      // Actualizar estado local solo si el backend tuvo éxito
      setAssignedTroops(newAssignment);
      
      setMessage(`✅ Tropa removida de la defensa`);
      setTimeout(() => setMessage(''), 2000);
      
    } catch (error) {
      console.error('❌ Error removiendo tropa:', error);
      setMessage(`❌ ${error.message || 'Error removiendo tropa'}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const calculateDefensePower = () => {
    let totalPower = 0;
    
    troopTypes.forEach(troopType => {
      const quantity = assignedTroops[troopType.id] || 0;
      totalPower += quantity * troopType.power;
    });
    
    return totalPower;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto border-2 border-yellow-400">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-yellow-400">🗼 Torre de Defensa</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando defensa...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Poder defensivo total */}
            <div className="bg-purple-900 bg-opacity-50 border-2 border-purple-500 rounded-lg p-4">
              <h3 className="font-bold text-purple-300 mb-2">
                ⚔️ Poder Defensivo Total: {calculateDefensePower()}
              </h3>
              <p className="text-purple-200 text-sm">
                Las tropas asignadas a esta torre defenderán tu aldea automáticamente
              </p>
            </div>

            {/* Lista de tropas disponibles */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-200">Asignar Tropas a la Defensa:</h3>
              
              {troopTypes.map(troopType => {
                const availableQuantity = userTroops[troopType.id] || 0;
                const assignedQuantity = assignedTroops[troopType.id] || 0;
                const freeQuantity = availableQuantity - assignedQuantity;

                return (
                  <div key={troopType.id} className="bg-gray-700 border-2 border-gray-600 rounded-lg p-4 hover:border-yellow-400 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h4 className="font-semibold text-white text-lg">{troopType.name}</h4>
                        <p className="text-sm text-gray-300">
                          ⚔️ Poder: {troopType.power} | 
                          📊 Totales: {availableQuantity} | 
                          🛡️ En defensa: {assignedQuantity} |
                          🆓 Libres: {freeQuantity}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRemoveTroop(troopType.id)}
                          disabled={assignedQuantity <= 0}
                          className={`px-3 py-1 rounded text-sm font-semibold ${
                            assignedQuantity > 0
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          ➖
                        </button>
                        
                        <span className="min-w-[3rem] text-center font-bold">
                          {assignedQuantity}
                        </span>
                        
                        <button
                          onClick={() => handleAssignTroop(troopType.id)}
                          disabled={freeQuantity <= 0}
                          className={`px-3 py-1 rounded text-sm font-semibold ${
                            freeQuantity > 0
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          ➕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mensaje de estado */}
            {message && (
              <div className={`p-3 rounded ${
                message.includes('❌') 
                  ? 'bg-red-50 border border-red-200 text-red-700' 
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}>
                {message}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-600">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 font-semibold"
              >
                ❌ Cerrar
              </button>
              <button
                onClick={() => {
                  if (onAssignmentChange) {
                    onAssignmentChange();
                  }
                  onClose();
                }}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-500 font-semibold"
              >
                ✅ Guardar Defensa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
