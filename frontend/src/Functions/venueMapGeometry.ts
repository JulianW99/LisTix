import type { VenueMapArea, VenueMapLayout } from "../types";

export type SmartPlacementMode = "auto" | "clockwise" | "counterclockwise";
type Point = [number, number];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const pointDistance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const normalizedAngle = (angle: number) => {
  let result = angle;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
};

export const venueAreaCenter = (area: Pick<VenueMapArea, "points">) => ({
  x: area.points.reduce((sum, point) => sum + point[0], 0) / area.points.length,
  y: area.points.reduce((sum, point) => sum + point[1], 0) / area.points.length,
});

const rotate = (point: Point, pivot: { x: number; y: number }, angle: number): Point => {
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  return [pivot.x + (point[0] - pivot.x) * cos - (point[1] - pivot.y) * sin, pivot.y + (point[0] - pivot.x) * sin + (point[1] - pivot.y) * cos];
};
const bounds = (points: Point[]) => {
  const xs = points.map(([x]) => x); const ys = points.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
};
const overlapRatio = (first: Point[], second: Point[]) => {
  const a = bounds(first); const b = bounds(second);
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const intersection = width * height;
  const firstArea = Math.max(1, (a.right - a.left) * (a.bottom - a.top));
  return intersection / firstArea;
};
const inBox = (point: { x: number; y: number }, box: VenueMapLayout["floor"] | VenueMapLayout["stage"]) => Boolean(box && point.x > box.x && point.x < box.x + box.width && point.y > box.y && point.y < box.y + box.height);

const typicalSpacing = (layout: VenueMapLayout, reference: VenueMapArea) => {
  const origin = venueAreaCenter(reference);
  const nearest = layout.areas.filter((area) => area.id !== reference.id && !area.hidden).map((area) => Math.hypot(venueAreaCenter(area).x - origin.x, venueAreaCenter(area).y - origin.y)).sort((a, b) => a - b).slice(0, 4);
  return median(nearest) || 75;
};

const edgeCandidate = (layout: VenueMapLayout, reference: VenueMapArea, edgeIndex: number) => {
  const points = reference.points;
  const count = points.length;
  const start = points[edgeIndex]; const end = points[(edgeIndex + 1) % count];
  const before = points[(edgeIndex - 1 + count) % count]; const after = points[(edgeIndex + 2) % count];
  const raw: Point[] = [
    start,
    [start[0] + start[0] - before[0], start[1] + start[1] - before[1]],
    [end[0] + end[0] - after[0], end[1] + end[1] - after[1]],
    end,
  ];
  const origin = venueAreaCenter(reference); const rawCenter = venueAreaCenter({ points: raw });
  const rawSpacing = Math.max(1, Math.hypot(rawCenter.x - origin.x, rawCenter.y - origin.y));
  const scale = clamp(typicalSpacing(layout, reference) / rawSpacing, .72, 1.28);
  raw[1] = [start[0] + (raw[1][0] - start[0]) * scale, start[1] + (raw[1][1] - start[1]) * scale];
  raw[2] = [end[0] + (raw[2][0] - end[0]) * scale, end[1] + (raw[2][1] - end[1]) * scale];

  const stadiumCenter = { x: layout.canvas.width / 2, y: layout.canvas.height / 2 };
  const scaledCenter = venueAreaCenter({ points: raw });
  const angularDelta = normalizedAngle(Math.atan2(scaledCenter.y - stadiumCenter.y, scaledCenter.x - stadiumCenter.x) - Math.atan2(origin.y - stadiumCenter.y, origin.x - stadiumCenter.x));
  if (layout.template === "halo_bowl" || layout.template === "end_stage") {
    const curve = Math.sign(angularDelta || 1) * Math.min(Math.abs(angularDelta) * .42, Math.PI / 18);
    const sharedCenter = { x: (start[0] + end[0]) / 2, y: (start[1] + end[1]) / 2 };
    raw[1] = rotate(raw[1], sharedCenter, curve); raw[2] = rotate(raw[2], sharedCenter, curve);
  }
  return { points: raw, angularDelta };
};

const scoreCandidate = (layout: VenueMapLayout, reference: VenueMapArea, candidate: ReturnType<typeof edgeCandidate>, mode: SmartPlacementMode) => {
  const referenceCenter = venueAreaCenter(reference); const center = venueAreaCenter({ points: candidate.points });
  const stadiumCenter = { x: layout.canvas.width / 2, y: layout.canvas.height / 2 };
  const radialChange = Math.abs(Math.hypot(center.x - stadiumCenter.x, center.y - stadiumCenter.y) - Math.hypot(referenceCenter.x - stadiumCenter.x, referenceCenter.y - stadiumCenter.y));
  const collisions = layout.areas.filter((area) => area.id !== reference.id && !area.hidden).reduce((sum, area) => sum + overlapRatio(candidate.points, area.points), 0);
  const candidateBounds = bounds(candidate.points);
  const overflow = Math.max(0, -candidateBounds.left) + Math.max(0, candidateBounds.right - layout.canvas.width) + Math.max(0, -candidateBounds.top) + Math.max(0, candidateBounds.bottom - layout.canvas.height);
  const nearest = Math.min(...layout.areas.filter((area) => area.id !== reference.id && !area.hidden).map((area) => {
    const other = venueAreaCenter(area); return Math.hypot(center.x - other.x, center.y - other.y);
  }), 120);
  const wrongDirection = mode === "clockwise" && candidate.angularDelta <= .001 || mode === "counterclockwise" && candidate.angularDelta >= -.001;
  const contentCollision = inBox(center, layout.floor) || inBox(center, layout.stage);
  return nearest - radialChange * 1.45 - collisions * 900 - overflow * 8 - (wrongDirection ? 1000 : 0) - (contentCollision ? 450 : 0);
};

export const createAttachedGeometry = (layout: VenueMapLayout, reference: VenueMapArea, mode: SmartPlacementMode = "auto"): Point[] => {
  if (reference.points.length < 3) return reference.points;
  const candidates = reference.points.map((_, edgeIndex) => edgeCandidate(layout, reference, edgeIndex));
  return candidates.sort((a, b) => scoreCandidate(layout, reference, b, mode) - scoreCandidate(layout, reference, a, mode))[0]?.points ?? reference.points;
};

export const splitVenueArea = (area: VenueMapArea): [VenueMapArea["points"], VenueMapArea["points"]] | null => {
  if (area.points.length !== 4) return null;
  const [a, b, c, d] = area.points;
  const outer: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const inner: Point = [(d[0] + c[0]) / 2, (d[1] + c[1]) / 2];
  return [[a, outer, inner, d], [outer, b, c, inner]];
};
