import React from 'react';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, buildingName, buildingEmoji }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="text-center">
          {/* Icono de advertencia */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          
          {/* Título */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            ¿Eliminar edificio?
          </h3>
          
          {/* Descripción */}
          <div className="mb-4">
            <div className="text-4xl mb-2">{buildingEmoji}</div>
            <p className="text-sm text-gray-600">
              Estás a punto de eliminar este <span className="font-semibold">{buildingName}</span>.
            </p>
            <p className="text-sm text-red-600 mt-2">
              Esta acción no se puede deshacer.
            </p>
          </div>
          
          {/* Botones */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
