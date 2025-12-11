import React, { useState, useEffect } from 'react';
import donationAPI from '../services/donationAPI';

function DonationHistory({ user }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sent'); // 'sent' o 'received'

  console.log('🎁 DonationHistory component loaded - version 3.0 - Backend API');

  useEffect(() => {
    if (user) {
      loadDonations();
    }
  }, [user, activeTab]);

  const loadDonations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Cargando historial de donaciones...', activeTab);
      
      let result;
      if (activeTab === 'sent') {
        result = await donationAPI.getSentDonations();
      } else {
        result = await donationAPI.getReceivedDonations();
      }

      console.log('✅ Donaciones cargadas desde backend:', result);
      
      // Verificar que result tenga la estructura esperada
      if (!result || !result.success) {
        throw new Error(result?.message || 'Error al obtener donaciones');
      }
      
      // Procesar donaciones para agregar información adicional
      const donationsWithInfo = await Promise.all(
        (result.data || []).map(async (donation) => {
          try {
            // ID del usuario objetivo (donador si es 'received', receptor si es 'sent')
            const targetUserId = activeTab === 'sent' ? donation.recipient_id : donation.donor_id;
            
            // Para simplificar, usar un nombre genérico
            const displayName = `Jugador ${targetUserId.substring(0, 8)}`;
            const villageName = `Aldea de ${displayName}`;

            return {
              ...donation,
              targetUserId,
              villageName,
              userName: displayName,
              userIdShort: targetUserId.substring(0, 8) + '...'
            };
          } catch (error) {
            console.error('Error procesando donación:', error);
            const targetUserId = activeTab === 'sent' ? donation.recipient_id : donation.donor_id;
            return {
              ...donation,
              targetUserId,
              villageName: 'Aldea desconocida',
              userName: 'Usuario desconocido',
              userIdShort: targetUserId ? targetUserId.substring(0, 8) + '...' : 'N/A'
            };
          }
        })
      );

      setDonations(donationsWithInfo);
      
    } catch (error) {
      console.error('Error en loadDonations:', error);
      setError(error.message || 'Error de conexión');
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el emoji del recurso
  const getResourceEmoji = (resourceType) => {
    const emojiMap = {
      'wood': '🪵',
      'madera': '🪵',
      'stone': '🪨',
      'piedra': '🪨',
      'iron': '⚙️',
      'hierro': '⚙️',
      'food': '🍞',
      'comida': '🍞'
    };
    return emojiMap[resourceType] || '📦';
  };

  // Función para obtener el nombre legible del recurso
  const getResourceName = (resourceType) => {
    const nameMap = {
      'wood': 'Madera',
      'madera': 'Madera',
      'stone': 'Piedra',
      'piedra': 'Piedra',
      'iron': 'Hierro',
      'hierro': 'Hierro',
      'food': 'Comida',
      'comida': 'Comida'
    };
    return nameMap[resourceType] || resourceType;
  };

  // Calcular estadísticas
  const getTotalsByResource = () => {
    const totals = {};
    donations.forEach(donation => {
      const resourceName = getResourceName(donation.resource_type);
      totals[resourceName] = (totals[resourceName] || 0) + donation.amount;
    });
    return totals;
  };

  if (loading) {
    return (
      <div className="p-8 text-center card-glass rounded-xl m-4">
        <div className="text-6xl mb-4">🎁</div>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-yellow-400 font-semibold text-lg">Cargando historial de donaciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 card-glass rounded-xl m-4">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">Error al cargar donaciones</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <button 
            onClick={loadDonations}
            className="btn-primary px-6 py-3 rounded-lg font-bold"
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  const totals = getTotalsByResource();

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2 text-center" style={{fontFamily: 'Cinzel, serif'}}>
          🎁 Historial de Donaciones
        </h2>
        <p className="text-gray-400 text-center text-sm">Tu registro completo de donaciones enviadas y recibidas</p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'sent'
              ? 'btn-primary'
              : 'btn-secondary'
          }`}
        >
          📤 Donaciones Enviadas
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'received'
              ? 'btn-primary'
              : 'btn-secondary'
          }`}
        >
          📥 Donaciones Recibidas
        </button>
      </div>

      {/* Estadísticas */}
      {Object.keys(totals).length > 0 && (
        <div className="card-glass rounded-xl p-5 mb-6">
          <h3 className="font-bold text-yellow-300 mb-4 text-lg">
            📊 Total de recursos {activeTab === 'sent' ? 'enviados' : 'recibidos'}:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(totals).map(([resource, amount]) => (
              <div key={resource} className="text-center bg-gray-800 bg-opacity-50 rounded-lg p-4 border-2 border-gray-700">
                <div className="text-3xl mb-2">{getResourceEmoji(resource)}</div>
                <div className="font-bold text-xl text-yellow-400">{amount}</div>
                <div className="text-sm text-gray-400">{resource}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de donaciones */}
      {donations.length === 0 ? (
        <div className="text-center py-12 card-glass rounded-xl">
          <div className="text-6xl mb-4">
            {activeTab === 'sent' ? '📤' : '📥'}
          </div>
          <h3 className="text-xl font-bold text-gray-200 mb-2">
            No hay donaciones {activeTab === 'sent' ? 'enviadas' : 'recibidas'}
          </h3>
          <p className="text-gray-400">
            {activeTab === 'sent' 
              ? '¡Visita el mapa global y ayuda a otros jugadores donando recursos!'
              : '¡Otros jugadores pueden ayudarte donando recursos a tu aldea!'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {donations.map((donation) => (
            <div 
              key={donation.id}
              className={`card-glass rounded-lg shadow-lg p-5 transition-all hover:shadow-xl hover:scale-[1.02] border-2 ${
                activeTab === 'sent' 
                  ? 'border-blue-500 border-opacity-30' 
                  : 'border-green-500 border-opacity-30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">
                    {getResourceEmoji(donation.resource_type)}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-white">
                      {donation.amount} {getResourceName(donation.resource_type)}
                    </div>
                    <div className="text-sm text-gray-300">
                      {activeTab === 'sent' ? '📤 Enviado a:' : '📥 Recibido de:'} {donation.villageName}
                    </div>
                    <div className="text-xs text-gray-400">
                      Jugador: {donation.userName}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300 font-semibold">
                    {new Date(donation.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 text-center">
        <button 
          onClick={loadDonations}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          🔄 Actualizar historial
        </button>
      </div>
    </div>
  );
}

export default DonationHistory;
