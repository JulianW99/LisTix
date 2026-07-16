import { pool } from "../db/pool.js";

const round = (value) => Math.round(value * 10) / 10;
const pointOnEllipse = (cx, cy, rx, ry, angle) => [round(cx + Math.cos(angle) * rx), round(cy + Math.sin(angle) * ry)];
const templateNames = ["halo_bowl", "end_stage", "compact_dome", "sports_arena"];
const palette = ["#34d6c2", "#6f8cff", "#a979ff", "#f174a6", "#f2b95f", "#4bbce8"];
const normalizeTemplate = (value) => templateNames.includes(String(value)) ? String(value) : value === "sports" ? "sports_arena" : "halo_bowl";
const baseArea = (id, label, points, index) => ({ id, seatSectionId: null, label, points, fill: palette[index % palette.length], hidden: false });

const ellipseAreas = ({ count, cx = 500, cy = 330, outerX, outerY, innerX, innerY, start = -Math.PI / 2, sweep = Math.PI * 2, prefix = "H" }) => {
  const gap = Math.PI / 360 * 1.8;
  return Array.from({ length: count }, (_, index) => {
    const from = start + index * sweep / count + gap;
    const to = start + (index + 1) * sweep / count - gap;
    return baseArea(`${prefix.toLowerCase()}-${index + 1}`, `${prefix}${String(index + 1).padStart(2, "0")}`, [
      pointOnEllipse(cx, cy, outerX, outerY, from), pointOnEllipse(cx, cy, outerX, outerY, to),
      pointOnEllipse(cx, cy, innerX, innerY, to), pointOnEllipse(cx, cy, innerX, innerY, from),
    ], index);
  });
};

const angularAreas = (prefix = "A") => {
  const areas = [];
  const horizontalCount = 9; const horizontalWidth = 720 / horizontalCount;
  for (let index = 0; index < horizontalCount; index += 1) {
    const x = 140 + index * horizontalWidth;
    areas.push(baseArea(`${prefix}-north-${index + 1}`, `N${index + 1}`, [[round(x), 55], [round(x + horizontalWidth - 5), 55], [round(x + horizontalWidth - 12), 174], [round(x + 7), 174]], areas.length));
    areas.push(baseArea(`${prefix}-south-${index + 1}`, `S${index + 1}`, [[round(x + 7), 486], [round(x + horizontalWidth - 12), 486], [round(x + horizontalWidth - 5), 605], [round(x), 605]], areas.length));
  }
  const verticalCount = 4; const verticalHeight = 292 / verticalCount;
  for (let index = 0; index < verticalCount; index += 1) {
    const y = 184 + index * verticalHeight;
    areas.push(baseArea(`${prefix}-west-${index + 1}`, `W${index + 1}`, [[55, round(y)], [128, round(y + 6)], [128, round(y + verticalHeight - 6)], [55, round(y + verticalHeight)]], areas.length));
    areas.push(baseArea(`${prefix}-east-${index + 1}`, `E${index + 1}`, [[872, round(y + 6)], [945, round(y)], [945, round(y + verticalHeight)], [872, round(y + verticalHeight - 6)]], areas.length));
  }
  return areas;
};

const octagonalAreas = (prefix = "D") => {
  const cx = 500; const cy = 330; const segmentsPerSide = 3;
  const vertices = (rx, ry) => Array.from({ length: 8 }, (_, index) => pointOnEllipse(cx, cy, rx, ry, -Math.PI * .625 + index * Math.PI / 4));
  const outer = vertices(442, 286); const inner = vertices(305, 184);
  const interpolate = (from, to, ratio) => [round(from[0] + (to[0] - from[0]) * ratio), round(from[1] + (to[1] - from[1]) * ratio)];
  const areas = [];
  for (let side = 0; side < 8; side += 1) {
    const next = (side + 1) % 8;
    for (let part = 0; part < segmentsPerSide; part += 1) {
      const from = part / segmentsPerSide + .008; const to = (part + 1) / segmentsPerSide - .008;
      areas.push(baseArea(`${prefix.toLowerCase()}-${side + 1}-${part + 1}`, `${prefix}${areas.length + 1}`, [
        interpolate(outer[side], outer[next], from), interpolate(outer[side], outer[next], to),
        interpolate(inner[side], inner[next], to), interpolate(inner[side], inner[next], from),
      ], areas.length));
    }
  }
  return areas;
};

const linkSeatSections = (areas, seatSections) => {
  const linked = areas.map((area) => ({ ...area }));
  seatSections.forEach((section, index) => {
    const slot = Math.floor(index * linked.length / Math.max(1, seatSections.length));
    linked[slot] = { ...linked[slot], seatSectionId: Number(section.id), label: section.name };
  });
  return linked;
};

