import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        width="64"
        height="64"
        rx="16"
        className="fill-zinc-950 dark:fill-zinc-50 transition-colors duration-200"
      />
      <circle
        cx="32"
        cy="32"
        r="14"
        className="stroke-white dark:stroke-zinc-950 transition-colors duration-200"
        strokeWidth="3.2"
      />
      <circle
        cx="32"
        cy="32"
        r="4.5"
        className="fill-white dark:fill-zinc-950 transition-colors duration-200"
      />
      <path
        d="M32 10V18M32 46V54M10 32H18M46 32H54"
        className="stroke-white dark:stroke-zinc-950 transition-colors duration-200"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
};
