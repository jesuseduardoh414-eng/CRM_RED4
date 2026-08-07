import { useState } from 'react';
import { getPublicAssetUrl } from '../services/api';

const getInitials = (nombre = '') => (
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join('') || '?'
);

const UserAvatar = ({
  usuario,
  nombre,
  fotoPerfilUrl,
  size = 48,
  radius = 14,
  color = '#2563eb',
  background = 'rgba(37,99,235,0.08)',
  borderColor = 'rgba(37,99,235,0.18)',
  fontSize = '1rem',
  shadow = 'none',
  className = '',
  title,
}) => {
  const [imagenFallida, setImagenFallida] = useState(false);

  const displayName = nombre || usuario?.nombre || '';
  const displayPhoto = fotoPerfilUrl ?? usuario?.fotoPerfilUrl ?? '';
  const resolvedPhoto = getPublicAssetUrl(displayPhoto);
  const mostrarFoto = Boolean(resolvedPhoto) && !imagenFallida;

  return (
    <div
      className={className}
      title={title || displayName || undefined}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        flexShrink: 0,
        overflow: 'hidden',
        // Con foto se usa un fondo neutro: los colores de acento (naranja, azul...)
        // se transparentaban a traves de los PNG y se veian mal.
        background: mostrarFoto ? 'var(--color-surface-3)' : background,
        border: `1.5px solid ${mostrarFoto ? 'var(--color-border)' : borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '900',
        fontSize,
        color,
        boxShadow: shadow,
      }}
    >
      {mostrarFoto ? (
        <img
          src={resolvedPhoto}
          alt={displayName || 'Usuario'}
          // Si la URL esta rota se cae a las iniciales en vez de dejar el hueco vacio
          onError={() => setImagenFallida(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        getInitials(displayName)
      )}
    </div>
  );
};

export default UserAvatar;
