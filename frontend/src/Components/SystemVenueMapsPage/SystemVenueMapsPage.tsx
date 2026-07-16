import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { api } from "../../api";
import { useApi } from "../../Context/ApiContext";
import { hasPermission } from "../../Functions/hasPermission";
import { createAttachedGeometry, splitVenueArea, venueAreaCenter, type SmartPlacementMode } from "../../Functions/venueMapGeometry";
import type { SystemVenueMap, VenueMapArea, VenueMapLayout, VenueMapTemplate } from "../../types";
import "./SystemVenueMapsPage.css";

const templateOptions: Array<{ value: VenueMapTemplate; name: string; description: string; icon: string }> = [
  { value: "halo_bowl", name: "Halo Bowl", description: "Oval 360-degree bowl with side stage", icon: "O" },
  { value: "end_stage", name: "End Stage", description: "Open fan facing a headline stage", icon: "U" },
  { value: "compact_dome", name: "Compact Dome", description: "Octagonal indoor arena with island stage", icon: "D" },
  { value: "sports_arena", name: "Sports Arena", description: "Four-sided bowl around a playing field", icon: "S" },
];
const areaPalette = ["#34d6c2", "#6f8cff", "#a979ff", "#f174a6", "#f2b95f", "#4bbce8"];
const cloneLayout = (layout: VenueMapLayout): VenueMapLayout => structuredClone(layout);
const polygonPoints = (area: Pick<VenueMapArea, "points">) => area.points.map((point) => point.join(",")).join(" ");
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (first: { x: number; y: number }, second: { x: number; y: number }) => Math.hypot(first.x - second.x, first.y - second.y);
const rotatePoints = (points: VenueMapArea["points"], pivot: { x: number; y: number }, degrees: number) => {
  const angle = degrees * Math.PI / 180; const cos = Math.cos(angle); const sin = Math.sin(angle);
  return points.map(([x, y]) => [pivot.x + (x - pivot.x) * cos - (y - pivot.y) * sin, pivot.y + (x - pivot.x) * sin + (y - pivot.y) * cos] as [number, number]);
};
const fitToCanvas = (points: VenueMapArea["points"], canvas: VenueMapLayout["canvas"]) => {
  const xs = points.map(([x]) => x); const ys = points.map(([, y]) => y); const padding = 16;
  const dx = Math.min(...xs) < padding ? padding - Math.min(...xs) : Math.max(...xs) > canvas.width - padding ? canvas.width - padding - Math.max(...xs) : 0;
  const dy = Math.min(...ys) < padding ? padding - Math.min(...ys) : Math.max(...ys) > canvas.height - padding ? canvas.height - padding - Math.max(...ys) : 0;
  return points.map(([x, y]) => [x + dx, y + dy] as [number, number]);
};

type DragState = { target: "area" | "stage" | "floor"; id?: string; x: number; y: number };

