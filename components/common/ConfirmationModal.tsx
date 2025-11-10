import React from 'react';
import { useLocalization } from '../../contexts/LocalizationContext';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  isLoading = false,
}) => {
  const { t } = useLocalization();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              {isLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              ) : (
                <i className="fas fa-exclamation-triangle text-red-600"></i>
              )}
            </div>
            <div className="ml-4 text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-2">{isLoading ? 'Suppression en cours...' : message}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${confirmButtonClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
            {confirmText || t('confirm_delete')}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText || t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

