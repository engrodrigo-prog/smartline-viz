import React from "react";

export const PrototypeBadge: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={
        "pointer-events-none fixed top-3 right-3 z-50 select-none " +
        (className ?? "")
      }
    >
      <div
        className="rotate-2 bg-yellow-300/95 text-slate-900 shadow-xl border border-yellow-500/60 px-3 py-1 rounded-sm text-xs font-semibold"
        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}
      >
        Em desenvolvimento · protótipo
      </div>
    </div>
  );
};

export default PrototypeBadge;

