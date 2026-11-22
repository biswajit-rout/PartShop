import React from "react";

export default function LiquidBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Cyan/Sky Fluid Glow Orb */}
      <div className="absolute -top-[18%] -left-[10%] w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-sky-500/20 via-cyan-400/15 to-blue-600/25 blur-[120px] animate-pulse [animation-duration:9s]" />

      {/* Deep Indigo/Violet Glow Orb */}
      <div className="absolute top-[28%] -right-[15%] w-[620px] h-[620px] rounded-full bg-gradient-to-br from-indigo-500/18 via-purple-600/15 to-pink-500/10 blur-[140px] animate-pulse [animation-duration:13s]" />

      {/* Emerald Neon Orb */}
      <div className="absolute -bottom-[20%] left-[25%] w-[580px] h-[580px] rounded-full bg-gradient-to-t from-emerald-500/15 via-teal-400/12 to-transparent blur-[130px] animate-pulse [animation-duration:11s]" />

      {/* Subtle Refractive Optical Mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_10%,#000_60%,transparent_100%)] opacity-80" />
    </div>
  );
}
