import React, { useState } from 'react';
import { useAuthService } from '../hooks/useAuth';

export default function Login({ goToGame, goToRegister }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, loading } = useAuthService();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await login(form);
      
      if (response.success) {
        setSuccess('¡Login exitoso! Redirigiendo al juego...');
        setTimeout(() => {
          if (goToGame) goToGame();
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 card-glass">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">⚔️</div>
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">Bienvenido de Vuelta</h2>
        <p className="text-gray-400">Inicia sesión para defender tu aldea</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-yellow-400 mb-2">📧 Correo Electrónico</label>
          <input 
            type="email" 
            name="email" 
            placeholder="tu@email.com" 
            required 
            className="w-full p-3 rounded-lg" 
            onChange={handleChange}
            value={form.email}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-yellow-400 mb-2">🔒 Contraseña</label>
          <input 
            type="password" 
            name="password" 
            placeholder="••••••••" 
            required 
            className="w-full p-3 rounded-lg" 
            onChange={handleChange}
            value={form.password}
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary w-full py-3 rounded-lg font-bold text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⚙️</span> Iniciando sesión...
            </span>
          ) : (
            <span>🎮 Entrar al Juego</span>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-500 bg-opacity-20 border-2 border-red-500 rounded-lg text-red-300 text-center">
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div className="mt-4 p-4 bg-green-500 bg-opacity-20 border-2 border-green-500 rounded-lg text-green-300 text-center">
          ✅ {success}
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-gray-400 mb-3">¿No tienes cuenta?</p>
        <button 
          className="btn-secondary px-6 py-2 rounded-lg font-semibold w-full" 
          onClick={goToRegister}
        >
          🚀 Crear Cuenta Nueva
        </button>
      </div>
    </div>
  );
}