export const generateDefaultVenueLayout = (seatSections = [], requestedTemplate = "halo_bowl") => {
  const template = normalizeTemplate(requestedTemplate);
  let areas; let floor; let stage; let kind = "concert";
  if (template === "end_stage") {
    areas = ellipseAreas({ count: 26, cx: 500, cy: 360, outerX: 450, outerY: 285, innerX: 310, innerY: 185, start: Math.PI * .68, sweep: Math.PI * 1.64, prefix: "F" });
    floor = { x: 330, y: 205, width: 340, height: 270, label: "AUDIENCE FLOOR" };
    stage = { x: 370, y: 520, width: 260, height: 70, label: "END STAGE" };
  } else if (template === "compact_dome") {
    areas = octagonalAreas("D");
    floor = { x: 230, y: 205, width: 540, height: 250, label: "ARENA FLOOR" };
    stage = { x: 430, y: 235, width: 140, height: 90, label: "ISLAND STAGE" };
  } else if (template === "sports_arena") {
    areas = angularAreas("sport"); kind = "sports";
    floor = { x: 235, y: 202, width: 530, height: 256, label: "PLAYING FIELD" };
    stage = null;
  } else {
    areas = ellipseAreas({ count: 30, outerX: 452, outerY: 292, innerX: 326, innerY: 194, prefix: "H" });
    floor = { x: 342, y: 193, width: 420, height: 274, label: "LIVE FLOOR" };
    stage = { x: 240, y: 250, width: 138, height: 160, label: "SIDE STAGE" };
  }
  return { version: 2, kind, template, canvas: { width: 1000, height: 660 }, floor, stage, areas: linkSeatSections(areas, seatSections) };
};

const finite = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const cleanLabel = (value, fallback) => String(value || fallback).trim().slice(0, 80);
const cleanFill = (value) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : palette[0];

