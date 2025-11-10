import React from 'react';

interface AccessDeniedProps {
  title?: string;
  description?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = 'Accès refusé',
  description = 'Vous n’avez pas les permissions nécessaires pour accéder à ce module. Veuillez contacter votre administrateur.',
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-md">
        <i className="fas fa-lock text-6xl text-red-500 mb-4"></i>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
};

export default AccessDenied;


