import React from 'react';

interface SculpturalOrbProps {
  className?: string;
  size?: number;
}

export const SculpturalOrb: React.FC<SculpturalOrbProps> = ({ className = '', size = 160 }) => {
  return (
    <div
      className={`relative inline-block select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_25px_rgba(110,65,30,0.18)]"
      >
        <defs>
          {/* Shadow underneath */}
          <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3C210E" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#5E381C" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#7E522C" stopOpacity="0" />
          </radialGradient>

          {/* Outer Beveled Rhombus Gradients */}
          <linearGradient id="frameTop" x1="50" y1="20" x2="160" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5DFCA" />
            <stop offset="60%" stopColor="#DFBFA2" />
            <stop offset="100%" stopColor="#B38D6D" />
          </linearGradient>

          <linearGradient id="frameLeft" x1="20" y1="95" x2="100" y2="175" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C9A380" />
            <stop offset="70%" stopColor="#8A6342" />
            <stop offset="100%" stopColor="#634127" />
          </linearGradient>

          <linearGradient id="frameRight" x1="175" y1="95" x2="100" y2="175" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#966C49" />
            <stop offset="70%" stopColor="#6D4A2F" />
            <stop offset="100%" stopColor="#4A2D19" />
          </linearGradient>

          <linearGradient id="frameInnerBevel" x1="100" y1="40" x2="100" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#54331C" />
            <stop offset="100%" stopColor="#311B0C" />
          </linearGradient>

          {/* Sphere Gradients */}
          <radialGradient id="sphereGradient" cx="38%" cy="34%" r="65%">
            <stop offset="0%" stopColor="#FFF9EB" />
            <stop offset="25%" stopColor="#F5D09D" />
            <stop offset="60%" stopColor="#C88B4E" />
            <stop offset="85%" stopColor="#8F5424" />
            <stop offset="100%" stopColor="#4D270C" />
          </radialGradient>

          <radialGradient id="sphereSpecular" cx="35%" cy="32%" r="20%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#FFF2D6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFE0AA" stopOpacity="0" />
          </radialGradient>

          {/* Sphere Ground Reflected Light */}
          <radialGradient id="sphereBounceLight" cx="60%" cy="85%" r="35%">
            <stop offset="0%" stopColor="#E2A66C" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#8A4E26" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft cast shadow on ground */}
        <ellipse cx="100" cy="182" rx="68" ry="14" fill="url(#groundShadow)" />

        {/* Outer Rhomboid Frame (3D faceted diamond cube) */}
        {/* Outer frame perimeter */}
        <polygon points="100,18 182,100 100,182 18,100" fill="url(#frameLeft)" />
        
        {/* Top facet highlight */}
        <polygon points="100,18 182,100 152,100 100,48" fill="url(#frameTop)" />
        
        {/* Right facet shadow */}
        <polygon points="182,100 100,182 100,152 152,100" fill="url(#frameRight)" />

        {/* Inner Cutout Hole */}
        <polygon points="100,52 148,100 100,148 52,100" fill="url(#frameInnerBevel)" />

        {/* The Suspended Polished Golden Sphere */}
        <g className="transform-gpu transition-transform duration-700 ease-out hover:scale-105">
          <circle cx="100" cy="100" r="32" fill="url(#sphereGradient)" />
          {/* Ambient bounce light on bottom of sphere */}
          <circle cx="100" cy="100" r="32" fill="url(#sphereBounceLight)" />
          {/* High-intensity specular highlight */}
          <circle cx="100" cy="100" r="32" fill="url(#sphereSpecular)" />
        </g>

        {/* Front bevel rim of diamond frame */}
        <polygon points="52,100 100,148 100,182 18,100" fill="url(#frameLeft)" opacity="0.9" />
        <polygon points="100,148 148,100 182,100 100,182" fill="url(#frameRight)" opacity="0.95" />
      </svg>
    </div>
  );
};
