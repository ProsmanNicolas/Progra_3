import React, { useEffect, useState } from 'react';
import { useAuthService } from '../hooks/useAuth';

export default function Profile() {
  const { user: authUser, authenticated, logout } = useAuthService();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authenticated && authUser) {
      setProfile({
        id: authUser.id,
        username: authUser.username || authUser.email,
        email: authUser.email
      });
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [authenticated, authUser]);

  if (loading) return <div className="mt-10 text-center">Cargando perfil...</div>;
  if (!authenticated || !authUser) return <div className="mt-10 text-center">No has iniciado sesión.</div>;

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow text-center">
      <h2 className="text-2xl font-bold mb-4">Perfil de usuario</h2>
      {profile?.avatar_url && (
        <img src={`https://gefkakcirabfbyndtjjb.supabase.co/storage/v1/object/public/avatars/${profile.avatar_url}`} alt="Avatar" className="w-24 h-24 rounded-full mx-auto mb-4" />
      )}
      <p><strong>Nombre:</strong> {profile?.username}</p>
      <p><strong>Correo:</strong> {authUser.email}</p>
    <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded" onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}