const sanitizeLayout = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Object.assign(new Error("A venue map layout is required."), { statusCode: 400 });
  const width = finite(input.canvas?.width, 1000, 600, 1600);
  const height = finite(input.canvas?.height, 660, 400, 1200);
  const cleanBox = (box, defaults) => box === null ? null : ({
    x: finite(box?.x, defaults.x, 0, width), y: finite(box?.y, defaults.y, 0, height),
    width: finite(box?.width, defaults.width, 30, width), height: finite(box?.height, defaults.height, 30, height),
    label: cleanLabel(box?.label, defaults.label),
  });
  if (!Array.isArray(input.areas) || input.areas.length < 1 || input.areas.length > 200) throw Object.assign(new Error("A venue map must contain between 1 and 200 areas."), { statusCode: 400 });
  const ids = new Set();
  const areas = input.areas.map((area, index) => {
    const id = String(area?.id || `area-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
    if (ids.has(id)) throw Object.assign(new Error("Venue map area IDs must be unique."), { statusCode: 400 });
    ids.add(id);
    if (!Array.isArray(area?.points) || area.points.length < 3 || area.points.length > 12) throw Object.assign(new Error(`Area ${index + 1} needs between 3 and 12 polygon points.`), { statusCode: 400 });
    const points = area.points.map((point) => {
      if (!Array.isArray(point) || point.length !== 2) throw Object.assign(new Error(`Area ${index + 1} contains an invalid point.`), { statusCode: 400 });
      return [finite(point[0], 0, 0, width), finite(point[1], 0, 0, height)];
    });
    const seatSectionId = area.seatSectionId === null || area.seatSectionId === undefined || area.seatSectionId === "" ? null : Number(area.seatSectionId);
    if (seatSectionId !== null && (!Number.isInteger(seatSectionId) || seatSectionId < 1)) throw Object.assign(new Error(`Area ${index + 1} has an invalid seat section.`), { statusCode: 400 });
    return { id, seatSectionId, label: cleanLabel(area.label, `Area ${index + 1}`), points, fill: cleanFill(area.fill), hidden: Boolean(area.hidden) };
  });
  return {
    version: 2,
    kind: input.kind === "sports" ? "sports" : "concert",
    template: normalizeTemplate(input.template || input.kind),
    canvas: { width, height },
    floor: cleanBox(input.floor, { x: 325, y: 190, width: 445, height: 280, label: "FLOOR / STANDING" }),
    stage: input.stage === null ? null : cleanBox(input.stage, { x: 265, y: 247, width: 150, height: 166, label: "STAGE" }),
    areas,
  };
};

const getSeatSections = async (venueIds) => {
  if (!venueIds.length) return new Map();
  const result = await pool.query(`
    SELECT id, venue_id, name, row_label, seat_label
    FROM seat_sections WHERE venue_id = ANY($1::int[]) ORDER BY venue_id, name, row_label
  `, [venueIds]);
  return result.rows.reduce((map, row) => {
    const venueId = Number(row.venue_id);
    if (!map.has(venueId)) map.set(venueId, []);
    map.get(venueId).push({ id: Number(row.id), name: row.name, rowLabel: row.row_label, seatLabel: row.seat_label });
    return map;
  }, new Map());
};

const mapVenue = (venue, row, sections) => ({
  id: row ? Number(row.id) : null,
  venueId: Number(venue.id), venue: venue.name, city: venue.city, country: venue.country,
  name: row?.name || `${venue.name} seating map`, isPublished: row ? Boolean(row.is_published) : true,
  isPersisted: Boolean(row), updatedAt: row?.updated_at || null, seatSections: sections,
  layout: row?.layout && Number(row.layout.version) >= 2 && Array.isArray(row.layout.areas)
    ? { ...row.layout, version: 2, template: normalizeTemplate(row.layout.template || row.layout.kind) }
    : generateDefaultVenueLayout(sections),
});

export const listVenueMaps = async () => {
  const [venuesResult, mapsResult] = await Promise.all([
    pool.query("SELECT id, name, city, country FROM venues ORDER BY name, city"),
    pool.query("SELECT id, venue_id, name, layout, is_published, updated_at FROM venue_maps"),
  ]);
  const venueIds = venuesResult.rows.map((row) => Number(row.id));
  const sections = await getSeatSections(venueIds);
  const maps = new Map(mapsResult.rows.map((row) => [Number(row.venue_id), row]));
  return venuesResult.rows.map((venue) => mapVenue(venue, maps.get(Number(venue.id)), sections.get(Number(venue.id)) || []));
};

export const previewVenueMap = async (venueId, template) => {
  const venueResult = await pool.query("SELECT id, name, city, country FROM venues WHERE id = $1 LIMIT 1", [Number(venueId)]);
  if (!venueResult.rows[0]) return null;
  const sections = (await getSeatSections([Number(venueId)])).get(Number(venueId)) || [];
  return { ...mapVenue(venueResult.rows[0], null, sections), layout: generateDefaultVenueLayout(sections, template) };
};

export const saveVenueMap = async (venueId, payload, actorUserId) => {
  const numericVenueId = Number(venueId);
  const venueResult = await pool.query("SELECT id FROM venues WHERE id = $1 LIMIT 1", [numericVenueId]);
  if (!venueResult.rows[0]) return null;
  const layout = sanitizeLayout(payload?.layout);
  const linkedIds = [...new Set(layout.areas.map((area) => area.seatSectionId).filter(Boolean))];
  if (linkedIds.length) {
    const sectionResult = await pool.query("SELECT COUNT(*)::int AS count FROM seat_sections WHERE venue_id = $1 AND id = ANY($2::int[])", [numericVenueId, linkedIds]);
    if (Number(sectionResult.rows[0].count) !== linkedIds.length) throw Object.assign(new Error("One or more linked sections do not belong to this venue."), { statusCode: 400 });
  }
  await pool.query(`
    INSERT INTO venue_maps (venue_id, name, layout, is_published, created_by_user_id, updated_by_user_id)
    VALUES ($1, $2, $3::jsonb, $4, $5, $5)
    ON CONFLICT (venue_id) DO UPDATE SET
      name = EXCLUDED.name, layout = EXCLUDED.layout, is_published = EXCLUDED.is_published,
      updated_by_user_id = EXCLUDED.updated_by_user_id, updated_at = NOW()
  `, [numericVenueId, cleanLabel(payload?.name, "Venue seating map"), JSON.stringify(layout), payload?.isPublished !== false, actorUserId]);
  return (await listVenueMaps()).find((item) => item.venueId === numericVenueId) || null;
};

export const getPublicVenueMaps = async (venueIds) => {
  const ids = [...new Set(venueIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return new Map();
  const [venuesResult, mapsResult, sections] = await Promise.all([
    pool.query("SELECT id, name, city, country FROM venues WHERE id = ANY($1::int[])", [ids]),
    pool.query("SELECT id, venue_id, name, layout, is_published, updated_at FROM venue_maps WHERE venue_id = ANY($1::int[])", [ids]),
    getSeatSections(ids),
  ]);
  const maps = new Map(mapsResult.rows.map((row) => [Number(row.venue_id), row]));
  return new Map(venuesResult.rows.map((venue) => {
    const stored = maps.get(Number(venue.id));
    if (stored && !stored.is_published) return [Number(venue.id), null];
    const mapped = mapVenue(venue, stored, sections.get(Number(venue.id)) || []);
    return [mapped.venueId, { id: mapped.id, name: mapped.name, layout: mapped.layout }];
  }));
};
