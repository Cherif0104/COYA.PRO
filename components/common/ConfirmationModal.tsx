import React from 'react';
import { createPortal } from 'react-dom';
import { useLocalization } from '../../contexts/LocalizationContext';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonClass?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'primary';
  children?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  confirmLabel,
  cancelLabel,
  confirmButtonClass,
  isLoading = false,
  variant = 'danger',
  children,
}) => {
  const { t } = useLocalization();
  const effectiveConfirmClass = confirmButtonClass ?? (variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-coya-primary hover:opacity-90');
  const effectiveConfirmText = confirmLabel ?? confirmText ?? t('confirm_delete');
  const effectiveCancelText = cancelLabel ?? cancelText ?? t('cancel');

  const modal = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="presentation">
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start">
            <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              {isLoading ? (
                <div key="spinner" className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600" />
              ) : (
                <i key="icon" className="fas fa-exclamation-triangle text-red-600" aria-hidden />
              )}
            </div>
            <div className="ml-4 min-w-0 flex-1 text-left">
              <h3 id="confirm-modal-title" className="text-lg font-medium leading-6 text-gray-900">
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{isLoading ? 'Suppression en cours...' : message}</p>
              {children}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex w-full items-center justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm sm:ml-3 sm:w-auto sm:text-sm ${effectiveConfirmClass} ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <span className="inline-flex items-center">
              {isLoading ? (
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
              ) : null}
              {effectiveConfirmText}
            </span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {effectiveCancelText}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
};

export default ConfirmationModal;

