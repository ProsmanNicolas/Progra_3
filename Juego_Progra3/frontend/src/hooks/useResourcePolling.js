import { useEffect } from 'react';
import resourceAPI from '../services/resourceAPI';

/**
 * Hook para actualizar recursos desde el backend
 * El backend calcula automáticamente los recursos generados cuando se solicitan
 * Este hook solo hace polling cada 30 segundos para mantener la UI actualizada
 */
const useResourcePolling = (user, setUserResources) => {
  useEffect(() => {
    if (!user || !user.id) {
      console.log('⏸️ Polling de recursos pausado - usuario no disponible');
      return;
    }

    console.log('🔄 Iniciando polling de recursos desde backend...');

    // Función para obtener recursos del backend
    const fetchResources = async () => {
      try {
        const response = await resourceAPI.getUserResources();
        
        if (response.success && response.data) {
          setUserResources(response.data);
          
          // Si se generaron recursos, mostrar en consola
          if (response.generated) {
            const { wood, stone, food, iron, minutesElapsed } = response.generated;
            if (wood > 0 || stone > 0 || food > 0 || iron > 0) {
              console.log(`⚡ Recursos generados: +${wood} madera, +${stone} piedra, +${food} comida, +${iron} hierro (${minutesElapsed}min)`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error obteniendo recursos:', error);
      }
    };

    // Obtener recursos inmediatamente
    fetchResources();

    // Polling cada 30 segundos
    const interval = setInterval(fetchResources, 30000);

    return () => {
      console.log('🛑 Deteniendo polling de recursos...');
      clearInterval(interval);
    };
  }, [user, setUserResources]);
};

export default useResourcePolling;
