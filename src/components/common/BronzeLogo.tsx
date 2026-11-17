import React from 'react';

interface BronzeLogoProps {
  className?: string;
  size?: number;
}

export const BronzeLogo: React.FC<BronzeLogoProps> = ({ className = '', size = 28 }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_4px_rgba(100,50,20,0.25)]"
      >
        <defs>
          <linearGradient id="bronzeTopLeft" x1="50" y1="0" x2="10" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DFB286" />
            <stop offset="50%" stopColor="#C48450" />
            <stop offset="100%" stopColor="#8A4E26" />
          </linearGradient>
          <linearGradient id="bronzeTopRight" x1="50" y1="0" x2="90" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5D5B2" />
            <stop offset="40%" stopColor="#DF9F6C" />
            <stop offset="100%" stopColor="#9C592C" />
          </linearGradient>
          <linearGradient id="bronzeBottomLeft" x1="10" y1="50" x2="50" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7E3F1A" />
            <stop offset="60%" stopColor="#58290E" />
            <stop offset="100%" stopColor="#3C1A07" />
          </linearGradient>
          <linearGradient id="bronzeBottomRight" x1="90" y1="50" x2="50" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#AA6434" />
            <stop offset="50%" stopColor="#7B3E18" />
            <stop offset="100%" stopColor="#4A210A" />
          </linearGradient>
          <radialGradient id="starCenterGleam" cx="50" cy="50" r="15" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF2E2" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#E6A672" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#9C592C" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 4-pointed faceted 3D diamond star */}
        {/* Top-Left Facet */}
        <polygon points="50,4 50,50 14,50" fill="url(#bronzeTopLeft)" />
        {/* Top-Right Facet */}
        <polygon points="50,4 86,50 50,50" fill="url(#bronzeTopRight)" />
        {/* Bottom-Left Facet */}
        <polygon points="14,50 50,50 50,96" fill="url(#bronzeBottomLeft)" />
        {/* Bottom-Right Facet */}
        <polygon points="50,50 86,50 50,96" fill="url(#bronzeBottomRight)" />

        {/* Center specular shine */}
        <circle cx="50" cy="50" r="14" fill="url(#starCenterGleam)" />
        
        {/* Central apex micro-star highlight */}
        <polygon points="50,44 51.5,48.5 56,50 51.5,51.5 50,56 48.5,51.5 44,50 48.5,48.5" fill="#FFFBF6" opacity="0.95" />
      </svg>
    </div>
  );
};
