import React from 'react';

const NexusFlowIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="nexusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <g transform="rotate(0 50 50)">
      <path
        d="M50,10 C77.61,10 100,32.39 100,60 C100,87.61 77.61,110 50,110 C22.39,110 0,87.61 0,60 C0,32.39 22.39,10 50,10 Z"
        transform="translate(0, -15) scale(1, 0.7)"
        fill="url(#nexusGradient)"
        opacity="0.3"
      >
        <animateTransform 
          attributeName="transform" 
          type="scale" 
          values="1,0.7; 1,0.6; 1,0.7" 
          begin="0s" 
          dur="5s" 
          repeatCount="indefinite" 
          additive="sum"
          transformOrigin="50 50"
        />
      </path>
      <path
        d="M20,50 C20,38.95 28.95,30 40,30 L60,30 C71.05,30 80,38.95 80,50 L80,50 C80,61.05 71.05,70 60,70 L40,70 C28.95,70 20,61.05 20,50 Z"
        stroke="url(#nexusGradient)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      >
        <animate
          attributeName="d"
          values="M20,50 C20,38.95 28.95,30 40,30 L60,30 C71.05,30 80,38.95 80,50 L80,50 C80,61.05 71.05,70 60,70 L40,70 C28.95,70 20,61.05 20,50 Z;
                  M20,50 C20,61.05 28.95,70 40,70 L60,70 C71.05,70 80,61.05 80,50 L80,50 C80,38.95 71.05,30 60,30 L40,30 C28.95,30 20,38.95 20,50 Z;
                  M20,50 C20,38.95 28.95,30 40,30 L60,30 C71.05,30 80,38.95 80,50 L80,50 C80,61.05 71.05,70 60,70 L40,70 C28.95,70 20,61.05 20,50 Z"
          dur="8s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  </svg>
);

export default NexusFlowIcon;

