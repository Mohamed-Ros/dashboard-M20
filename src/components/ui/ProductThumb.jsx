import React from 'react';

const SIZES = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

/**
 * ProductThumb: the only way a product photo appears in lists, tables and rows.
 * Photos fill the square edge to edge (no inner padding or frame) on the photo-grey ground,
 * so studio backgrounds never read as a "picture inside a box".
 * size: xs 32 | sm 40 | md 48 | lg 64 | xl 96
 */
export default function ProductThumb({ src, alt = '', size = 'md', className = '' }) {
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden rounded-control bg-photo ${SIZES[size]} ${className}`}>
      <img
        src={src || '/img/product.png'}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/img/product.png';
        }}
      />
    </span>
  );
}