export function SystemVenueMapsPage() {
  const { user } = useApi();
  const canManage = hasPermission(user, "system.maps.manage");
  const [maps, setMaps] = useState<SystemVenueMap[]>([]);
  const [venueId, setVenueId] = useState<number | null>(null);
  const [draft, setDraft] = useState<VenueMapLayout | null>(null);
  const [mapName, setMapName] = useState("");
  const [published, setPublished] = useState(true);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [referenceImage, setReferenceImage] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [referenceOpacity, setReferenceOpacity] = useState(.42);
  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<VenueMapArea["points"]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.systemVenueMaps().then(({ items }) => { setMaps(items); setVenueId(items[0]?.venueId ?? null); }).catch((requestError) => setError(requestError.message));
  }, []);
  const current = maps.find((item) => item.venueId === venueId) ?? null;
  useEffect(() => {
    if (!current) return;
    setDraft(cloneLayout(current.layout)); setMapName(current.name); setPublished(current.isPublished); setSelectedAreaId(null); setMessage(""); setError(""); setReferenceImage(""); setReferenceName(""); setDrawing(false); setDrawPoints([]);
  }, [current?.venueId, current?.updatedAt, current?.isPersisted]);
  const selectedArea = draft?.areas.find((area) => area.id === selectedAreaId) ?? null;
  const linkedCount = draft?.areas.filter((area) => area.seatSectionId).length ?? 0;
  const unplacedSections = useMemo(() => current?.seatSections.filter((section) => !draft?.areas.some((area) => area.seatSectionId === section.id)) ?? [], [current, draft]);
  const activeTemplate = templateOptions.find((option) => option.value === draft?.template) ?? templateOptions[0];

  const canvasPosition = (clientX: number, clientY: number) => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: (clientX - rect.left) * (draft?.canvas.width ?? 1000) / rect.width, y: (clientY - rect.top) * (draft?.canvas.height ?? 660) / rect.height };
  };
  const startDrag = (event: ReactPointerEvent<SVGGElement>, target: DragState["target"], id?: string) => {
    if (!canManage || !draft || drawing) return;
    event.preventDefault(); event.stopPropagation();
    const svg = svgRef.current; if (!svg) return;
    const position = canvasPosition(event.clientX, event.clientY);
    dragRef.current = { target, id, ...position }; svg.setPointerCapture(event.pointerId);
    if (id) setSelectedAreaId(id);
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragRef.current || !draft) return;
    const next = canvasPosition(event.clientX, event.clientY); const dx = next.x - dragRef.current.x; const dy = next.y - dragRef.current.y;
    const drag = dragRef.current; dragRef.current = { ...drag, ...next };
    setDraft((layout) => {
      if (!layout) return layout;
      if (drag.target === "area") return { ...layout, areas: layout.areas.map((area) => area.id === drag.id ? { ...area, points: area.points.map(([x, y]) => [clamp(x + dx, 0, layout.canvas.width), clamp(y + dy, 0, layout.canvas.height)] as [number, number]) } : area) };
      const box = layout[drag.target]; if (!box) return layout;
      return { ...layout, [drag.target]: { ...box, x: clamp(box.x + dx, 0, layout.canvas.width - box.width), y: clamp(box.y + dy, 0, layout.canvas.height - box.height) } };
    });
  };
  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => { dragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };
  const updateArea = (change: Partial<VenueMapArea>) => setDraft((layout) => layout ? { ...layout, areas: layout.areas.map((area) => area.id === selectedAreaId ? { ...area, ...change } : area) } : layout);
  const resizeArea = (scaleX: number, scaleY: number) => {
    if (!selectedArea || !draft) return;
    const center = venueAreaCenter(selectedArea);
    updateArea({ points: fitToCanvas(selectedArea.points.map(([x, y]) => [center.x + (x - center.x) * scaleX, center.y + (y - center.y) * scaleY] as [number, number]), draft.canvas) });
  };
  const rotateArea = (degrees: number) => { if (selectedArea && draft) updateArea({ points: fitToCanvas(rotatePoints(selectedArea.points, venueAreaCenter(selectedArea), degrees), draft.canvas) }); };
  const createArea = (points: VenueMapArea["points"], labelPrefix = "New section") => {
    if (!draft) return;
    const section = unplacedSections[0]; const id = `custom-${Date.now()}`;
    const area: VenueMapArea = { id, seatSectionId: section?.id ?? null, label: section?.name ?? labelPrefix, fill: areaPalette[linkedCount % areaPalette.length], hidden: false, points: fitToCanvas(points, draft.canvas) };
    setDraft({ ...draft, areas: [...draft.areas, area] }); setSelectedAreaId(id); return area;
  };
  const attachArea = (mode: SmartPlacementMode) => {
    if (!draft || !selectedArea) return;
    const area = createArea(createAttachedGeometry(draft, selectedArea, mode));
    if (area) setMessage(`${area.label} was attached using the selected section's edge, scale, depth and local stadium curve.`);
  };
  const autoPlaceNext = () => {
    if (!draft) return;
    const section = unplacedSections[0]; const reference = selectedArea ?? draft.areas.find((area) => area.seatSectionId !== null) ?? draft.areas[0] ?? null;
    const emptySlots = draft.areas.filter((area) => area.seatSectionId === null && !area.hidden);
    if (section && emptySlots.length) {
      const origin = reference ? venueAreaCenter(reference) : { x: draft.canvas.width / 2, y: draft.canvas.height / 2 };
      const slot = [...emptySlots].sort((a, b) => distance(origin, venueAreaCenter(a)) - distance(origin, venueAreaCenter(b)))[0];
      setDraft({ ...draft, areas: draft.areas.map((area) => area.id === slot.id ? { ...area, seatSectionId: section.id, label: section.name, fill: areaPalette[linkedCount % areaPalette.length] } : area) });
      setSelectedAreaId(slot.id); setMessage(`${section.name} was assigned to the nearest free ${activeTemplate.name} slot.`); return;
    }
    if (reference) {
      const area = createArea(createAttachedGeometry(draft, reference, "auto"));
      if (area) setMessage(`${area.label} was contour-fitted to ${reference.label}.`);
    }
  };
  const splitSelectedArea = () => {
    if (!draft || !selectedArea) return;
    const split = splitVenueArea(selectedArea); if (!split) { setError("Only four-point section shapes can be split automatically."); return; }
    const section = unplacedSections[0]; const newId = `split-${Date.now()}`;
    const first: VenueMapArea = { ...selectedArea, label: section ? selectedArea.label : `${selectedArea.label} A`, points: split[0] };
    const second: VenueMapArea = { ...selectedArea, id: newId, seatSectionId: section?.id ?? null, label: section?.name ?? `${selectedArea.label} B`, fill: areaPalette[(linkedCount + 1) % areaPalette.length], points: split[1] };
    setDraft({ ...draft, areas: draft.areas.flatMap((area) => area.id === selectedArea.id ? [first, second] : [area]) }); setSelectedAreaId(newId); setMessage(`${selectedArea.label} was split into two perfectly adjoining shapes.`); setError("");
  };
  const removeArea = () => { if (draft && selectedAreaId) { setDraft({ ...draft, areas: draft.areas.filter((area) => area.id !== selectedAreaId) }); setSelectedAreaId(null); } };

  const toggleDrawing = () => { setDrawing((value) => !value); setDrawPoints([]); setSelectedAreaId(null); setMessage(drawing ? "Polygon drawing cancelled." : "Click around the section outline. Double-click or use Finish polygon after at least three points."); };
  const addDrawPoint = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const target = event.target as Element; if (target.closest(".editor-area, .editor-floor, .editor-stage")) return;
    const point = canvasPosition(event.clientX, event.clientY);
    setDrawPoints((points) => [...points, [Math.round(point.x * 10) / 10, Math.round(point.y * 10) / 10]]);
  };
  const finishDrawing = () => {
    if (!drawing) return;
    if (drawPoints.length < 3) { setError("Add at least three points before finishing the polygon."); return; }
    const area = createArea(drawPoints, "Drawn section"); setDrawing(false); setDrawPoints([]); setError("");
    if (area) setMessage(`${area.label} was created from the traced polygon.`);
  };

  const loadReference = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const supported = file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".svg");
    if (!supported || file.size > 6_000_000) { setError("Use a PNG, JPG, WEBP or SVG reference smaller than 6 MB."); return; }
    const reader = new FileReader(); reader.onload = () => { setReferenceImage(String(reader.result || "")); setReferenceName(file.name); setError(""); setMessage("Reference plan loaded locally. It is only a tracing layer and will not be saved or published."); }; reader.readAsDataURL(file);
  };
  const exportJson = () => {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${mapName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "venue-map"}.json`; anchor.click(); URL.revokeObjectURL(url);
  };
  const importJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const reader = new FileReader(); reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "")) as Partial<VenueMapLayout>;
        if (!parsed.canvas || !Array.isArray(parsed.areas) || parsed.areas.length < 1) throw new Error("Invalid map file");
        const template = templateOptions.some((option) => option.value === parsed.template) ? parsed.template as VenueMapTemplate : "halo_bowl";
        setDraft({ ...parsed, version: 2, template, kind: parsed.kind === "sports" ? "sports" : "concert" } as VenueMapLayout); setSelectedAreaId(null); setDrawing(false); setDrawPoints([]); setError(""); setMessage(`${file.name} imported. The server will validate every polygon when you save.`);
      } catch { setError("This JSON file does not contain a valid LisTix venue map."); }
    }; reader.readAsText(file);
  };
  const regenerate = async (template: VenueMapTemplate) => {
    if (!venueId || !window.confirm("Replace the current draft with this stadium template?")) return;
    setBusy("generate"); setError("");
    try { const { item } = await api.previewSystemVenueMap(venueId, template); setDraft(cloneLayout(item.layout)); setSelectedAreaId(null); setDrawing(false); setDrawPoints([]); setMessage(`${templateOptions.find((option) => option.value === template)?.name ?? "Template"} generated. Save the map when you are happy with it.`); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to generate the map."); }
    finally { setBusy(""); }
  };
  const save = async () => {
    if (!venueId || !draft) return;
    setBusy("save"); setError(""); setMessage("");
    try {
      const { item } = await api.updateSystemVenueMap(venueId, { name: mapName, isPublished: published, layout: draft });
      setMaps((items) => items.map((map) => map.venueId === item.venueId ? item : map)); setDraft(cloneLayout(item.layout)); setMessage(published ? "Venue map saved and published to the marketplaces." : "Venue map saved as an unpublished draft.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to save the venue map."); }
    finally { setBusy(""); }
  };

  if (!current || !draft) return <div className="system-page"><section className="system-panel map-loading">{error || "Loading venue maps..."}</section></div>;
  const stageHorizontal = Boolean(draft.stage && draft.stage.width >= draft.stage.height);
  return <div className="system-page venue-map-admin-page">
    <section className="system-panel map-editor-toolbar">
      <div><span className="system-kicker">Venue geometry</span><h2>Stadium map editor</h2><p>Generate a base, split existing blocks, attach sections along the real contour, or trace an official plan with custom polygons. Reference files remain local to your browser.</p></div>
      <div className="map-editor-toolbar-actions"><label><span>Venue</span><select value={current.venueId} onChange={(event) => setVenueId(Number(event.target.value))}>{maps.map((map) => <option key={map.venueId} value={map.venueId}>{map.venue} - {map.city}</option>)}</select></label><button type="button" disabled={!canManage || Boolean(busy)} onClick={() => void save()}>{busy === "save" ? "Saving..." : "Save map"}</button></div>
    </section>
    {message && <p className="map-editor-message">{message}</p>}{error && <p className="system-error">{error}</p>}
    <section className="map-template-picker" aria-label="Stadium templates">
      {templateOptions.map((option) => <button key={option.value} type="button" className={draft.template === option.value ? "active" : ""} disabled={!canManage || Boolean(busy)} onClick={() => void regenerate(option.value)}><i>{option.icon}</i><span><strong>{option.name}</strong><small>{option.description}</small></span>{draft.template === option.value && <b>Selected</b>}</button>)}
    </section>
    <section className="system-panel map-editor-workflow">
      <div><span className="system-kicker">Fast workflow</span><strong>Trace, draw or reuse a map</strong><small>Load an official plan as a temporary underlay, draw section polygons on top, or transfer LisTix maps as JSON.</small></div>
      <div className="map-editor-workflow-actions">
        <input ref={referenceInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={loadReference} />
        <input ref={jsonInputRef} hidden type="file" accept="application/json,.json" onChange={importJson} />
        <button type="button" disabled={!canManage} onClick={() => referenceInputRef.current?.click()}>Load reference plan</button>
        <button type="button" className={drawing ? "active" : ""} disabled={!canManage} onClick={toggleDrawing}>{drawing ? "Cancel drawing" : "Draw polygon"}</button>
        {drawing && <button type="button" className="primary" disabled={drawPoints.length < 3} onClick={finishDrawing}>Finish polygon ({drawPoints.length})</button>}
        <button type="button" disabled={!canManage} onClick={() => jsonInputRef.current?.click()}>Import JSON</button>
        <button type="button" onClick={exportJson}>Export JSON</button>
      </div>
      {referenceImage && <div className="reference-controls"><span>{referenceName}</span><label>Opacity <input type="range" min="0.1" max="0.85" step="0.05" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))} /></label><button type="button" onClick={() => { setReferenceImage(""); setReferenceName(""); }}>Remove</button></div>}
    </section>
    <div className="map-editor-layout">
      <section className="system-panel map-editor-canvas-panel">
        <header><div><strong>{current.venue}</strong><small>{activeTemplate.name} - {linkedCount}/{current.seatSections.length} inventory sections linked</small></div><span className={`smart-placement-badge${drawing ? " drawing" : ""}`}>{drawing ? "Polygon drawing active" : "Contour fitting on"}</span></header>
        <div className={`map-editor-canvas-wrap${drawing ? " drawing" : ""}`}><svg ref={svgRef} className="map-editor-canvas" viewBox={`0 0 ${draft.canvas.width} ${draft.canvas.height}`} onClick={addDrawPoint} onDoubleClick={(event) => { if (drawing) { event.preventDefault(); finishDrawing(); } }} onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <defs><linearGradient id="editor-floor-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#102b3b" /><stop offset="1" stopColor="#174a4c" /></linearGradient><pattern id="editor-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#5ce2cf" strokeOpacity=".08" /></pattern></defs>
          <rect className="editor-map-bg" width={draft.canvas.width} height={draft.canvas.height} rx="36" />
          {referenceImage && <image className="editor-reference-image" href={referenceImage} x="0" y="0" width={draft.canvas.width} height={draft.canvas.height} preserveAspectRatio="xMidYMid meet" opacity={referenceOpacity} />}
          <rect className="editor-map-grid" width={draft.canvas.width} height={draft.canvas.height} rx="36" />
          <ellipse className="editor-map-orbit" cx={draft.canvas.width / 2} cy={draft.canvas.height / 2} rx={draft.canvas.width * .43} ry={draft.canvas.height * .4} />
          {draft.floor && <g className="editor-floor" onPointerDown={(event) => startDrag(event, "floor")}><rect x={draft.floor.x} y={draft.floor.y} width={draft.floor.width} height={draft.floor.height} rx="32" /><text x={draft.floor.x + draft.floor.width / 2} y={draft.floor.y + draft.floor.height / 2}>{draft.floor.label}</text></g>}
          {draft.stage && <g className="editor-stage" onPointerDown={(event) => startDrag(event, "stage")}><rect x={draft.stage.x} y={draft.stage.y} width={draft.stage.width} height={draft.stage.height} rx="14" /><text x={stageHorizontal ? draft.stage.x + draft.stage.width / 2 : undefined} y={stageHorizontal ? draft.stage.y + draft.stage.height / 2 : undefined} transform={stageHorizontal ? undefined : `translate(${draft.stage.x + draft.stage.width / 2} ${draft.stage.y + draft.stage.height / 2}) rotate(-90)`}>{draft.stage.label}</text></g>}
          {draft.areas.filter((area) => !area.hidden).map((area) => { const center = venueAreaCenter(area); const linked = Boolean(area.seatSectionId); return <g key={area.id} className={`editor-area${selectedAreaId === area.id ? " selected" : ""}${linked ? " linked" : ""}`} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => startDrag(event, "area", area.id)}><polygon points={polygonPoints(area)} fill={linked ? area.fill : "#1c2a3a"} /><text x={center.x} y={center.y}>{area.label}</text></g>; })}
          {drawPoints.length > 0 && <g className="editor-drawing-preview"><polyline points={polygonPoints({ points: drawPoints })} />{drawPoints.map(([x, y], index) => <g key={`${x}-${y}-${index}`}><circle cx={x} cy={y} r="7" /><text x={x} y={y}>{index + 1}</text></g>)}</g>}
        </svg></div>
        <footer><span><i className="linked" />Linked to inventory</span><span><i />Template / unavailable</span><small>{drawing ? "Click polygon corners in order, then double-click to finish" : "Select a section to split or attach a perfectly aligned neighbor"}</small></footer>
      </section>
      <aside className="system-panel map-editor-inspector">
        <header><span className="system-kicker">Map properties</span><h3>{selectedArea ? selectedArea.label : "Venue map"}</h3></header>
        {selectedArea ? <div className="inspector-fields">
          <label><span>Displayed label</span><input value={selectedArea.label} disabled={!canManage} onChange={(event) => updateArea({ label: event.target.value })} /></label>
          <label><span>LisTix seat section</span><select value={selectedArea.seatSectionId ?? ""} disabled={!canManage} onChange={(event) => { const id = event.target.value ? Number(event.target.value) : null; const section = current.seatSections.find((item) => item.id === id); updateArea({ seatSectionId: id, ...(section ? { label: section.name } : {}) }); }}><option value="">Visual only / unavailable</option>{current.seatSections.map((section) => <option key={section.id} value={section.id}>{section.name} - Row {section.rowLabel || "-"}</option>)}</select></label>
          <label><span>Available color</span><input type="color" value={selectedArea.fill} disabled={!canManage} onChange={(event) => updateArea({ fill: event.target.value })} /></label>
          <label className="inspector-check"><input type="checkbox" checked={selectedArea.hidden} disabled={!canManage} onChange={(event) => updateArea({ hidden: event.target.checked })} /><span>Hide this area</span></label>
          <div className="area-size-controls"><span>Attach a contour-matched neighbor</span><div className="three-buttons"><button type="button" disabled={!canManage} onClick={() => attachArea("counterclockwise")}>Counter-clockwise</button><button type="button" disabled={!canManage} onClick={() => attachArea("auto")}>Best free edge</button><button type="button" disabled={!canManage} onClick={() => attachArea("clockwise")}>Clockwise</button></div></div>
          <button type="button" className="inspector-split" disabled={!canManage || selectedArea.points.length !== 4} onClick={splitSelectedArea}>Split into two adjoining sections</button>
          <div className="area-size-controls"><span>Resize selected shape</span><div><button type="button" disabled={!canManage} onClick={() => resizeArea(1.08, 1)}>Wider</button><button type="button" disabled={!canManage} onClick={() => resizeArea(.92, 1)}>Narrower</button><button type="button" disabled={!canManage} onClick={() => resizeArea(1, 1.08)}>Taller</button><button type="button" disabled={!canManage} onClick={() => resizeArea(1, .92)}>Shorter</button></div></div>
          <div className="area-size-controls"><span>Rotate around section center</span><div><button type="button" disabled={!canManage} onClick={() => rotateArea(-15)}>Left 15 deg</button><button type="button" disabled={!canManage} onClick={() => rotateArea(-5)}>Left 5 deg</button><button type="button" disabled={!canManage} onClick={() => rotateArea(5)}>Right 5 deg</button><button type="button" disabled={!canManage} onClick={() => rotateArea(15)}>Right 15 deg</button></div></div>
          <button className="inspector-delete" type="button" disabled={!canManage} onClick={removeArea}>Remove area</button>
        </div> : <div className="inspector-fields">
          <label><span>Map name</span><input value={mapName} disabled={!canManage} onChange={(event) => setMapName(event.target.value)} /></label>
          <label><span>Active template</span><select value={draft.template} disabled={!canManage || Boolean(busy)} onChange={(event) => void regenerate(event.target.value as VenueMapTemplate)}>{templateOptions.map((option) => <option key={option.value} value={option.value}>{option.name}</option>)}</select></label>
          {draft.floor && <label><span>Floor label</span><input value={draft.floor.label} disabled={!canManage} onChange={(event) => setDraft({ ...draft, floor: draft.floor ? { ...draft.floor, label: event.target.value } : null })} /></label>}
          {draft.stage && <label><span>Stage label</span><input value={draft.stage.label} disabled={!canManage} onChange={(event) => setDraft({ ...draft, stage: draft.stage ? { ...draft.stage, label: event.target.value } : null })} /></label>}
          <label className="inspector-check"><input type="checkbox" checked={published} disabled={!canManage} onChange={(event) => setPublished(event.target.checked)} /><span>Publish on B2B and public marketplace</span></label>
          <button type="button" disabled={!canManage} onClick={autoPlaceNext}>Place next inventory section</button>
          <small className="smart-placement-note">{unplacedSections.length ? `${unplacedSections.length} inventory section${unplacedSections.length === 1 ? "" : "s"} waiting to be linked.` : "All inventory sections are linked. Select a block to attach or split more visual sections."}</small>
        </div>}
        <button className="clear-selection" type="button" onClick={() => setSelectedAreaId(null)}>{selectedArea ? "Back to map settings" : "Click any section to edit it"}</button>
      </aside>
    </div>
  </div>;
}
