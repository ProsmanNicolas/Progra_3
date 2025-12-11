import React, { useState } from 'react';
import { useAuthService } from '../hooks/useAuth';

export default function Register({ goToLogin }) {
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [redirectToLogin, setRedirectToLogin] = useState(false);
  const { register, checkEmail, loading } = useAuthService();

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Verificar si el email ya existe
      const emailExists = await checkEmail(form.email);
      
      if (emailExists) {
        setError('Este correo ya está registrado. Si es tuyo, inicia sesión.');
        return;
      }

      // Intentar registrar
      const response = await register(form);
      
      if (response.success) {
        setSuccess('Se te envió una confirmación de usuario a tu correo, revísalo');
        setRedirectToLogin(true);
        
        setTimeout(() => {
          if (goToLogin) goToLogin();
        }, 5000);
      }
    } catch (err) {
      setError(err.message || 'Error inesperado durante el registro');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 card-glass">
      {success ? (
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <div className="p-6 bg-green-500 bg-opacity-20 border-2 border-green-500 rounded-lg">
            <p className="text-green-300 text-lg font-semibold mb-2">{success}</p>
            <p className="text-green-400">Redirigiendo al inicio de sesión...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏰</div>
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">Únete a la Batalla</h2>
            <p className="text-gray-400">Crea tu cuenta y construye tu imperio</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-yellow-400 mb-2">👤 Nombre de Usuario</label>
              <input 
                type="text" 
                name="username" 
                placeholder="Guerrero123" 
                required 
                className="w-full p-3 rounded-lg" 
                onChange={handleChange}
                value={form.username}
                disabled={loading}
              />
            </div>

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

            {error && (
              <div className="p-4 bg-red-500 bg-opacity-20 border-2 border-red-500 rounded-lg text-red-300 text-sm">
                ❌ {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary w-full py-3 rounded-lg font-bold text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚙️</span> Registrando...
                </span>
              ) : (
                <span>🚀 Crear Cuenta</span>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-400 mb-3">¿Ya tienes una cuenta?</p>
            <button 
              className="btn-secondary px-6 py-2 rounded-lg font-semibold w-full" 
              onClick={goToLogin}
            >
              🔑 Iniciar Sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

