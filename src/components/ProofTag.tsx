interface ProofTagProps {
  location: string;
  date?: string;
  position?: "bottom-left" | "bottom-right";
}

export default function ProofTag({
  location,
  date,
  position = "bottom-left",
}: ProofTagProps) {
  const positionClasses =
    position === "bottom-left"
      ? "bottom-3 left-3"
      : "bottom-3 right-3";

  const text = date ? `${location} — ${date}` : location;

  return (
    <span
      className={`absolute ${positionClasses} z-10 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80`}
      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}
