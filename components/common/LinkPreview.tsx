import React, { useEffect, useState } from 'react';

interface LinkPreviewProps {
  url: string;
  type?: 'youtube' | 'drive';
  className?: string;
}

interface PreviewData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url, type, className = '' }) => {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    // Pour YouTube, on peut extraire les infos directement de l'URL
    if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        setPreview({
          title: 'Vidéo YouTube',
          description: 'Cliquez pour regarder la vidéo',
          image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          siteName: 'YouTube'
        });
        setLoading(false);
      } else {
        setLoading(false);
      }
      return;
    }

    // Pour Drive, on peut afficher un aperçu simple
    if (type === 'drive' || url.includes('drive.google.com') || url.includes('onedrive.live.com')) {
      setPreview({
        title: url.includes('drive.google.com') ? 'Google Drive' : 'Microsoft OneDrive',
        description: 'Cliquez pour accéder au dossier/fichier',
        image: url.includes('drive.google.com') 
          ? 'https://ssl.gstatic.com/images/branding/product/1x/drive_48dp.png'
          : 'https://c.s-microsoft.com/en-us/CMSImages/onedrive-logo.svg',
        siteName: url.includes('drive.google.com') ? 'Google Drive' : 'OneDrive'
      });
      setLoading(false);
      return;
    }

    // Pour les autres liens, on pourrait utiliser un service d'Open Graph
    // Mais pour simplifier, on affiche juste le lien
    setLoading(false);
  }, [url, type]);

  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className={`bg-gray-100 rounded-lg p-3 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  if (!preview && !url) {
    return null;
  }

  if (!preview) {
    // Fallback: afficher juste le lien
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`block text-blue-600 hover:text-blue-800 text-sm ${className}`}
      >
        <i className="fas fa-external-link-alt mr-1"></i>
        {url.length > 50 ? `${url.substring(0, 50)}...` : url}
      </a>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${className}`}
    >
      {preview.image && (
        <div className="w-full h-32 bg-gray-200 relative overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title || 'Preview'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Si l'image ne charge pas, on cache l'image
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {type === 'youtube' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <i className="fab fa-youtube text-white text-4xl"></i>
            </div>
          )}
        </div>
      )}
      <div className="p-3 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate mb-1">
              {preview.title}
            </p>
            {preview.description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {preview.description}
              </p>
            )}
          </div>
          {type === 'youtube' && (
            <i className="fab fa-youtube text-red-600 text-lg ml-2 flex-shrink-0"></i>
          )}
          {(type === 'drive' || preview.siteName?.includes('Drive')) && (
            <i className="fab fa-google-drive text-blue-600 text-lg ml-2 flex-shrink-0"></i>
          )}
        </div>
        {preview.siteName && (
          <p className="text-xs text-gray-500 mt-2 flex items-center">
            <i className="fas fa-globe mr-1"></i>
            {preview.siteName}
          </p>
        )}
      </div>
    </div>
  );
};

export default LinkPreview;

