import React from 'react';
import { useEffect, useState } from 'react';
import { useAuthService } from './hooks/useAuth';
import Register from './pages/Register';
import Game from './pages/Game';
import Login from './pages/Login';
import AuthWatchdog from './components/AuthWatchdog';

function App() {
  const [view, setView] = useState('register');
  const [authError, setAuthError] = useState(null);
  const { authenticated, user, loading, logout, checkAuthStatus } = useAuthService();

  // Manejar errores de autenticación del watchdog
  const handleAuthError = async (errorMessage) => {
    console.error('🔍 AuthError from watchdog:', errorMessage);
    setAuthError(errorMessage);
    await logout();
    setView('login');
  };

  useEffect(() => {
    const initializeApp = async () => {
      await checkAuthStatus();
    };

    initializeApp();
  }, []); // Solo ejecutar una vez al montar

  // Efecto separado para manejar cambios de autenticación
  useEffect(() => {
    if (!loading) { // Solo actuar cuando no esté cargando
      if (authenticated && user) {
        // Si está autenticado, ir al juego
        setView('game');
      } else {
        // Si no está autenticado, ir a registro por defecto
        setView('register');
      }
    }
  }, [authenticated, user, loading]);

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">Clash of Clans - Progra3</h1>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setView('login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Efecto de estrellas de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{top: '10%', left: '20%', animationDelay: '0s'}}></div>
        <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{top: '20%', left: '80%', animationDelay: '1s'}}></div>
        <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{top: '60%', left: '10%', animationDelay: '2s'}}></div>
        <div className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{top: '80%', left: '90%', animationDelay: '1.5s'}}></div>
        <div className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-pulse" style={{top: '30%', left: '50%', animationDelay: '0.5s'}}></div>
      </div>

      {view !== 'game' && (
        <div className="text-center mb-8 z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent" 
              style={{fontFamily: 'Cinzel, serif', textShadow: '0 0 30px rgba(212, 175, 55, 0.5)'}}>
            ⚔️ Clash of Clans ⚔️
          </h1>
          <p className="text-yellow-400 text-lg font-semibold tracking-wider">Proyecto Progra3</p>
        </div>
      )}
      
      {/* Mostrar error de autenticación si existe */}
      {authError && (
        <div className="mb-4 p-4 card-glass border-2 border-red-500 text-red-300 text-center max-w-md mx-auto z-10">
          <span className="text-2xl mr-2">⚠️</span>
          {authError}
        </div>
      )}
      
      {/* AuthWatchdog para monitorear la sesión */}
      {authenticated && user && (
        <AuthWatchdog 
          user={user}
          onAuthError={handleAuthError}
        />
      )}
      
      <div className="w-full z-10">
        {view === 'register' && <Register goToLogin={() => setView('login')} />}
        {view === 'login' && (
          <Login 
            goToGame={() => {
              setView('game');
              setAuthError(null); // Limpiar errores al hacer login
            }}
            goToRegister={() => setView('register')}
          />
        )}
        {view === 'game' && (
          <>
            <Game onLogout={handleLogout} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
