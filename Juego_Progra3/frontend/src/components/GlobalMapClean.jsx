import React, { useState, useEffect } from 'react';
import mapAPI from '../services/mapAPI';
import AttackModal from './AttackModal';

/**
 * Componente del Mapa Global - SOLO UI
 * Toda la lógica de negocio está en el backend
 */
function GlobalMapClean({ user, userResources, onResourceChange }) {
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [selectedVillageResources, setSelectedVillageResources] = useState(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [targetVillage, setTargetVillage] = useState(null);
  const [donationAmount, setDonationAmount] = useState({ wood: 0, stone: 0, iron: 0, food: 0 });
  const [message, setMessage] = useState('');

  // Helper para logs profesionales
  const logGameInfo = (action, details) => {
    const timestamp = new Date().toLocaleTimeString();
    console.info(`[${timestamp}] 🌍 Mapa Global - ${action}:`, details);
  };

  useEffect(() => {
    if (user) {
      loadVillages();
    }
  }, [user]);

  const loadVillages = async () => {
    try {
      setLoading(true);
      setError(null);
      logGameInfo('Cargando aldeas', 'Consultando mapa global...');

      const response = await mapAPI.getAllVillages();
      
      if (response.success) {
        setVillages(response.data || []);
        logGameInfo('Aldeas cargadas', `${response.data?.length || 0} aldeas encontradas`);
      } else {
        console.error('❌ Error cargando aldeas:', response.message);
        setError('Error al cargar las aldeas');
      }
      
    } catch (error) {
      console.error('❌ Error en loadVillages:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleViewVillage = async (village) => {
    setSelectedVillage(village);
    setSelectedVillageResources(null); // Limpiar recursos anteriores
    logGameInfo('Ver aldea', `Abriendo detalles de ${village.village_name || 'Aldea'}`);
    
    // Cargar recursos de la aldea seleccionada
    try {
      const response = await mapAPI.getSpecificUserResources(village.user_id);
      if (response.success) {
        setSelectedVillageResources(response.data);
        logGameInfo('Recursos cargados', `Recursos de ${village.village_name || 'Aldea'} obtenidos`);
      }
    } catch (error) {
      console.error('Error cargando recursos de la aldea:', error);
      setSelectedVillageResources({
        wood: '???',
        stone: '???', 
        food: '???',
        iron: '???'
      });
    }
  };

  const handleDonateResources = (village) => {
    setSelectedVillage(village);
    setShowDonationModal(true);
    setDonationAmount({ wood: 0, stone: 0, iron: 0, food: 0 });
    logGameInfo('Abrir donación', `Iniciando donación a ${village.village_name || 'Aldea'}`);
  };

  const handleAttackVillage = (village) => {
    console.log('⚔️ GlobalMapClean: Preparando ataque');
    console.log('⚔️ Village completo (stringify):', JSON.stringify(village, null, 2));
    console.log('⚔️ Village object keys:', Object.keys(village || {}));
    console.log('⚔️ Village.user_id:', village.user_id);
    console.log('⚔️ Tipo de user_id:', typeof village.user_id);
    console.log('⚔️ Village.village_name:', village.village_name);
    console.log('⚔️ ¿user_id existe en village?:', 'user_id' in village);
    console.log('⚔️ ¿user_id es undefined?:', village.user_id === undefined);
    console.log('⚔️ ¿user_id es null?:', village.user_id === null);
    
    setTargetVillage(village);
    setShowAttackModal(true);
    logGameInfo('Abrir ataque', `Preparando ataque a ${village.village_name || 'Aldea'}`);
  };

  const handleAttackComplete = (battleResult) => {
    logGameInfo('Ataque completado', battleResult);
    setMessage(`⚔️ Batalla ${battleResult.result === 'victory' ? 'ganada' : 'perdida'} contra ${targetVillage?.village_name || 'la aldea'}`);
    
    // Recargar aldeas para actualizar el estado
    setTimeout(() => {
      loadVillages();
    }, 2000);
    
    // Limpiar mensaje después de 5 segundos
    setTimeout(() => setMessage(''), 5000);
  };

  const processDonation = async () => {
    if (!selectedVillage) return;

    // Validar que hay algo que donar
    const totalDonation = donationAmount.wood + donationAmount.stone + donationAmount.iron + donationAmount.food;
    if (totalDonation === 0) {
      setMessage('❌ Debes donar al menos un recurso');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setLoading(true);
      logGameInfo('Procesando donación', {
        receptor: selectedVillage.user_id,
        donaciones: donationAmount
      });

      // El backend validará recursos y procesará todo automáticamente
      const response = await mapAPI.donateResources(
        selectedVillage.user_id,
        donationAmount
      );

      if (response.success) {
        logGameInfo('Donación exitosa', `Donación completada a ${selectedVillage.village_name}`);
        
        // Actualizar recursos localmente con los nuevos recursos del backend
        if (response.data?.donorNewResources && onResourceChange) {
          onResourceChange(response.data.donorNewResources);
          logGameInfo('Recursos actualizados', 
            `Madera: ${response.data.donorNewResources.wood}, Piedra: ${response.data.donorNewResources.stone}`);
        }
        
        setMessage(`✅ Donación exitosa a ${selectedVillage.village_name || 'la aldea'}`);
        setShowDonationModal(false);
        setDonationAmount({ wood: 0, stone: 0, iron: 0, food: 0 });
        
      } else {
        console.error('❌ Error en respuesta del backend:', response.message);
        setMessage(`❌ ${response.message || 'Error al donar'}`);
      }
      
    } catch (error) {
      if (error.message.includes('insuficientes')) {
        console.info('ℹ️ Recursos insuficientes:', error.message);
        setMessage(`❌ ${error.message}`);
      } else {
        console.error('❌ Error técnico en donación:', error);
        setMessage(`❌ Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const getResourceDisplay = (value) => {
    return value?.toLocaleString() || '0';
  };

  const getMaxDonation = (resourceType) => {
    return userResources?.[resourceType] || 0;
  };

  if (loading) {
    return (
      <div className="p-6 text-center card-glass rounded-xl m-4">
        <div className="text-6xl mb-4">🌍</div>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
        <div className="text-yellow-400 font-semibold text-lg">Cargando mapa global...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center card-glass rounded-xl m-4">
        <div className="text-6xl mb-4">❌</div>
        <div className="text-red-300 mb-6 text-lg">{error}</div>
        <button 
          onClick={loadVillages}
          className="btn-primary px-6 py-3 rounded-lg font-bold"
        >
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2 text-center" style={{fontFamily: 'Cinzel, serif'}}>
          🌍 Mapa Global
        </h2>
        <p className="text-gray-400 text-center text-sm">
          Explora aldeas de otros jugadores y colabora donando recursos
        </p>
        <p className="text-yellow-300 text-center mt-1 font-semibold">
          Total de aldeas: {villages.length}
        </p>
      </div>

      {/* Mensaje de estado */}
      {message && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-center font-semibold ${
          message.includes('❌') ? 'bg-red-100 text-red-700' 
            : message.includes('✅') ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {message}
        </div>
      )}

      {/* Lista de aldeas */}
      <div className="p-4">
        {villages.length === 0 ? (
          <div className="text-center py-12 card-glass rounded-xl">
            <div className="text-6xl mb-4">🏘️</div>
            <h3 className="text-xl font-bold text-gray-200 mb-2">No hay aldeas</h3>
            <p className="text-gray-400">¡Sé el primero en fundar una aldea!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {villages.map((village) => (
              <div
                key={village.id}
                className={`card-glass p-5 rounded-xl transition-all duration-200 ${
                  village.user_id === user.id
                    ? 'border-2 border-blue-500 bg-blue-500 bg-opacity-10'
                    : 'border-2 border-green-500 border-opacity-30 hover:border-yellow-400 cursor-pointer hover:scale-105'
                }`}
                onClick={() => village.user_id !== user.id && handleViewVillage(village)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <span className="text-2xl">{village.village_icon || '🏘️'}</span>
                    {village.village_name || 'Aldea sin nombre'}
                  </h3>
                  {village.user_id === user.id && (
                    <span className="bg-blue-400 text-white text-xs font-semibold px-2 py-1 rounded">
                      TU ALDEA
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-300 mb-3">
                  <div>👤 Jugador: {village.user_display_name || 'Desconocido'}</div>
                  {village.description && (
                    <div className="mt-2 italic text-gray-400">"{village.description}"</div>
                  )}
                </div>

                {village.user_id !== user.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewVillage(village);
                      }}
                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                    >
                      👁️ Ver detalles
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDonateResources(village);
                      }}
                      className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                    >
                      💝 Donar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAttackVillage(village);
                      }}
                      className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                    >
                      ⚔️ Atacar
                    </button>
                  </div>
                )}

                {village.user_id === user.id && (
                  <div className="mt-3 pt-3 border-t border-blue-400">
                    <div className="bg-blue-500 p-2 rounded text-center text-sm text-white font-semibold">
                      ✨ Esta es tu aldea
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para ver detalles de aldea */}
      {selectedVillage && !showDonationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-glass rounded-xl p-6 max-w-lg w-full mx-4 border-2 border-yellow-400">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2" style={{fontFamily: 'Cinzel, serif'}}>
                <span className="text-3xl">{selectedVillage.village_icon || '🏘️'}</span>
                {selectedVillage.village_name || 'Aldea'}
              </h2>
              <button
                onClick={() => {
                  setSelectedVillage(null);
                  setSelectedVillageResources(null);
                }}
                className="text-gray-300 hover:text-white text-3xl transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {/* Mostrar recursos de la aldea */}
              <div className="bg-green-500 bg-opacity-20 border-2 border-green-500 rounded-lg p-4">
                <h3 className="font-bold text-green-800 mb-3">� Recursos de la Aldea</h3>
                {selectedVillageResources ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <span>🪵</span>
                      <span>Madera: <strong>{selectedVillageResources.wood || 0}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>🪨</span>
                      <span>Piedra: <strong>{selectedVillageResources.stone || 0}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>🍞</span>
                      <span>Comida: <strong>{selectedVillageResources.food || 0}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>⚙️</span>
                      <span>Hierro: <strong>{selectedVillageResources.iron || 0}</strong></span>
                    </div>
                    {/* Población solo visible para tu propia aldea */}
                    {selectedVillage.user_id === user.id && selectedVillageResources.population !== undefined && (
                      <div className="flex items-center space-x-2 col-span-2 text-gray-200">
                        <span className="text-lg">👥</span>
                        <span>Población: <strong className="text-white">{selectedVillageResources.population || 0}/{selectedVillageResources.max_population || 10}</strong></span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-300">
                    <span className="animate-pulse">🔄 Cargando recursos...</span>
                  </div>
                )}
              </div>

              <div className="text-gray-300">
                <strong>📅 Creada:</strong> {new Date(selectedVillage.created_at).toLocaleDateString()}
              </div>
            </div>

            {selectedVillage.user_id !== user.id && (
              <div className="mt-6 bg-blue-500 bg-opacity-20 border-2 border-blue-500 p-4 rounded-lg">
                <h3 className="font-bold text-blue-300 mb-2">💡 ¿Quieres ayudar?</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Puedes donar recursos a esta aldea para ayudar a otros jugadores.
                </p>
                <button
                  onClick={() => {
                    setShowDonationModal(true);
                    setDonationAmount({ wood: 0, stone: 0, iron: 0, food: 0 });
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all hover:scale-105 font-semibold"
                >
                  🎁 Donar recursos
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedVillage(null)}
                className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para donación de recursos */}
      {showDonationModal && selectedVillage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-glass rounded-xl p-6 max-w-lg w-full mx-4 border-2 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-green-300 flex items-center gap-2" style={{fontFamily: 'Cinzel, serif'}}>
                🎁 Donar a <span className="text-3xl">{selectedVillage.village_icon || '🏘️'}</span> {selectedVillage.village_name || 'Aldea'}
              </h2>
              <button
                onClick={() => setShowDonationModal(false)}
                className="text-gray-300 hover:text-white text-3xl transition-colors"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-gray-200 mb-3">¿Cuánto quieres donar?</h3>
              
              <div className="space-y-4">
                {/* Madera */}
                <div className="flex items-center justify-between bg-gray-800 bg-opacity-50 p-3 rounded-lg border-2 border-gray-700">
                  <span className="text-gray-200">🪵 Madera (max: {getMaxDonation('wood')}):</span>
                  <input
                    type="number"
                    min="0"
                    max={getMaxDonation('wood')}
                    value={donationAmount.wood || ''}
                    placeholder="0"
                    onChange={(e) => setDonationAmount({
                      ...donationAmount, 
                      wood: Math.min(Number(e.target.value) || 0, getMaxDonation('wood'))
                    })}
                    className="w-24 p-2 border-2 border-gray-600 rounded-lg text-center bg-gray-800 text-white font-semibold"
                  />
                </div>

                {/* Piedra */}
                <div className="flex items-center justify-between bg-gray-800 bg-opacity-50 p-3 rounded-lg border-2 border-gray-700">
                  <span className="text-gray-200">🪨 Piedra (max: {getMaxDonation('stone')}):</span>
                  <input
                    type="number"
                    min="0"
                    max={getMaxDonation('stone')}
                    value={donationAmount.stone || ''}
                    placeholder="0"
                    onChange={(e) => setDonationAmount({
                      ...donationAmount, 
                      stone: Math.min(Number(e.target.value) || 0, getMaxDonation('stone'))
                    })}
                    className="w-24 p-2 border-2 border-gray-600 rounded-lg text-center bg-gray-800 text-white font-semibold"
                  />
                </div>

                {/* Hierro */}
                <div className="flex items-center justify-between bg-gray-800 bg-opacity-50 p-3 rounded-lg border-2 border-gray-700">
                  <span className="text-gray-200">⚙️ Hierro (max: {getMaxDonation('iron')}):</span>
                  <input
                    type="number"
                    min="0"
                    max={getMaxDonation('iron')}
                    value={donationAmount.iron || ''}
                    placeholder="0"
                    onChange={(e) => setDonationAmount({
                      ...donationAmount, 
                      iron: Math.min(Number(e.target.value) || 0, getMaxDonation('iron'))
                    })}
                    className="w-24 p-2 border-2 border-gray-600 rounded-lg text-center bg-gray-800 text-white font-semibold"
                  />
                </div>

                {/* Comida */}
                <div className="flex items-center justify-between bg-gray-800 bg-opacity-50 p-3 rounded-lg border-2 border-gray-700">
                  <span className="text-gray-200">🍞 Comida (max: {getMaxDonation('food')}):</span>
                  <input
                    type="number"
                    min="0"
                    max={getMaxDonation('food')}
                    value={donationAmount.food || ''}
                    placeholder="0"
                    onChange={(e) => setDonationAmount({
                      ...donationAmount, 
                      food: Math.min(Number(e.target.value) || 0, getMaxDonation('food'))
                    })}
                    className="w-24 p-2 border-2 border-gray-600 rounded-lg text-center bg-gray-800 text-white font-semibold"
                  />
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-300 bg-blue-500 bg-opacity-20 border-2 border-blue-500 p-3 rounded-lg">
                <strong>💡 Nota:</strong> El backend validará automáticamente que tengas suficientes recursos y procesará la donación de manera segura.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDonationModal(false)}
                className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={processDonation}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all hover:scale-105 disabled:opacity-50 font-semibold"
              >
                {loading ? '⏳ Donando...' : '🎁 Confirmar donación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ataque */}
      <AttackModal
        isOpen={showAttackModal}
        onClose={() => {
          setShowAttackModal(false);
          setTargetVillage(null);
        }}
        targetVillage={targetVillage}
        currentUser={user}
        onAttackComplete={handleAttackComplete}
      />
    </div>
  );
}

export default GlobalMapClean;
