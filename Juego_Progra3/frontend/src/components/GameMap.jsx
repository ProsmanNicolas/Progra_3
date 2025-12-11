import React, { useState, useEffect, useRef } from 'react';
import villageAPI from '../services/villageAPI';
import resourceAPI from '../services/resourceAPI';
import TownHallUpgradeModal from './TownHallUpgradeModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import DefenseTowerModal from './DefenseTowerModal';
import troopAPI from '../services/troopAPI';
import ResourceDisplay from './ResourceDisplay';
import { getBuildingIcon } from '../utils/buildingIcons';

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
  const [isMounted, setIsMounted] = useState(true);
  const [buildingTypesLoaded, setBuildingTypesLoaded] = useState(false); // Flag para controlar mensajes
  
  // Estado para el modal de confirmación de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState(null);

  // Estado para el modal de torre de defensa
  const [defenseTowerModalOpen, setDefenseTowerModalOpen] = useState(false);
  const [selectedDefenseTower, setSelectedDefenseTower] = useState(null);
  const [userTroops, setUserTroops] = useState({});
  const [showConstructionPanel, setShowConstructionPanel] = useState(false); // Estado para mostrar/ocultar panel de construcción
  
  // Estados para modo de movimiento de edificios
  const [moveMode, setMoveMode] = useState(false);
  const [buildingToMove, setBuildingToMove] = useState(null);

  // Estado para límites de edificios (viene del backend)
  const [buildingLimits, setBuildingLimits] = useState(null);

  // Cargar límites de edificios desde el backend
  const loadBuildingLimits = async () => {
    try {
      const response = await villageAPI.getBuildingLimits();
      if (response.success) {
        // Adaptar datos de townhall-info al formato esperado
        const data = response.data;
        setBuildingLimits({
          townHallLevel: data.currentLevel,
          maxLevel: data.maxLevel,
          currentMaxBuildings: data.currentMaxBuildings,
          nextMaxBuildings: data.nextMaxBuildings,
          canUpgrade: data.canUpgrade
        });
      }
    } catch (error) {
      console.error('Error cargando límites de edificios:', error);
    }
  };

  // Función para obtener límites (ahora solo retorna el estado)
  const getBuildingLimit = () => {
    if (!buildingLimits) {
      return {
        current: 0,
        max: 5,
        remaining: 5,
        townHallLevel: 1,
        isAtLimit: false
      };
    }
    
    const currentBuildingCount = userBuildings ? userBuildings.length : 0;
    const maxBuildings = buildingLimits.currentMaxBuildings || 5;
    
    return {
      current: currentBuildingCount,
      max: maxBuildings,
      remaining: maxBuildings - currentBuildingCount,
      townHallLevel: buildingLimits.townHallLevel || 1,
      isAtLimit: currentBuildingCount >= maxBuildings
    };
  };

  useEffect(() => {
    // Cargar building types cuando el componente se monta y tenemos userId
    if (userId && !buildingTypesLoaded) {
      console.log('🚀 Inicializando GameMap para usuario:', userId);
      initializeComponent();
      loadBuildingLimits();
    }
    
    // Cleanup al desmontar el componente
    return () => {
      setIsMounted(false);
    };
  }, [userId]); // Solo depender de userId

  useEffect(() => {
    // Recargar límites cuando cambien los edificios
    if (userId && userBuildings) {
      loadBuildingLimits();
    }
  }, [userBuildings]);

  useEffect(() => {
    if (isMounted) {
      console.log('🔍 GameMap: Actualizando currentResources', { userResources, currentResources });
      setCurrentResources(userResources);
    }
  }, [userResources, isMounted]);

  useEffect(() => {
    if (isMounted && userBuildings) {
      console.log('🔄 useEffect disparado para actualizar grid, edificios:', userBuildings.length);
      updateGridWithBuildings();
      
      // Múltiples fuerzas de re-render para asegurar actualización visual
      setTimeout(() => {
        setGrid(prevGrid => [...prevGrid.map(row => [...row])]);
        console.log('🔄 Grid force update 1 completado');
      }, 50);
      
      setTimeout(() => {
        setGrid(prevGrid => [...prevGrid.map(row => [...row])]);
        console.log('🔄 Grid force update 2 completado');
      }, 150);
      
      setTimeout(() => {
        updateGridWithBuildings();
        console.log('🔄 Grid force update 3 con nueva actualización completado');
      }, 250);
    }
  }, [userBuildings, isMounted]);
  
  // useEffect adicional para forzar actualización completa cuando cambia la key del componente
  useEffect(() => {
    console.log('🆕 GameMap montado/re-montado, forzando actualización completa...');
    if (userBuildings && userBuildings.length > 0) {
      // Re-inicializar completamente el grid
      setTimeout(() => {
        updateGridWithBuildings();
        console.log('🆕 Actualización completa del grid tras re-mount');
      }, 100);
      
      setTimeout(() => {
        setGrid(prevGrid => [...prevGrid.map(row => [...row])]);
        console.log('🆕 Force render tras re-mount');
      }, 200);
    }
  }, []); // Solo se ejecuta al montar el componente
  
  // Heartbeat para sincronización post-construcción
  useEffect(() => {
    let heartbeatInterval;
    
    if (isMounted) {
      heartbeatInterval = setInterval(async () => {
        if (userBuildings && userBuildings.length > 0) {
          try {
            const response = await villageAPI.getUserBuildings();
            if (response.success && response.data) {
              // Solo actualizar si hay diferencia en el conteo
              if (response.data.length !== userBuildings.length) {
                console.log('💓 Heartbeat: Detectada diferencia en edificios, sincronizando...');
                if (onBuildingsChange) {
                  onBuildingsChange();
                }
              }
            }
          } catch (error) {
            console.log('💓 Heartbeat: Error en sincronización:', error.message);
          }
        }
      }, 3000); // Verificar cada 3 segundos
    }
    
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [userBuildings, isMounted, onBuildingsChange]);

  const initializeComponent = async () => {
    // Cargar building types siempre, pero mostrar mensaje solo si es necesario
    await loadBuildingTypes();
    // Cargar tropas del usuario para el sistema de defensa
    await loadUserTroops();
  };

  // Cargar tropas del usuario
  const loadUserTroops = async () => {
    try {
      const response = await troopAPI.getUserTroops();
      if (response.success) {
        // Convertir array de tropas a objeto para fácil acceso
        const troopsMap = {};
        response.data?.forEach(troop => {
          troopsMap[troop.troop_type_id] = troop.quantity;
        });
        setUserTroops(troopsMap);
        console.log('✅ Tropas del usuario cargadas para defensa:', troopsMap);
      }
    } catch (error) {
      console.error('❌ Error cargando tropas del usuario:', error);
    }
  };

  // Función para mostrar mensajes informativos del juego
  const logGameInfo = (category, message) => {
    // Usar console.info para que no aparezca como error en la consola
    const timestamp = new Date().toLocaleTimeString();
    console.info(`[${timestamp}] 🎮 ${category}:`, message);
  };

  // Función helper para setTimeouts seguros
  const safeSetTimeout = (callback, delay) => {
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        callback();
      }
    }, delay);
    
    return timeoutId;
  };

  const updateGridWithBuildings = () => {
    if (!userBuildings || !Array.isArray(userBuildings)) {
      console.log('⚠️ updateGridWithBuildings: No userBuildings disponibles o no es array');
      return;
    }
    
    console.log('🔄 Actualizando grid con edificios:', {
      count: userBuildings.length,
      buildings: userBuildings.map(b => ({
        id: b.id,
        name: b.building_types?.name,
        pos: `(${b.position_x}, ${b.position_y})`
      }))
    });
    
    // Crear nuevo grid completamente limpio
    const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    
    let validBuildings = 0;
    userBuildings.forEach((building, index) => {
      if (building && building.position_x != null && building.position_y != null && 
          building.position_x < GRID_SIZE && building.position_y < GRID_SIZE &&
          building.position_x >= 0 && building.position_y >= 0) {
        
        newGrid[building.position_y][building.position_x] = {
          ...building,
          building_type: building.building_types
        };
        validBuildings++;
        console.log(`🏗️ Edificio ${index + 1}: ID=${building.id}, ${building.building_types?.name} en (${building.position_x}, ${building.position_y})`);
      } else {
        console.warn(`⚠️ Edificio ${index + 1} tiene posición inválida:`, building);
      }
    });
    
    console.log(`✅ Grid actualizado con ${validBuildings}/${userBuildings.length} edificios válidos, estableciendo nuevo estado...`);
    setGrid(newGrid);
    
    // Forzar re-render adicional para asegurar actualización visual
    setTimeout(() => {
      console.log('🔄 Forzando re-render del grid...');
      setGrid([...newGrid.map(row => [...row])]);
    }, 50);
  };

  const loadBuildingTypes = async (forceReload = false) => {
    try {
      // Mostrar mensaje solo si es la primera carga o una recarga forzada
      const shouldShowMessage = !buildingTypesLoaded || forceReload;
      
      if (shouldShowMessage) {
        console.log('🔄 Cargando tipos de edificios desde backend...');
      }
      
      const response = await villageAPI.getBuildingTypes();
      
      if (response && response.success && response.data && response.data.length > 0) {
        if (shouldShowMessage) {
          console.log('✅ Tipos de edificios cargados:', response.data.length);
        }
        
        // Filtrar para excluir "Muralla" y solo mostrar "Muro"
        const filteredBuildings = response.data.filter(building => building.name !== 'Muralla');
        
        setBuildingTypes(filteredBuildings);
        setBuildingTypesLoaded(true);
        
        if (shouldShowMessage) {
          console.log('🏗️ Edificios disponibles - selecciona uno para construir');
        }
      } else {
        console.error('❌ Respuesta inválida de building types:', response);
        setMessage('Error: No se pudieron cargar los tipos de edificios');
        setBuildingTypesLoaded(false);
      }
      
    } catch (error) {
      console.error('❌ Error completo cargando tipos de edificios:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setMessage('Error de conexión al cargar tipos de edificios');
      setBuildingTypesLoaded(false);
    }
  };

  const createBuilding = async (buildingType, x, y) => {
    if (loading) {
      setMessage('⏳ Espera a que termine la construcción anterior');
      safeSetTimeout(() => setMessage(''), 3000);
      return false;
    }

    // VALIDACIÓN INMEDIATA DE RECURSOS ANTES DE ENVIAR AL BACKEND
    if (currentResources) {
      const canAfford = (
        currentResources.wood >= buildingType.base_cost_wood &&
        currentResources.stone >= buildingType.base_cost_stone &&
        currentResources.food >= buildingType.base_cost_food &&
        currentResources.iron >= buildingType.base_cost_iron
      );
      
      if (!canAfford) {
        const missing = [];
        if (currentResources.wood < buildingType.base_cost_wood) 
          missing.push(`🪵 ${buildingType.base_cost_wood - currentResources.wood} madera`);
        if (currentResources.stone < buildingType.base_cost_stone) 
          missing.push(`🪨 ${buildingType.base_cost_stone - currentResources.stone} piedra`);
        if (currentResources.food < buildingType.base_cost_food) 
          missing.push(`🌾 ${buildingType.base_cost_food - currentResources.food} comida`);
        if (currentResources.iron < buildingType.base_cost_iron) 
          missing.push(`⚙️ ${buildingType.base_cost_iron - currentResources.iron} hierro`);
        
        setMessage(`❌ Recursos insuficientes. Faltan: ${missing.join(', ')}`);
        safeSetTimeout(() => setMessage(''), 5000);
        return false;
      }
    }

    setLoading(true);
    
    try {
      // DESCONTAR RECURSOS INMEDIATAMENTE (optimistic update)
      if (currentResources) {
        const newResources = {
          wood: currentResources.wood - buildingType.base_cost_wood,
          stone: currentResources.stone - buildingType.base_cost_stone,
          food: currentResources.food - buildingType.base_cost_food,
          iron: currentResources.iron - buildingType.base_cost_iron,
          population: currentResources.population,
          max_population: currentResources.max_population
        };
        
        // Actualizar recursos inmediatamente en la UI
        setCurrentResources(newResources);
        if (onResourceChange) {
          onResourceChange(newResources);
        }
        console.log('💰 OPTIMISTIC: Recursos descontados inmediatamente');
      }
      
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
        logGameInfo('Construcción exitosa', `${buildingType.name} construido en posición (${x}, ${y})`);
        
        // FORZAR ACTUALIZACIÓN INMEDIATA DE RECURSOS desde backend
        try {
          const resourceResponse = await resourceAPI.getUserResources();
          if (resourceResponse.success && resourceResponse.data) {
            setCurrentResources(resourceResponse.data);
            if (onResourceChange) {
              onResourceChange(resourceResponse.data);
            }
            console.log('💰 FORZADO: Recursos actualizados desde backend:', resourceResponse.data);
          }
        } catch (resourceError) {
          console.error('❌ Error al forzar actualización de recursos:', resourceError);
        }
        
        // Notificar al componente padre para recargar edificios Y recursos
        if (onBuildingsChange) {
          console.log('🔄 Actualizando edificios después de construcción...');
          try {
            await onBuildingsChange(); // Hacer await para asegurar que se complete antes de continuar
            
            // VALIDACIÓN VISUAL INMEDIATA - Verificar que el edificio aparezca en el grid
            setTimeout(async () => {
              console.log('🔍 VALIDACIÓN: Verificando que el edificio aparezca visualmente...');
              updateGridWithBuildings();
              
              // Verificar si el edificio está en el grid
              const updatedResponse = await villageAPI.getUserBuildings();
              if (updatedResponse.success && updatedResponse.data) {
                const newBuilding = updatedResponse.data.find(b => 
                  b.position_x === x && b.position_y === y && b.building_type_id === buildingType.id
                );
                
                if (newBuilding) {
                  console.log('✅ VALIDACIÓN: Edificio encontrado en backend, forzando actualización visual');
                  updateGridWithBuildings();
                  setGrid(prevGrid => {
                    const newGrid = [...prevGrid.map(row => [...row])];
                    newGrid[y][x] = {
                      ...newBuilding,
                      building_type: buildingType
                    };
                    return newGrid;
                  });
                } else {
                  console.warn('⚠️ VALIDACIÓN: Edificio no encontrado en backend aún');
                }
              }
            }, 50);
            
            // FORZAR múltiples actualizaciones del grid para asegurar visibilidad
            setTimeout(() => {
              console.log('🔄 [1] Forzando primera actualización del grid...');
              updateGridWithBuildings();
            }, 100);
            
            setTimeout(() => {
              console.log('🔄 [2] Forzando segunda actualización del grid...');
              updateGridWithBuildings();
              setGrid(prevGrid => [...prevGrid.map(row => [...row])]);
            }, 300);
            
            setTimeout(() => {
              console.log('🔄 [3] Forzando tercera actualización del grid (final)...');
              updateGridWithBuildings();
            }, 600);
            
          } catch (buildingError) {
            console.error('❌ Error al actualizar edificios:', buildingError);
          }
        }
        
        // Forzar actualización adicional de recursos después de un pequeño delay como backup
        if (onResourceChange) {
          setTimeout(() => {
            onResourceChange();
          }, 100);
        }
        
        setMessage(`✅ ${buildingType.name} construido exitosamente`);
        // Limpiar mensaje después de 2.5 segundos
        safeSetTimeout(() => {
          setMessage('');
          console.log('🧹 Mensaje de éxito limpiado');
        }, 2500);
        
        return true;
      } else {
        // Distinguir entre validaciones del juego (normales) y errores reales
        if (response.message && response.message.includes('Recursos insuficientes')) {
          logGameInfo('Recursos', response.message);
          setMessage(`💰 ${response.message}`);
          safeSetTimeout(() => setMessage(''), 4000);
        } else if (response.message && (response.message.includes('Posición ya ocupada') || response.message.includes('nivel') || response.message.includes('requerido'))) {
          logGameInfo('Construcción', response.message);
          setMessage(`🏗️ ${response.message}`);
          safeSetTimeout(() => setMessage(''), 4000);
        } else {
          logGameInfo('Restricción', response.message || 'Acción no permitida');
          setMessage(`⚠️ ${response.message || 'No se puede realizar esta acción'}`);
          safeSetTimeout(() => setMessage(''), 4000);
        }
        return false;
      }
    } catch (error) {
      // Los errores de validación ya se manejaron en el handleResponse del API
      // Solo llegan aquí errores de red o problemas técnicos reales
      console.error('❌ Error técnico en createBuilding:', error);
      
      if (error.message === 'TOKEN_REFRESH_NEEDED') {
        console.log('🔄 Token renovado, reintentando...');
        setMessage('🔄 Reintentando construcción...');
        safeSetTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ Error de conexión: ${error.message}`);
        safeSetTimeout(() => setMessage(''), 5000);
      }
      
      return false;
    } finally {
      // Liberar inmediatamente el estado loading para evitar bloqueos
      console.log('🔓 Liberando loading state...');
      setLoading(false);
      
      // Backup adicional para asegurar que se libere
      safeSetTimeout(() => {
        setLoading(false);
        console.log('🔓 Loading state liberado (backup)');
      }, 500);
    }
  };

  const moveBuilding = async (building, newX, newY) => {
    try {
      setLoading(true);
      console.log(`💚 Moviendo edificio ${building.id} de (${building.position_x}, ${building.position_y}) a (${newX}, ${newY})`);
      
      const result = await villageAPI.moveBuilding(building.id, newX, newY);
      
      if (result.success) {
        setMessage(`✅ ${building.building_types?.name} movido exitosamente`);
        safeSetTimeout(() => setMessage(''), 3000);
        
        // Salir del modo de movimiento
        setMoveMode(false);
        setBuildingToMove(null);
        
        // Notificar al componente padre para recargar edificios
        if (onBuildingsChange) {
          console.log('🔄 Actualizando edificios después de mover...');
          await onBuildingsChange();
        }
      } else {
        setMessage(`❌ ${result.message || 'Error al mover edificio'}`);
        safeSetTimeout(() => setMessage(''), 4000);
      }
    } catch (error) {
      console.error('Error moviendo edificio:', error);
      setMessage(`❌ Error al mover edificio: ${error.message || 'Error desconocido'}`);
      safeSetTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const deleteBuilding = async (buildingId, buildingName = 'Edificio') => {
    if (loading) return;

    try {
      console.log(`🗑️ Eliminando edificio:`, {
        id: buildingId,
        name: buildingName,
        type: typeof buildingId
      });
      
      // Validar que el ID sea válido antes de enviar
      if (!buildingId || buildingId === null || buildingId === undefined) {
        console.error('❌ ID de edificio inválido:', buildingId);
        setMessage(`❌ Error: ID de edificio inválido`);
        safeSetTimeout(() => setMessage(''), 5000);
        return;
      }
      
      const response = await villageAPI.deleteBuilding(buildingId);
      console.log('🔄 Respuesta de eliminación:', response);
      
      // FORZAR ACTUALIZACIÓN INMEDIATA DE RECURSOS después de eliminar
      try {
        const resourceResponse = await resourceAPI.getUserResources();
        if (resourceResponse.success && resourceResponse.data) {
          setCurrentResources(resourceResponse.data);
          if (onResourceChange) {
            onResourceChange(resourceResponse.data);
          }
          console.log('💰 FORZADO: Recursos actualizados después de eliminar:', resourceResponse.data);
        }
      } catch (resourceError) {
        console.error('❌ Error al forzar actualización de recursos:', resourceError);
      }
      
      // Notificar al componente padre para recargar edificios
      if (onBuildingsChange) {
        console.log('🔄 Actualizando edificios después de eliminar...');
        try {
          await onBuildingsChange();
        } catch (buildingError) {
          console.error('❌ Error al actualizar edificios:', buildingError);
        }
      }
      
      setMessage(`✅ ${buildingName} eliminado exitosamente`);
      safeSetTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error eliminando edificio:', {
        error: error.message,
        buildingId,
        buildingName
      });
      setMessage(`❌ Error al eliminar ${buildingName}: ${error.message}`);
      safeSetTimeout(() => setMessage(''), 5000);
    }
  };

  const handleCellClick = async (row, col) => {
    const existingBuilding = grid[row][col];
    
    // Modo de movimiento: mover edificio a nueva posición
    if (moveMode && buildingToMove) {
      // No permitir mover a una celda ocupada
      if (existingBuilding) {
        setMessage('❌ No puedes mover a una posición ocupada');
        safeSetTimeout(() => setMessage(''), 2000);
        return;
      }
      
      await moveBuilding(buildingToMove, col, row);
      return;
    }
    
    // Modo de movimiento: seleccionar edificio para mover
    if (moveMode && existingBuilding) {
      // No permitir mover el Ayuntamiento
      if (existingBuilding.building_types?.name === 'Ayuntamiento') {
        setMessage('❌ No puedes mover el Ayuntamiento');
        safeSetTimeout(() => setMessage(''), 2000);
        return;
      }
      
      setBuildingToMove(existingBuilding);
      // No setear mensaje aquí, se mostrará en el indicador visual
      return;
    }
    
    if (existingBuilding) {
      // Si es el Ayuntamiento, abrir modal de mejora
      if (existingBuilding.building_types?.name === 'Ayuntamiento') {
        console.log('🏛️ Clic en Ayuntamiento - abriendo modal');
        setSelectedTownHall(existingBuilding);
        setTownHallModalOpen(true);
        return;
      }
      
      // Si es Torre de Defensa, abrir modal de asignación de tropas
      if (existingBuilding.building_types?.name === 'Torre de Defensa') {
        console.log('🏰 Clic en Torre de Defensa - abriendo modal de tropas');
        setSelectedDefenseTower(existingBuilding);
        setDefenseTowerModalOpen(true);
        return;
      }
      
      // Para otros edificios, mostrar mensaje
      setMessage(`${existingBuilding.building_types?.name || 'Edificio'} - Click derecho para eliminar`);
      safeSetTimeout(() => setMessage(''), 2000);
      return;
    }
    
    // Si no hay edificio y no hay tipo seleccionado
    if (loading) {
      console.log('⏳ Construcción en progreso...');
      return;
    }
    
    if (!selectedBuildingType) {
      console.log('❌ No hay edificio seleccionado');
      setMessage('Selecciona un edificio primero');
      safeSetTimeout(() => setMessage(''), 2000);
      return;
    }
    
    if (!buildingTypes || buildingTypes.length === 0) {
      console.log('❌ Building types no disponibles, recargando...');
      await loadBuildingTypes(true); // Forzar recarga
      return;
    }
    
    console.log('🏗️ Iniciando construcción:', selectedBuildingType.name, 'en posición', col, row);
    // Construir edificio - El backend validará recursos y reglas
    await createBuilding(selectedBuildingType, col, row);
  };

  const handleCellRightClick = async (e, row, col) => {
    e.preventDefault();
    
    const existingBuilding = grid[row][col];
    if (!existingBuilding) return;
    
    console.log('🖱️ Click derecho en edificio:', {
      id: existingBuilding.id,
      name: existingBuilding.building_types?.name,
      position: `(${row}, ${col})`,
      fullData: existingBuilding
    });
    
    // No permitir eliminar el Ayuntamiento
    if (existingBuilding.building_types?.name === 'Ayuntamiento') {
      setMessage('❌ No puedes eliminar el Ayuntamiento');
      safeSetTimeout(() => setMessage(''), 3000);
      return;
    }
    
    // Abrir modal de confirmación en lugar de usar confirm del navegador
    setBuildingToDelete(existingBuilding);
    setDeleteModalOpen(true);
  };

  // Función para confirmar eliminación desde el modal
  const handleConfirmDelete = async () => {
    if (buildingToDelete) {
      console.log('🗑️ MODAL: Confirmando eliminación de edificio:', {
        id: buildingToDelete.id,
        name: buildingToDelete.building_types?.name,
        fullBuilding: buildingToDelete
      });
      
      // Verificar que el edificio aún existe en la lista actual antes de eliminar
      const currentBuilding = userBuildings?.find(b => 
        b.position_x === buildingToDelete.position_x && 
        b.position_y === buildingToDelete.position_y
      );
      
      if (currentBuilding && currentBuilding.id !== buildingToDelete.id) {
        console.log('⚠️ ID de edificio desincronizado, usando ID actual:', {
          oldId: buildingToDelete.id,
          newId: currentBuilding.id
        });
        await deleteBuilding(currentBuilding.id, currentBuilding.building_types?.name || 'Edificio');
      } else {
        await deleteBuilding(buildingToDelete.id, buildingToDelete.building_types?.name || 'Edificio');
      }
      
      setBuildingToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  // Función para cancelar eliminación
  const handleCancelDelete = () => {
    setBuildingToDelete(null);
    setDeleteModalOpen(false);
  };

  const getBuildingEmoji = (building) => {
    if (!building?.building_types) {
      return '❓';
    }
    
    const buildingName = building.building_types.name || building.name;
    const emoji = getBuildingIcon(buildingName);
    const level = building.level || 1;
    
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <span className="text-2xl">{emoji}</span>
        {level > 1 && (
          <span className="text-xs font-bold bg-yellow-400 text-gray-900 px-1 rounded mt-0.5">
            Nv.{level}
          </span>
        )}
      </div>
    );
  };

  const getCellClass = (row, col) => {
    let classes = 'w-12 h-12 border border-green-800 border-opacity-20 flex items-center justify-center text-xs cursor-pointer transition-all duration-200 relative ';
    
    const building = grid[row][col];
    
    // Edificio seleccionado para mover
    if (moveMode && buildingToMove && building?.id === buildingToMove.id) {
      return classes + 'bg-green-600 bg-opacity-50 border-green-400 border-2 animate-pulse ring-4 ring-green-400 ring-opacity-50 z-20';
    }
    
    // Celdas vacías en modo mover (destino válido)
    if (moveMode && buildingToMove && !building) {
      return classes + 'bg-green-700 bg-opacity-30 hover:bg-green-600 hover:bg-opacity-50 border-green-500 border-2';
    }
    
    // Celdas ocupadas en modo mover (no se puede mover aquí)
    if (moveMode && buildingToMove && building) {
      return classes + 'bg-gradient-to-br from-red-900 to-red-800 opacity-50 cursor-not-allowed';
    }
    
    if (building) {
      // Edificio construido - fondo de tierra/construcción
      classes += 'bg-gradient-to-br from-amber-900 to-amber-800 hover:from-amber-800 hover:to-amber-700 shadow-md hover:shadow-lg transform hover:scale-110 z-10 ';
    } else {
      // Casilla vacía - césped
      const grassPattern = (row + col) % 3;
      if (grassPattern === 0) {
        classes += 'bg-gradient-to-br from-green-600 to-green-700 ';
      } else if (grassPattern === 1) {
        classes += 'bg-gradient-to-br from-green-700 to-green-800 ';
      } else {
        classes += 'bg-gradient-to-br from-green-600 to-green-800 ';
      }
      classes += 'hover:from-green-500 hover:to-green-600 hover:border-yellow-400 hover:shadow-lg ';
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
    <div className="p-4 relative">
      {/* Recursos compactos en esquina */}
      <ResourceDisplay 
        userId={userId} 
        onResourceUpdate={(resources) => {
          setCurrentResources(resources);
          if (onResourceChange) {
            onResourceChange(resources);
          }
        }}
        compact={true}
      />

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2 text-center" style={{fontFamily: 'Cinzel, serif'}}>
          🗺️ Mapa de tu Aldea
        </h2>
        <p className="text-gray-400 text-center text-sm">Construye y expande tu reino</p>
      </div>
      
      {message && (
        <div className={`mb-4 p-4 rounded-lg text-center font-semibold border-2 ${
          message.includes('❌') || message.includes('Error') 
            ? 'bg-red-500 bg-opacity-20 border-red-500 text-red-300' 
            : message.includes('✅') 
              ? 'bg-green-500 bg-opacity-20 border-green-500 text-green-300'
              : 'bg-blue-500 bg-opacity-20 border-blue-500 text-blue-300'
        }`}>
          {message}
        </div>
      )}

      {/* Botón para mostrar/ocultar panel de construcción y botón de mover */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={() => {
            setShowConstructionPanel(!showConstructionPanel);
            if (moveMode) {
              setMoveMode(false);
              setBuildingToMove(null);
            }
          }}
          className={`btn-primary flex-1 px-6 py-3 rounded-lg font-bold text-lg transition-all ${
            showConstructionPanel ? 'scale-105' : ''
          }`}
        >
          {showConstructionPanel ? '📦 Ocultar Construcción' : '🏗️ Construcción'}
        </button>
        <button
          onClick={() => {
            setMoveMode(!moveMode);
            setBuildingToMove(null);
            setSelectedBuildingType(null);
            if (showConstructionPanel) setShowConstructionPanel(false);
            setMessage(moveMode ? '' : '💚 Modo mover activado: Haz clic en un edificio para seleccionarlo');
          }}
          className={`${
            moveMode 
              ? 'bg-green-600 hover:bg-green-700 border-green-400 scale-105' 
              : 'bg-blue-600 hover:bg-blue-700 border-blue-400'
          } text-white px-6 py-3 rounded-lg font-bold text-lg transition-all border-2 flex-1`}
        >
          {moveMode ? '✅ Salir de Mover' : '💚 Mover Edificios'}
        </button>
      </div>

      {/* Indicador de edificio seleccionado para mover */}
      {moveMode && buildingToMove && (
        <div className="mb-4 p-4 bg-green-500 bg-opacity-20 border-2 border-green-400 rounded-lg flex justify-between items-center animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getBuildingEmoji(buildingToMove)}</span>
            <div>
              <p className="font-bold text-green-300 text-lg">💚 {buildingToMove.building_types?.name} listo para mover</p>
              <p className="text-sm text-gray-300">Haz clic en una celda vacía (verde) para colocarlo en su nueva posición</p>
            </div>
          </div>
          <button
            onClick={() => {
              setBuildingToMove(null);
            }}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Selector de edificios - Desplegable */}
      {showConstructionPanel && (
        <div className="mb-6 card-glass p-5 rounded-xl animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-yellow-300 flex items-center gap-2">
              🏗️ Selecciona edificio para construir:
            </h3>
            <button
              onClick={() => setShowConstructionPanel(false)}
              className="text-gray-400 hover:text-white text-2xl transition-colors"
              title="Cerrar panel"
            >
              ✕
            </button>
          </div>
          
          {/* Indicador de límite de edificios */}
          {(() => {
            const limit = getBuildingLimit();
            return (
              <div className={`mb-4 p-3 rounded-lg border-2 ${
                limit.isAtLimit 
                  ? 'bg-red-500 bg-opacity-20 border-red-500' 
                  : limit.remaining <= 2 
                    ? 'bg-yellow-500 bg-opacity-20 border-yellow-500'
                    : 'bg-blue-500 bg-opacity-20 border-blue-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-bold ${
                      limit.isAtLimit ? 'text-red-300' : limit.remaining <= 2 ? 'text-yellow-300' : 'text-blue-300'
                    }`}>
                      🏛️ Edificios: {limit.current}/{limit.max}
                    </p>
                    <p className="text-sm text-gray-300">
                      {limit.isAtLimit 
                        ? '⚠️ Límite alcanzado - Mejora el Ayuntamiento (Nivel ' + limit.townHallLevel + ')'
                        : limit.remaining <= 2
                          ? `⚠️ Solo quedan ${limit.remaining} espacios disponibles`
                          : `${limit.remaining} espacios disponibles`
                      }
                    </p>
                  </div>
                  {limit.isAtLimit && (
                    <div className="text-3xl">🚫</div>
                  )}
                </div>
              </div>
            );
          })()}
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {buildingTypes
              .filter(building => building.type !== 'special') // Excluir Ayuntamiento
              .map(building => (
                <button
                  key={building.id}
                  onClick={() => setSelectedBuildingType(building)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedBuildingType?.id === building.id
                      ? 'bg-yellow-500 bg-opacity-20 border-yellow-400 scale-105'
                      : 'bg-gray-800 bg-opacity-50 border-gray-600 hover:border-yellow-400 hover:scale-105'
                  }`}
                  title={`${building.name} - ${building.description}`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-1">{getBuildingIcon(building.name)}</div>
                    <div className="text-sm font-semibold text-white mb-1">{building.name}</div>
                    <div className="flex flex-wrap gap-1 justify-center text-xs">
                      {building.base_cost_wood > 0 && <span className="bg-green-900 bg-opacity-50 px-1.5 py-0.5 rounded">{building.base_cost_wood}🪵</span>}
                      {building.base_cost_stone > 0 && <span className="bg-gray-700 bg-opacity-50 px-1.5 py-0.5 rounded">{building.base_cost_stone}🪨</span>}
                      {building.base_cost_food > 0 && <span className="bg-yellow-900 bg-opacity-50 px-1.5 py-0.5 rounded">{building.base_cost_food}🍞</span>}
                      {building.base_cost_iron > 0 && <span className="bg-blue-900 bg-opacity-50 px-1.5 py-0.5 rounded">{building.base_cost_iron}⚙️</span>}
                    </div>
                  </div>
                </button>
              ))}
          </div>
          
          {selectedBuildingType ? (
            <div className="mt-4 p-4 bg-yellow-500 bg-opacity-10 border-2 border-yellow-400 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-lg font-bold text-yellow-300 mb-1">
                    {getBuildingIcon(selectedBuildingType.name)} {selectedBuildingType.name}
                  </p>
                  <p className="text-sm text-gray-300 mb-2">{selectedBuildingType.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedBuildingType.base_cost_wood > 0 && <span className="badge bg-green-700 text-white">🪵 {selectedBuildingType.base_cost_wood}</span>}
                    {selectedBuildingType.base_cost_stone > 0 && <span className="badge bg-gray-600 text-white">🪨 {selectedBuildingType.base_cost_stone}</span>}
                    {selectedBuildingType.base_cost_food > 0 && <span className="badge bg-yellow-700 text-white">🍞 {selectedBuildingType.base_cost_food}</span>}
                    {selectedBuildingType.base_cost_iron > 0 && <span className="badge bg-blue-700 text-white">⚙️ {selectedBuildingType.base_cost_iron}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBuildingType(null)}
                  className="ml-3 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  title="Deseleccionar edificio"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-blue-500 bg-opacity-10 border-2 border-blue-400 rounded-lg">
              <p className="text-blue-300 font-semibold mb-1">📌 Selecciona un edificio para construir</p>
              <p className="text-sm text-gray-400">Haz clic en cualquier edificio de arriba para seleccionarlo, luego haz clic en el mapa para construirlo.</p>
            </div>
          )}
        </div>
      )}

      {/* Indicador de edificio seleccionado cuando el panel está cerrado */}
      {!showConstructionPanel && selectedBuildingType && !moveMode && (
        <div className="mb-4 p-3 bg-yellow-500 bg-opacity-20 border-2 border-yellow-400 rounded-lg flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getBuildingIcon(selectedBuildingType.name)}</span>
            <div>
              <p className="font-bold text-yellow-300">{selectedBuildingType.name} seleccionado</p>
              <p className="text-sm text-gray-300">Haz clic en el mapa para construir</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedBuildingType(null)}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Mapa de la aldea */}
      <div className="card-glass p-6 rounded-xl bg-gradient-to-br from-green-900 to-green-950 shadow-2xl">
        <div className="bg-gradient-to-br from-amber-950 to-stone-900 p-4 rounded-lg shadow-inner">
          <div className="grid grid-cols-15 gap-0 mx-auto shadow-2xl rounded" style={{width: 'fit-content'}}>
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
      </div>

      {/* Instrucciones */}
      <div className="mt-4 card-glass p-4 rounded-xl border-2 border-blue-500 border-opacity-30">
        <p className="font-bold text-yellow-300 mb-2">📋 Instrucciones:</p>
        <div className="text-sm text-gray-300 space-y-1">
          <p>• Haz clic en "🏗️ Construcción" para ver los edificios disponibles</p>
          <p>• Selecciona un edificio y haz clic en una casilla vacía para construir</p>
          <p>• Click izquierdo en el 🏛️ Ayuntamiento para mejorarlo</p>
          <p>• Click derecho para eliminar edificio (excepto Ayuntamiento)</p>
          <p>• Los números muestran el nivel del edificio</p>
        </div>
      </div>

      {/* Modal de mejora del Ayuntamiento */}
      <TownHallUpgradeModal
        isOpen={townHallModalOpen}
        onClose={() => setTownHallModalOpen(false)}
        townHall={selectedTownHall}
        userResources={userResources || currentResources}
        onUpgrade={() => {
          // Refrescar edificios y recursos después de la mejora
          onBuildingsChange();
          if (onResourceChange) {
            onResourceChange();
          }
        }}
      />

      {/* Modal de Torre de Defensa */}
      <DefenseTowerModal
        isOpen={defenseTowerModalOpen}
        onClose={() => setDefenseTowerModalOpen(false)}
        tower={selectedDefenseTower}
        userTroops={userTroops}
        onAssignmentChange={() => {
          // Refrescar datos tras cambios en asignaciones
          loadUserTroops();
        }}
      />

      {/* Modal de confirmación para eliminar edificio */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        buildingName={buildingToDelete?.building_types?.name || 'Edificio'}
        buildingEmoji={getBuildingEmoji(buildingToDelete) || '🏢'}
      />
    </div>
  );
}
