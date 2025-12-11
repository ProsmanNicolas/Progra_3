import React, { useState, useEffect } from 'react';
import resourceAPI from '../services/resourceAPI';
import villageAPI from '../services/villageAPI';
import { resourceEventSystem } from '../utils/resourceEventSystem';

export default function ResourceDisplay({ userId, onResourceUpdate, compact = false }) {
  const [resources, setResources] = useState({
    wood: 0,
    stone: 0,
    food: 0,
    iron: 0,
    population: 0,
    max_population: 0
  });
  const [loading, setLoading] = useState(true);
  const [hasRecentUpdate, setHasRecentUpdate] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Función helper para normalizar recursos
  const normalizeResources = (resourceData) => {
    return {
      wood: Number(resourceData?.wood || 0),
      stone: Number(resourceData?.stone || 0),
      food: Number(resourceData?.food || 0),
      iron: Number(resourceData?.iron || 0),
      population: Number(resourceData?.population || 0),
      max_population: Number(resourceData?.max_population || 0)
    };
  };

  useEffect(() => {
    if (userId) {
      loadUserResources();
      // Actualizar recursos cada 30 segundos para mantenerlos frescos
      const interval = setInterval(loadUserResources, 30000);
      
      // Actualizar población cada 10 segundos (más frecuente que recursos)
      const populationInterval = setInterval(async () => {
        try {
          const populationResponse = await villageAPI.getUserPopulation();
          if (populationResponse.success && populationResponse.data) {
            setResources(prev => ({
              ...prev,
              population: populationResponse.data.current || 0,
              max_population: populationResponse.data.limit || 10
            }));
          }
        } catch (error) {
          console.warn('Error actualizando población:', error);
        }
      }, 10000);
      
      // Escuchar eventos de cambios de recursos
      const unsubscribe = resourceEventSystem.addListener((eventUserId, newResources) => {
        if (eventUserId === userId) {
          console.log('📢 Recibido evento de cambio de recursos para usuario:', userId);
          setHasRecentUpdate(true);
          
          // Resetear el estado de actualización reciente después de 5 segundos
          setTimeout(() => setHasRecentUpdate(false), 5000);
          
          if (newResources) {
            // Si se proporcionan recursos específicos, usarlos
            const normalizedResources = normalizeResources(newResources);
            setResources(normalizedResources);
            if (onResourceUpdate) {
              onResourceUpdate(normalizedResources);
            }
            resourceEventSystem.markUpdateCompleted(userId);
          } else {
            // Si es null, recargar desde la base de datos
            loadUserResources();
          }
        }
      });
      
      return () => {
        clearInterval(interval);
        clearInterval(populationInterval);
        unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [userId]); // Remover hasRecentUpdate de las dependencias para evitar re-renders innecesarios

  const loadUserResources = async () => {
    try {
      // Obtener los recursos usando resourceAPI
      const response = await resourceAPI.getUserResources();
      
      if (response.success && response.data) {
        const normalizedResources = normalizeResources(response.data);
        
        // Cargar población del endpoint de village
        try {
          const populationResponse = await villageAPI.getUserPopulation();
          if (populationResponse.success && populationResponse.data) {
            normalizedResources.population = populationResponse.data.current || 0;
            normalizedResources.max_population = populationResponse.data.limit || 10;
          }
        } catch (popError) {
          console.warn('Error cargando población:', popError);
        }
        
        setResources(normalizedResources);
        if (onResourceUpdate) {
          onResourceUpdate(normalizedResources);
        }
        
        // Marcar actualización como completada
        resourceEventSystem.markUpdateCompleted(userId);
      } else {
        // Si no existen recursos, inicializarlos
        await resourceAPI.initializeUserResources();
        // Volver a cargar después de inicializar
        const retryResponse = await resourceAPI.getUserResources();
        if (retryResponse.success && retryResponse.data) {
          const normalizedResources = normalizeResources(retryResponse.data);
          
          // Cargar población
          try {
            const populationResponse = await villageAPI.getUserPopulation();
            if (populationResponse.success && populationResponse.data) {
              normalizedResources.population = populationResponse.data.current || 0;
              normalizedResources.max_population = populationResponse.data.limit || 10;
            }
          } catch (popError) {
            console.warn('Error cargando población:', popError);
          }
          
          setResources(normalizedResources);
          if (onResourceUpdate) {
            onResourceUpdate(normalizedResources);
          }
        }
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      
      // Usar recursos por defecto como fallback
      const defaultResources = normalizeResources({
        wood: 1000,
        stone: 800,
        food: 600,
        iron: 400,
        population: 0,
        max_population: 10
      });
      setResources(defaultResources);
      if (onResourceUpdate) {
        onResourceUpdate(defaultResources);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card-glass p-4 rounded-xl">
        <div className="flex items-center justify-center gap-2">
          <span className="animate-spin text-2xl">⚙️</span>
          <p className="text-yellow-400 font-semibold">Cargando recursos...</p>
        </div>
      </div>
    );
  }

  const resourceIcons = {
    wood: '🪵',
    stone: '🪨',
    food: '🍞',
    iron: '⚙️',
    population: '👥'
  };

  const resourceColors = {
    wood: 'from-green-600 to-green-800',
    stone: 'from-gray-500 to-gray-700',
    food: 'from-yellow-600 to-yellow-800',
    iron: 'from-blue-500 to-blue-700',
    population: 'from-purple-500 to-purple-700'
  };

  const formatNumber = (num) => {
    if (num == null || num === undefined || isNaN(num)) {
      return '0';
    }
    return Number(num).toLocaleString();
  };

  // Versión compacta para esquina
  if (compact) {
    return (
      <div className="fixed top-20 right-4 z-50">
        <div 
          className={`card-glass rounded-xl transition-all duration-300 ${
            isExpanded ? 'p-4 w-80' : 'p-2 w-auto cursor-pointer hover:scale-105'
          }`}
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          {!isExpanded ? (
            // Vista colapsada - solo iconos con números
            <div className="flex gap-2 items-center">
              <span className="text-yellow-400 font-bold text-sm">💰</span>
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1">
                  🪵 <span className="font-semibold text-white">{formatNumber(resources.wood)}</span>
                </span>
                <span className="flex items-center gap-1">
                  🪨 <span className="font-semibold text-white">{formatNumber(resources.stone)}</span>
                </span>
                <span className="flex items-center gap-1">
                  🍞 <span className="font-semibold text-white">{formatNumber(resources.food)}</span>
                </span>
                <span className="flex items-center gap-1">
                  ⚙️ <span className="font-semibold text-white">{formatNumber(resources.iron)}</span>
                </span>
              </div>
            </div>
          ) : (
            // Vista expandida
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-yellow-400 font-bold text-sm flex items-center gap-2">
                  💰 Recursos
                  {hasRecentUpdate && (
                    <span className="badge badge-success text-xs animate-pulse">✓</span>
                  )}
                </h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="text-gray-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Recursos en vista expandida compacta */}
                <div className="flex items-center gap-2 bg-green-900 bg-opacity-30 rounded p-2">
                  <span className="text-xl">🪵</span>
                  <div>
                    <div className="text-xs text-gray-400">Madera</div>
                    <div className="font-bold text-white text-sm">{formatNumber(resources.wood)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-700 bg-opacity-30 rounded p-2">
                  <span className="text-xl">🪨</span>
                  <div>
                    <div className="text-xs text-gray-400">Piedra</div>
                    <div className="font-bold text-white text-sm">{formatNumber(resources.stone)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-yellow-800 bg-opacity-30 rounded p-2">
                  <span className="text-xl">🍞</span>
                  <div>
                    <div className="text-xs text-gray-400">Comida</div>
                    <div className="font-bold text-white text-sm">{formatNumber(resources.food)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-blue-800 bg-opacity-30 rounded p-2">
                  <span className="text-xl">⚙️</span>
                  <div>
                    <div className="text-xs text-gray-400">Hierro</div>
                    <div className="font-bold text-white text-sm">{formatNumber(resources.iron)}</div>
                  </div>
                </div>
              </div>

              {/* Población */}
              <div className="mt-2 p-2 bg-purple-900 bg-opacity-30 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-purple-200 flex items-center gap-1">
                    👥 Población
                  </span>
                  <span className="font-bold text-white text-sm">
                    {formatNumber(resources.population)}/{formatNumber(resources.max_population)}
                  </span>
                </div>
                <div className="bg-purple-950 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-purple-600 h-full transition-all duration-500"
                    style={{width: `${Math.min((resources.population / resources.max_population) * 100, 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista completa original
  return (
    <div className="card-glass p-4 rounded-xl">
      <h3 className="text-yellow-400 font-bold text-lg mb-3 flex items-center gap-2">
        <span>💰</span> Recursos del Reino
        {hasRecentUpdate && (
          <span className="badge badge-success text-xs animate-pulse ml-2">Actualizado</span>
        )}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Madera */}
        <div className="resource-item">
          <div className={`text-2xl p-2 bg-gradient-to-br ${resourceColors.wood} rounded-lg`}>
            {resourceIcons.wood}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase">Madera</span>
            <span className="font-bold text-white text-lg">{formatNumber(resources.wood)}</span>
          </div>
        </div>
        
        {/* Piedra */}
        <div className="resource-item">
          <div className={`text-2xl p-2 bg-gradient-to-br ${resourceColors.stone} rounded-lg`}>
            {resourceIcons.stone}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase">Piedra</span>
            <span className="font-bold text-white text-lg">{formatNumber(resources.stone)}</span>
          </div>
        </div>
        
        {/* Comida */}
        <div className="resource-item">
          <div className={`text-2xl p-2 bg-gradient-to-br ${resourceColors.food} rounded-lg`}>
            {resourceIcons.food}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase">Comida</span>
            <span className="font-bold text-white text-lg">{formatNumber(resources.food)}</span>
          </div>
        </div>
        
        {/* Hierro */}
        <div className="resource-item">
          <div className={`text-2xl p-2 bg-gradient-to-br ${resourceColors.iron} rounded-lg`}>
            {resourceIcons.iron}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase">Hierro</span>
            <span className="font-bold text-white text-lg">{formatNumber(resources.iron)}</span>
          </div>
        </div>
      </div>

      {/* Población */}
      <div className="mt-4 p-3 bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg border-2 border-purple-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{resourceIcons.population}</span>
            <span className="text-sm text-purple-200 uppercase font-semibold">Población</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-white text-xl">
              {formatNumber(resources.population)} / {formatNumber(resources.max_population)}
            </span>
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="mt-2 bg-purple-950 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-purple-400 to-purple-600 h-full transition-all duration-500"
            style={{width: `${Math.min((resources.population / resources.max_population) * 100, 100)}%`}}
          ></div>
        </div>
      </div>

      {/* Indicador de recursos insuficientes */}
      {(resources.food < 100 || resources.wood < 100) && (
        <div className="mt-3 p-3 bg-yellow-500 bg-opacity-20 border-2 border-yellow-500 rounded-lg">
          <p className="text-yellow-300 text-sm font-semibold flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            Recursos bajos - construye más generadores
          </p>
        </div>
      )}
    </div>
  );
}
