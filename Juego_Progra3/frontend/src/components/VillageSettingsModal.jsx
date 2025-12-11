import React, { useState, useEffect } from 'react';

/**
 * Modal para editar configuración de la aldea
 * - Nombre de la aldea
 * - Icono de la aldea
 * - Descripción/frase
 */
export default function VillageSettingsModal({ show, onClose, currentVillage, onSave }) {
  const [villageName, setVillageName] = useState('');
  const [villageIcon, setVillageIcon] = useState('🏰');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Iconos disponibles para la aldea
  const availableIcons = [
    '🏰', '🏛️', '🏘️', '🏡', '🏠', '🏚️', '🏔️', '🏕️', '⛺', '🗺️',
    '🏞️', '🌋', '⚔️', '🛡️', '👑', '💎', '🔱', '⚡', '🏯', '🗼',
    '🏟️', '🏖️', '🌆', '🌃', '🎪', '🎭', '🎨', '🏺', '🗿', '⛩️'
  ];

  useEffect(() => {
    if (currentVillage) {
      setVillageName(currentVillage.village_name || 'Mi Aldea');
      setVillageIcon(currentVillage.village_icon || '🏰');
      setDescription(currentVillage.description || 'Una próspera aldea en el mundo de Clash');
    }
  }, [currentVillage]);

  const handleSave = async () => {
    if (!villageName.trim()) {
      setError('El nombre de la aldea no puede estar vacío');
      return;
    }

    if (villageName.length > 30) {
      setError('El nombre no puede tener más de 30 caracteres');
      return;
    }

    if (description.length > 100) {
      setError('La descripción no puede tener más de 100 caracteres');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      console.log('💾 Guardando configuración de aldea:', {
        villageName: villageName.trim(),
        villageIcon,
        description: description.trim()
      });
      
      await onSave({
        villageName: villageName.trim(),
        villageIcon,
        description: description.trim()
      });
      
      console.log('✅ Configuración guardada exitosamente');
      onClose();
    } catch (err) {
      console.error('❌ Error al guardar configuración:', err);
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
            <h2 className="text-2xl font-bold text-yellow-400">⚙️ Configuración de Aldea</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-3xl leading-none"
              disabled={saving}
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-900 bg-opacity-50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Nombre de la Aldea */}
          <div className="mb-6">
            <label className="block text-gray-200 font-bold text-lg mb-2">
              📝 Nombre de la Aldea
            </label>
            <input
              type="text"
              value={villageName}
              onChange={(e) => setVillageName(e.target.value)}
              maxLength={30}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-lg"
              placeholder="Mi Aldea"
              disabled={saving}
            />
            <p className="text-gray-400 text-sm mt-1">
              {villageName.length}/30 caracteres
            </p>
          </div>

          {/* Descripción */}
          <div className="mb-6">
            <label className="block text-gray-200 font-bold text-lg mb-2">
              💬 Frase o Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              rows={3}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400 resize-none"
              placeholder="Una próspera aldea en el mundo de Clash"
              disabled={saving}
            />
            <p className="text-gray-400 text-sm mt-1">
              {description.length}/100 caracteres
            </p>
          </div>

          {/* Selector de Icono */}
          <div className="mb-6">
            <label className="block text-gray-200 font-bold text-lg mb-2">
              🎨 Icono de la Aldea
            </label>
            <div className="grid grid-cols-10 gap-2">
              {availableIcons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setVillageIcon(icon)}
                  disabled={saving}
                  className={`
                    text-3xl p-2 rounded-lg transition-all
                    ${villageIcon === icon
                      ? 'bg-yellow-600 ring-2 ring-yellow-400 scale-110'
                      : 'bg-gray-700 hover:bg-gray-600'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  title={icon}
                >
                  {icon}
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Seleccionado: {villageIcon}
            </p>
          </div>

          {/* Vista previa */}
          <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Vista previa en Mapa Global:</p>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{villageIcon}</span>
                <span className="font-bold text-white text-lg">{villageName || 'Mi Aldea'}</span>
              </div>
              <p className="text-gray-300 italic text-sm">
                "{description || 'Una próspera aldea en el mundo de Clash'}"
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
              disabled={saving}
            >
              ❌ Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? '⏳ Guardando...' : '✅ Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
