import React, { useRef, useState } from 'react';

interface TouchControlsProps {
  onJoystickMove: (x: number, y: number) => void;
  onAction: (action: 'primary' | 'secondary' | 'aux') => void;
  primaryLabel?: string;
  showAux?: boolean;
  auxLabel?: string;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onJoystickMove,
  onAction,
  primaryLabel = 'Harakat',
  showAux = false,
  auxLabel = 'Almashtirish',
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 14;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    onJoystickMove(dx / maxR, -dy / maxR);
  };

  const resetStick = () => {
    activePointer.current = null;
    setKnob({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex items-end justify-between px-5 sm:px-8">
      {/* Virtual Joystick */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          activePointer.current = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointer.current === e.pointerId) {
            updateStick(e.clientX, e.clientY);
          }
        }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        className="pointer-events-auto relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/25 bg-[#070B14]/75 touch-none select-none"
        aria-label="Virtual joystik"
      >
        <div
          className="h-11 w-11 rounded-full bg-blue-500 border-2 border-white/70 shadow-lg"
          style={{
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        />
      </div>

      {/* Action Touch Buttons */}
      <div className="pointer-events-auto flex items-center gap-3">
        {showAux && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onAction('aux');
            }}
            className="flex h-14 px-4 items-center justify-center rounded-2xl border border-white/20 bg-purple-600/90 active:scale-95 text-xs font-bold text-white shadow-lg touch-none"
          >
            {auxLabel}
          </button>
        )}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onAction('secondary');
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-slate-900/85 active:scale-95 text-xs font-bold text-white shadow-lg touch-none"
        >
          Sakrash
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onAction('primary');
          }}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-300/60 bg-orange-500/90 active:scale-95 text-xs font-bold text-white shadow-lg touch-none"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
};
