import React, { useState, useEffect } from 'react';
import { getTroopIcon } from '../utils/troopIcons';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const BattleHistory = () => {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'attacks', 'defenses'
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBattleHistory();
  }, [filter]);

  const loadBattleHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth-token');
      const response = await fetch(`${API_BASE_URL}/api/map/battles?type=${filter}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBattles(data.data);
      } else {
        setError('Error cargando historial de batallas');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTroopLosses = (losses) => {
    if (!losses || Object.keys(losses).length === 0) return 'Ninguna';
    
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(losses)
          .filter(([_, quantity]) => quantity > 0)
          .map(([troopType, quantity]) => (
            <span key={troopType} className="inline-flex items-center gap-1 bg-red-900 bg-opacity-30 px-2 py-1 rounded border border-red-700">
              <span className="text-lg">{getTroopIcon(troopType)}</span>
              <span className="font-semibold">{quantity}</span>
            </span>
          ))}
      </div>
    );
  };

  const getBattleIcon = (battle) => {
    if (battle.user_won) {
      return battle.user_role === 'attacker' ? '⚔️' : '🛡️';
    } else {
      return battle.user_role === 'attacker' ? '💀' : '😵';
    }
  };

  const getBattleTitle = (battle) => {
    if (battle.user_role === 'attacker') {
      return battle.user_won ? 
        `Victoria atacando a ${battle.defender_username}` : 
        `Derrota atacando a ${battle.defender_username}`;
    } else {
      return battle.user_won ? 
        `Defensa exitosa contra ${battle.attacker_username}` : 
        `Aldea saqueada por ${battle.attacker_username}`;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center card-glass rounded-xl m-4">
        <div className="text-6xl mb-4">⚔️</div>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
        <span className="text-yellow-400 font-semibold text-lg">Cargando historial...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glass rounded-xl p-6 text-center m-4">
        <div className="text-6xl mb-4">❌</div>
        <p className="text-red-300 mb-6 text-lg">{error}</p>
        <button 
          onClick={loadBattleHistory}
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
          ⚔️ Historial de Batallas
        </h2>
        <p className="text-gray-400 text-center text-sm">Revisa tus victorias, derrotas y el botín obtenido</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
            filter === 'all' 
              ? 'btn-primary' 
              : 'btn-secondary'
          }`}
        >
          📊 Todas
        </button>
        <button
          onClick={() => setFilter('attacks')}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
            filter === 'attacks' 
              ? 'btn-primary' 
              : 'btn-secondary'
          }`}
        >
          ⚔️ Ataques
        </button>
        <button
          onClick={() => setFilter('defenses')}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
            filter === 'defenses' 
              ? 'btn-primary' 
              : 'btn-secondary'
          }`}
        >
          🛡️ Defensas
        </button>
      </div>

      {/* Lista de batallas */}
      {battles.length === 0 ? (
        <div className="text-center py-12 card-glass rounded-xl">
          <div className="text-6xl mb-4">⚔️</div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">
            No hay batallas registradas
          </h3>
          <p className="text-gray-400">
            {filter === 'attacks' && 'Aún no has atacado a ninguna aldea'}
            {filter === 'defenses' && 'Tu aldea aún no ha sido atacada'}
            {filter === 'all' && 'No tienes batallas en tu historial'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {battles.map((battle) => (
            <div 
              key={battle.id} 
              className={`card-glass rounded-xl p-6 border-2 transition-all hover:scale-[1.02] ${
                battle.user_won 
                  ? 'border-green-500 border-opacity-50' 
                  : 'border-red-500 border-opacity-50'
              }`}
            >
              {/* Header de la batalla */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{getBattleIcon(battle)}</span>
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      {getBattleTitle(battle)}
                    </h3>
                    <p className="text-sm text-gray-300">
                      {formatDate(battle.battle_date)}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  battle.user_won 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}>
                  {battle.user_won ? 'Victoria' : 'Derrota'}
                </div>
              </div>

              {/* Información de poder */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border-2 border-gray-700">
                  <h4 className="font-semibold text-sm text-gray-300 mb-1">
                    ⚔️ Poder de Ataque
                  </h4>
                  <p className="text-xl font-bold text-red-400">
                    {battle.attacker_power}
                  </p>
                  <p className="text-xs text-gray-400">
                    {battle.attacker_username}
                  </p>
                </div>
                <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border-2 border-gray-700">
                  <h4 className="font-semibold text-sm text-gray-300 mb-1">
                    🛡️ Poder de Defensa
                  </h4>
                  <p className="text-xl font-bold text-blue-400">
                    {battle.defender_power}
                  </p>
                  <p className="text-xs text-gray-400">
                    {battle.defender_username}
                  </p>
                </div>
                <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border-2 border-gray-700">
                  <h4 className="font-semibold text-sm text-gray-300 mb-1">
                    💰 Recursos Transferidos
                  </h4>
                  <p className="text-xl font-bold text-yellow-400">
                    {battle.total_stolen_resources}
                  </p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>

              {/* Detalles de recursos */}
              {battle.total_stolen_resources > 0 && (
                <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border-2 border-gray-700 mb-4">
                  <h4 className="font-semibold text-sm text-gray-300 mb-2">
                    💎 Recursos Detallados
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-2xl">🪵</div>
                      <div className="font-medium text-white">{battle.stolen_wood}</div>
                      <div className="text-xs text-gray-400">Madera</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl">🪨</div>
                      <div className="font-medium text-white">{battle.stolen_stone}</div>
                      <div className="text-xs text-gray-400">Piedra</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl">🍞</div>
                      <div className="font-medium text-white">{battle.stolen_food}</div>
                      <div className="text-xs text-gray-400">Comida</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl">⚙️</div>
                      <div className="font-medium text-white">{battle.stolen_iron}</div>
                      <div className="text-xs text-gray-400">Hierro</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tropas perdidas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border-2 border-gray-700">
                  <h4 className="font-semibold text-sm text-gray-300 mb-3">
                    💀 Tropas Perdidas (Atacante)
                  </h4>
                  <div className="text-sm text-gray-200">
                    {formatTroopLosses(battle.attacker_troop_losses)}
                  </div>
                </div>
                <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border-2 border-gray-700">
                  <h4 className="font-semibold text-sm text-gray-300 mb-3">
                    💀 Tropas Perdidas (Defensor)
                  </h4>
                  <div className="text-sm text-gray-200">
                    {formatTroopLosses(battle.defender_troop_losses)}
                  </div>
                </div>
              </div>

              {/* Notas */}
              {battle.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded border-l-4 border-gray-400">
                  <p className="text-sm text-gray-700">{battle.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botón de cargar más (para futuras implementaciones) */}
      {battles.length >= 50 && (
        <div className="text-center">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Cargar más batallas
          </button>
        </div>
      )}
    </div>
  );
};

export default BattleHistory;
