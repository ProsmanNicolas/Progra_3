import React, { useState, useEffect } from 'react';
import villageAPI from '../services/villageAPI';
import TownHallUpgradeModal from './TownHallUpgradeModal';

const GRID_SIZE = 15;

export default function GameMap({ userId, userResources, userBuildings, onResourceChange, onBuildingsChange }) {
  const [grid, setGrid] = useState(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null)));
  const [buildingTypes, setBuildingTypes] = useState([]);
  const [selectedBuildingType, setSelectedBuildingType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [townHallModalOpen, setTownHallModalOpen] = useState(false);
  const [selectedTownHall, setSelectedTownHall] = useState(null);
  const [currentResources, setCurrentResources] = useState(null);

  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    setCurrentResources(userResources);
  }, [userResources]);

  useEffect(() => {
    updateGridWithBuildings();
  }, [userBuildings]);

  const initializeComponent = async () => {
    await loadBuildingTypes();
  };

  const updateGridWithBuildings = () => {
    if (!userBuildings) return;
    
    const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    
    userBuildings.forEach(building => {
      if (building.position_x < GRID_SIZE && building.position_y < GRID_SIZE) {
        newGrid[building.position_y][building.position_x] = {
          ...building,
          building_type: building.building_types
        };
      }
    });
    
    setGrid(newGrid);
  };

  const loadBuildingTypes = async () => {
    try {
      console.log('🔄 Cargando tipos de edificios desde backend...');
      
      const response = await villageAPI.getBuildingTypes();
      
      if (response.success && response.data && response.data.length > 0) {
        console.log('✅ Tipos de edificios cargados:', response.data.length);
        setBuildingTypes(response.data);
        
        // Seleccionar por defecto el primer edificio no especial
        const defaultBuilding = response.data.find(b => b.type !== 'special');
        if (defaultBuilding) {
          setSelectedBuildingType(defaultBuilding);
        }
      } else {
        console.error('❌ No se pudieron cargar tipos de edificios');
        setMessage('Error: No se pudieron cargar los tipos de edificios');
      }
      
    } catch (error) {
      console.error('❌ Error cargando tipos de edificios:', error);
      setMessage('Error de conexión al cargar tipos de edificios');
    }
  };

  const createBuilding = async (buildingType, x, y) => {
    if (loading) {
      setMessage('⏳ Espera a que termine la construcción anterior');
      setTimeout(() => setMessage(''), 3000);
      return false;
    }

    setLoading(true);
    
    try {
      console.log('🏗️ Solicitando construcción al backend:', {
        buildingTypeId: buildingType.id,
        positionX: x,
        positionY: y
      });

      const response = await villageAPI.createBuilding(
        buildingType.id, 
        x, 
        y
      );

      if (response.success) {
        console.log('✅ Edificio creado exitosamente');
        
        // Actualizar recursos localmente con los nuevos recursos del backend
        if (response.newResources) {
          setCurrentResources(response.newResources);
          if (onResourceChange) {
            onResourceChange(response.newResources);
          }
        }
        
        // Notificar al componente padre para recargar edificios
        if (onBuildingsChange) {
          onBuildingsChange();
        }
        
        setMessage(`✅ ${buildingType.name} construido exitosamente`);
        setTimeout(() => setMessage(''), 3000);
        
        return true;
      } else {
        console.error('❌ Error en respuesta del backend:', response.message);
        setMessage(`❌ ${response.message || 'Error al construir'}`);
        setTimeout(() => setMessage(''), 5000);
        return false;
      }
    } catch (error) {
      console.error('❌ Error en createBuilding:', error);
      setMessage(`❌ Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
      return false;
    } finally {
      // Cooldown de 10 segundos para prevenir construcciones múltiples
      setTimeout(() => setLoading(false), 10000);
    }
  };

  const deleteBuilding = async (buildingId, buildingName) => {
    if (loading) return;
    
    if (!window.confirm(`¿Seguro que quieres eliminar este ${buildingName}?`)) {
      return;
    }

    try {
      console.log(`🗑️ Eliminando edificio ID: ${buildingId}`);
      
      await villageAPI.deleteBuilding(buildingId);
      
      // Notificar al componente padre para recargar edificios
      if (onBuildingsChange) {
        onBuildingsChange();
      }
      
      setMessage(`✅ ${buildingName} eliminado exitosamente`);
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error eliminando edificio:', error);
      setMessage(`❌ Error al eliminar ${buildingName}: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleCellClick = async (row, col) => {
    const existingBuilding = grid[row][col];
    
    if (existingBuilding) {
      // Si es el Ayuntamiento, abrir modal de mejora
      if (existingBuilding.building_types?.name === 'Ayuntamiento') {
        console.log('🏛️ Clic en Ayuntamiento - abriendo modal');
        setSelectedTownHall(existingBuilding);
        setTownHallModalOpen(true);
        return;
      }
      
      // Para otros edificios, mostrar mensaje
      setMessage(`${existingBuilding.building_types?.name || 'Edificio'} - Click derecho para eliminar`);
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    // Si no hay edificio y no hay tipo seleccionado
    if (loading || !selectedBuildingType) return;
    
    // Construir edificio - El backend validará recursos y reglas
    await createBuilding(selectedBuildingType, col, row);
  };

  const handleCellRightClick = async (e, row, col) => {
    e.preventDefault();
    
    const existingBuilding = grid[row][col];
    if (!existingBuilding) return;
    
    // No permitir eliminar el Ayuntamiento
    if (existingBuilding.building_types?.name === 'Ayuntamiento') {
      setMessage('❌ No puedes eliminar el Ayuntamiento');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    
    await deleteBuilding(existingBuilding.id, existingBuilding.building_types?.name || 'Edificio');
  };

  const getBuildingEmoji = (building) => {
    if (!building?.building_types) return '❓';
    
    const emoji = building.building_types.emoji || '🏢';
    const level = building.level || 1;
    
    return level > 1 ? `${emoji}${level}` : emoji;
  };

  const getCellClass = (row, col) => {
    let classes = 'w-8 h-8 border border-gray-300 flex items-center justify-center text-xs cursor-pointer ';
    
    const building = grid[row][col];
    if (building) {
      classes += 'bg-green-200 hover:bg-green-300 ';
    } else {
      classes += 'bg-gray-100 hover:bg-blue-200 ';
    }
    
    return classes;
  };

  if (!buildingTypes.length) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-600">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando tipos de edificios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">🗺️ Mapa de tu Aldea</h2>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-center font-semibold ${
          message.includes('❌') || message.includes('Error') 
            ? 'bg-red-100 text-red-700' 
            : message.includes('✅') 
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
        }`}>
          {message}
        </div>
      )}

      {/* Selector de edificios */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-3">🏗️ Selecciona edificio para construir:</h3>
        <div className="flex flex-wrap gap-2">
          {buildingTypes
            .filter(building => building.type !== 'special') // Excluir Ayuntamiento
            .map(building => (
              <button
                key={building.id}
                onClick={() => setSelectedBuildingType(building)}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  selectedBuildingType?.id === building.id
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                }`}
                title={`${building.name} - ${building.description}\nCosto: 🪵${building.base_cost_wood} 🪨${building.base_cost_stone} 🍞${building.base_cost_food} ⚙️${building.base_cost_iron}`}
              >
                <span className="text-lg">{building.emoji}</span>
                <span className="ml-2 text-sm">{building.name}</span>
                <div className="text-xs text-gray-600 mt-1">
                  {building.base_cost_wood}🪵 {building.base_cost_stone}🪨 {building.base_cost_food}🍞 {building.base_cost_iron}⚙️
                </div>
              </button>
            ))}
        </div>
        
        {selectedBuildingType && (
          <div className="mt-3 p-3 bg-gray-50 rounded">
            <p><strong>{selectedBuildingType.emoji} {selectedBuildingType.name}</strong></p>
            <p className="text-sm text-gray-600">{selectedBuildingType.description}</p>
            <p className="text-sm font-semibold text-blue-600">
              Costo: 🪵{selectedBuildingType.base_cost_wood} 🪨{selectedBuildingType.base_cost_stone} 🍞{selectedBuildingType.base_cost_food} ⚙️{selectedBuildingType.base_cost_iron}
            </p>
          </div>
        )}
      </div>

      {/* Mapa de la aldea */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-15 gap-0 mx-auto" style={{width: 'fit-content'}}>
          {grid.map((row, rowIndex) => 
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(rowIndex, colIndex)}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                onContextMenu={(e) => handleCellRightClick(e, rowIndex, colIndex)}
                title={
                  cell 
                    ? `${cell.building_types?.name || 'Edificio'} (Nivel ${cell.level || 1})\nClick derecho para eliminar` 
                    : selectedBuildingType 
                      ? `Click para construir ${selectedBuildingType.name}` 
                      : 'Selecciona un edificio primero'
                }
              >
                {cell ? getBuildingEmoji(cell) : ''}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instrucciones */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded mt-4">
        <p><strong>Instrucciones:</strong></p>
        <p>• Selecciona un edificio de la lista superior</p>
        <p>• Click izquierdo en una casilla vacía para construir</p>
        <p>• Click izquierdo en el 🏛️ Ayuntamiento para mejorarlo</p>
        <p>• Click derecho para eliminar edificio (excepto Ayuntamiento)</p>
        <p>• Los números muestran el nivel del edificio</p>
        <p>• El backend valida automáticamente recursos y requisitos</p>
      </div>

      {/* Modal de mejora del Ayuntamiento */}
      <TownHallUpgradeModal
        isOpen={townHallModalOpen}
        onClose={() => setTownHallModalOpen(false)}
        townHall={selectedTownHall}
        userResources={currentResources}
        onUpgrade={() => {
          // Refrescar edificios después de la mejora
          onBuildingsChange();
        }}
      />
    </div>
  );
}
