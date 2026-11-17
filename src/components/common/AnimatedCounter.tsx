import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  highlightClassName?: string;
  showDelta?: boolean;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  className = '',
  highlightClassName = 'text-[#E11D48]',
  showDelta = true,
  suffix = '',
}) => {
  const prevRef = useRef<number>(value);
  const [pulseKey, setPulseKey] = useState(0);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    if (prevRef.current !== value) {
      const diff = value - prevRef.current;
      prevRef.current = value;
      setPulseKey((k) => k + 1);
      if (showDelta && diff !== 0) {
        setDelta(diff);
        const timer = setTimeout(() => setDelta(null), 1800);
        return () => clearTimeout(timer);
      }
    }
  }, [value, showDelta]);

  const isAnimating = delta !== null;

  return (
    <span className="inline-flex items-baseline gap-1.5 tabular-nums">
      <span
        key={pulseKey}
        className={`inline-block transition-colors duration-300 ${
          pulseKey > 0 ? 'animate-dlq-pop' : ''
        } ${isAnimating ? highlightClassName : ''} ${className}`}
      >
        {value.toLocaleString()}
        {suffix}
      </span>
      {delta !== null && (
        <span
          aria-live="polite"
          className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded animate-in fade-in duration-150 ${
            delta > 0
              ? 'bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]'
              : 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </span>
  );
};
