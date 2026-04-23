const UNIT_TYPE_LABELS = {
  piece: "Piece",
  dozen: "Dozen",
  set: "Set",
  kg: "Kg",
  gram: "Gram",
  liter: "Liter",
  litre: "Litre",
  ml: "Ml",
  box: "Box",
  pair: "Pair",
  foot: "Foot",
  inch: "Inch",
  packet: "Packet",
  bundle: "Bundle",
  roll: "Roll",
};

export const UNIT_TYPE_OPTIONS = Object.entries(UNIT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function formatUnitLabel(unitType) {
  const normalized = String(unitType || "piece").toLowerCase();
  return UNIT_TYPE_LABELS[normalized] || UNIT_TYPE_LABELS.piece;
}
