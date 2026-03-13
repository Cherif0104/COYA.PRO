import React, { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContextSupabase';
import { useLocalization } from '../../contexts/LocalizationContext';

const MAX_SIZE = 512;
const MAX_DATA_URL_LENGTH = 200000;

function resizeImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl.length > MAX_DATA_URL_LENGTH ? canvas.toDataURL('image/jpeg', 0.6) : dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

const DashboardAvatar: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { t } = useLocalization();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const userName = (user as any).fullName || (user as any).name || user.email || 'Utilisateur';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setError(null);
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, MAX_SIZE);
      const { success } = await updateProfile({ avatar_url: dataUrl });
      if (!success) setError('Erreur');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
    setUploading(false);
  };

  return (
    <div className="relative group shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={t('profile_photo_upload')}
        onChange={handleFile}
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex items-center justify-center w-16 h-16 rounded-full border-2 border-coya-primary overflow-hidden bg-coya-bg focus:outline-none focus:ring-2 focus:ring-coya-primary focus:ring-offset-2 transition-shadow hover:shadow-md"
        title={t('profile_photo_upload')}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={userName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <span
          className={`w-full h-full flex items-center justify-center text-coya-primary text-lg font-semibold bg-coya-primary/10 ${user.avatar ? 'hidden' : ''}`}
        >
          {initials}
        </span>
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <i className="fas fa-camera text-white text-xl" />
        </span>
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <i className="fas fa-spinner fa-spin text-white text-xl" />
          </span>
        )}
      </button>
      {error && (
        <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-red-600 whitespace-nowrap">{error}</p>
      )}
    </div>
  );
};

export default DashboardAvatar;
