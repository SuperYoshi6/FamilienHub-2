import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo_bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6"/>
          <stop offset="1" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill="url(#logo_bg)"/>
      <path d="M256 112l-160 128v176h320v-176z" fill="none" stroke="white" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="256" cy="310" r="50" fill="#fbbf24"/>
    </svg>
  );
};

export default Logo;