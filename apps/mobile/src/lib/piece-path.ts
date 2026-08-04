import type { PuzzlePieceShape } from "@puzzled/puzzle-engine";

export function piecePath(shape: PuzzlePieceShape, size: number, margin: number) {
  const x = margin;
  const y = margin;
  const bump = size * 0.22;
  const edge = (kind: "top" | "right" | "bottom" | "left") => {
    const value = shape[kind];
    const direction = value === "tab" ? 1 : value === "blank" ? -1 : 0;
    if (kind === "top") {
      if (!direction) return `L ${x + size} ${y}`;
      return `L ${x + size * 0.32} ${y} C ${x + size * 0.34} ${y - bump * direction} ${x + size * 0.66} ${y - bump * direction} ${x + size * 0.68} ${y} L ${x + size} ${y}`;
    }
    if (kind === "right") {
      if (!direction) return `L ${x + size} ${y + size}`;
      return `L ${x + size} ${y + size * 0.32} C ${x + size + bump * direction} ${y + size * 0.34} ${x + size + bump * direction} ${y + size * 0.66} ${x + size} ${y + size * 0.68} L ${x + size} ${y + size}`;
    }
    if (kind === "bottom") {
      if (!direction) return `L ${x} ${y + size}`;
      return `L ${x + size * 0.68} ${y + size} C ${x + size * 0.66} ${y + size + bump * direction} ${x + size * 0.34} ${y + size + bump * direction} ${x + size * 0.32} ${y + size} L ${x} ${y + size}`;
    }
    if (!direction) return `L ${x} ${y}`;
    return `L ${x} ${y + size * 0.68} C ${x - bump * direction} ${y + size * 0.66} ${x - bump * direction} ${y + size * 0.34} ${x} ${y + size * 0.32} L ${x} ${y}`;
  };
  return `M ${x} ${y} ${edge("top")} ${edge("right")} ${edge("bottom")} ${edge("left")} Z`;
}
