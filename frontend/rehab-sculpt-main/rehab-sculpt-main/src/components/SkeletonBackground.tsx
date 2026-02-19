const SkeletonBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <svg
        viewBox="0 0 400 700"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[80vh] w-auto"
        style={{ opacity: 0.06 }}
      >
        <g
          stroke="hsl(var(--primary))"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Head */}
          <circle cx="200" cy="60" r="22">
            <animate attributeName="cy" values="60;57;60" dur="6s" repeatCount="indefinite" />
          </circle>

          {/* Neck */}
          <line x1="200" y1="82" x2="200" y2="110">
            <animate attributeName="y1" values="82;79;82" dur="6s" repeatCount="indefinite" />
          </line>

          {/* Spine */}
          <line x1="200" y1="110" x2="200" y2="300">
            <animate attributeName="y2" values="300;297;300" dur="6s" repeatCount="indefinite" />
          </line>

          {/* Left Shoulder */}
          <line x1="200" y1="130" x2="140" y2="140">
            <animate attributeName="y2" values="140;137;140" dur="6s" repeatCount="indefinite" />
          </line>
          {/* Left Upper Arm */}
          <line x1="140" y1="140" x2="120" y2="210">
            <animate attributeName="y1" values="140;137;140" dur="6s" repeatCount="indefinite" />
          </line>
          {/* Left Forearm */}
          <line x1="120" y1="210" x2="110" y2="280" />

          {/* Right Shoulder */}
          <line x1="200" y1="130" x2="260" y2="140">
            <animate attributeName="y2" values="140;137;140" dur="6s" repeatCount="indefinite" />
          </line>
          {/* Right Upper Arm */}
          <line x1="260" y1="140" x2="280" y2="210">
            <animate attributeName="y1" values="140;137;140" dur="6s" repeatCount="indefinite" />
          </line>
          {/* Right Forearm */}
          <line x1="280" y1="210" x2="290" y2="280" />

          {/* Pelvis */}
          <line x1="170" y1="300" x2="230" y2="300">
            <animate attributeName="y1" values="300;297;300" dur="6s" repeatCount="indefinite" />
            <animate attributeName="y2" values="300;297;300" dur="6s" repeatCount="indefinite" />
          </line>

          {/* Left Thigh */}
          <line x1="170" y1="300" x2="160" y2="420">
            <animate attributeName="y1" values="300;297;300" dur="6s" repeatCount="indefinite" />
          </line>
          {/* Left Shin */}
          <line x1="160" y1="420" x2="155" y2="540" />
          {/* Left Foot */}
          <line x1="155" y1="540" x2="135" y2="555" />

          {/* Right Thigh */}
          <line x1="230" y1="300" x2="240" y2="420">
            <animate attributeName="y1" values="300;297;300" dur="6s" repeatCount="indefinite" />
          </line>
          {/* Right Shin */}
          <line x1="240" y1="420" x2="245" y2="540" />
          {/* Right Foot */}
          <line x1="245" y1="540" x2="265" y2="555" />

          {/* Ribcage hints */}
          <path d="M175 150 Q200 160 225 150">
            <animate attributeName="d" values="M175 150 Q200 160 225 150;M175 147 Q200 157 225 147;M175 150 Q200 160 225 150" dur="6s" repeatCount="indefinite" />
          </path>
          <path d="M170 180 Q200 192 230 180">
            <animate attributeName="d" values="M170 180 Q200 192 230 180;M170 177 Q200 189 230 177;M170 180 Q200 192 230 180" dur="6s" repeatCount="indefinite" />
          </path>
          <path d="M172 210 Q200 220 228 210" />

          {/* Joint dots */}
          {[
            [200, 60], [200, 130], [140, 140], [120, 210], [110, 280],
            [260, 140], [280, 210], [290, 280], [170, 300], [230, 300],
            [160, 420], [155, 540], [240, 420], [245, 540],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="3"
              fill="hsl(var(--primary))"
              stroke="none"
              opacity="0.5"
            >
              <animate
                attributeName="opacity"
                values="0.3;0.6;0.3"
                dur={`${4 + (i % 3)}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default SkeletonBackground;
