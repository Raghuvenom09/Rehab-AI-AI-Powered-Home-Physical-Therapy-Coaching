const SkeletonWireframe = ({ className = "" }: { className?: string }) => {
  // Human pose joint positions (normalized 0-100 coordinate system)
  const joints = {
    head: { x: 50, y: 8 },
    neck: { x: 50, y: 16 },
    leftShoulder: { x: 36, y: 22 },
    rightShoulder: { x: 64, y: 22 },
    leftElbow: { x: 26, y: 36 },
    rightElbow: { x: 74, y: 36 },
    leftWrist: { x: 22, y: 50 },
    rightWrist: { x: 78, y: 50 },
    hip: { x: 50, y: 52 },
    leftHip: { x: 42, y: 52 },
    rightHip: { x: 58, y: 52 },
    leftKnee: { x: 38, y: 72 },
    rightKnee: { x: 62, y: 72 },
    leftAnkle: { x: 36, y: 92 },
    rightAnkle: { x: 64, y: 92 },
  };

  const bones: [keyof typeof joints, keyof typeof joints][] = [
    ["head", "neck"],
    ["neck", "leftShoulder"],
    ["neck", "rightShoulder"],
    ["leftShoulder", "leftElbow"],
    ["rightShoulder", "rightElbow"],
    ["leftElbow", "leftWrist"],
    ["rightElbow", "rightWrist"],
    ["neck", "hip"],
    ["hip", "leftHip"],
    ["hip", "rightHip"],
    ["leftHip", "leftKnee"],
    ["rightHip", "rightKnee"],
    ["leftKnee", "leftAnkle"],
    ["rightKnee", "rightAnkle"],
  ];

  const keyJoints: (keyof typeof joints)[] = [
    "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
    "leftHip", "rightHip", "leftKnee", "rightKnee",
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bone connections */}
      {bones.map(([from, to], i) => (
        <line
          key={i}
          x1={joints[from].x}
          y1={joints[from].y}
          x2={joints[to].x}
          y2={joints[to].y}
          stroke="hsl(185 100% 55%)"
          strokeWidth="0.6"
          strokeLinecap="round"
          style={{
            animation: `line-glow 2s cubic-bezier(0.4, 0, 0.6, 1) ${i * 0.1}s infinite`,
          }}
        />
      ))}

      {/* All joint markers */}
      {Object.entries(joints).map(([name, pos]) => (
        <circle
          key={name}
          cx={pos.x}
          cy={pos.y}
          r={keyJoints.includes(name as keyof typeof joints) ? 2 : 1.5}
          fill={keyJoints.includes(name as keyof typeof joints) ? "hsl(185 100% 55%)" : "hsl(185 100% 55% / 0.5)"}
          style={
            keyJoints.includes(name as keyof typeof joints)
              ? { animation: `joint-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) ${Math.random() * 2}s infinite` }
              : undefined
          }
        />
      ))}

      {/* Head circle */}
      <circle
        cx={joints.head.x}
        cy={joints.head.y}
        r="4"
        fill="none"
        stroke="hsl(185 100% 55%)"
        strokeWidth="0.6"
        style={{ animation: "line-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
      />
    </svg>
  );
};

export default SkeletonWireframe;
