// Sistema de eventos para notificar cambios de recursos entre componentes
class ResourceEventSystem {
  constructor() {
    this.listeners = [];
    this.pendingUpdates = new Set(); // Para trackear actualizaciones pendientes
  }

  // Agregar un listener
  addListener(callback) {
    this.listeners.push(callback);
    
    // Retornar función para remover el listener
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notificar a todos los listeners que los recursos han cambiado
  notifyResourceChange(userId, newResources) {
    console.log('📢 Notificando cambio de recursos:', { userId, newResources });
    
    // Agregar a actualizaciones pendientes si no se tienen recursos específicos
    if (!newResources) {
      this.pendingUpdates.add(userId);
    }
    
    this.listeners.forEach(listener => {
      try {
        listener(userId, newResources);
      } catch (error) {
        console.error('Error en listener de recursos:', error);
      }
    });
  }

  // Método específico para notificar donaciones recibidas
  notifyDonationReceived(recipientUserId, donationAmounts) {
    console.log('🎁 Notificando donación recibida:', { recipientUserId, donationAmounts });
    this.notifyResourceChange(recipientUserId, null); // null indica que debe recargar
    
    // Programar actualizaciones adicionales para asegurar sincronización
    setTimeout(() => {
      this.notifyResourceChange(recipientUserId, null);
    }, 1000);
    
    setTimeout(() => {
      this.notifyResourceChange(recipientUserId, null);
    }, 3000);
  }

  // Marcar una actualización como completada
  markUpdateCompleted(userId) {
    this.pendingUpdates.delete(userId);
  }

  // Verificar si un usuario tiene actualizaciones pendientes
  hasPendingUpdates(userId) {
    return this.pendingUpdates.has(userId);
  }
}

// Instancia global del sistema de eventos
export const resourceEventSystem = new ResourceEventSystem();

export default resourceEventSystem;
