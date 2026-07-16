import { formatCurrency } from "../../Functions/formatCurrency";
import type { CSSProperties } from "react";
import type { B2BListing, VenueMapArea, VenueMapLayout } from "../../types";
import "./VenueMap.css";

const centerOf = (area: VenueMapArea) => ({
  x: area.points.reduce((sum, point) => sum + point[0], 0) / area.points.length,
  y: area.points.reduce((sum, point) => sum + point[1], 0) / area.points.length,
});
const points = (area: VenueMapArea) => area.points.map((point) => point.join(",")).join(" ");

export function VenueMap({ layout, listings, activeSectionId, onSelectSection }: {
  layout: VenueMapLayout;
  listings: B2BListing[];
  activeSectionId: number | null;
  onSelectSection: (sectionId: number | null) => void;
}) {
  return <div className="venue-chart-shell">
    <svg className="venue-chart" viewBox={`0 0 ${layout.canvas.width} ${layout.canvas.height}`} role="img" aria-label="Interactive venue seating map">
      <defs>
        <linearGradient id="venue-floor-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#102b3b" /><stop offset="1" stopColor="#174a4c" /></linearGradient>
        <radialGradient id="venue-background-gradient"><stop offset="0" stopColor="#102233" /><stop offset="1" stopColor="#07111c" /></radialGradient>
        <pattern id="venue-floor-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#65e4d0" strokeOpacity=".08" /></pattern>
        <filter id="venue-price-shadow" x="-30%" y="-50%" width="160%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000814" floodOpacity=".45" /></filter>
      </defs>
      <rect className="venue-chart-background" width={layout.canvas.width} height={layout.canvas.height} rx="36" />
      <ellipse className="venue-chart-orbit orbit-one" cx={layout.canvas.width / 2} cy={layout.canvas.height / 2} rx={layout.canvas.width * .43} ry={layout.canvas.height * .4} />
      <ellipse className="venue-chart-orbit orbit-two" cx={layout.canvas.width / 2} cy={layout.canvas.height / 2} rx={layout.canvas.width * .32} ry={layout.canvas.height * .29} />
      {layout.floor && <g className="venue-chart-floor"><rect x={layout.floor.x} y={layout.floor.y} width={layout.floor.width} height={layout.floor.height} rx="34" /><rect className="venue-chart-floor-grid" x={layout.floor.x} y={layout.floor.y} width={layout.floor.width} height={layout.floor.height} rx="34" /><text x={layout.floor.x + layout.floor.width / 2} y={layout.floor.y + layout.floor.height / 2}>{layout.floor.label}</text></g>}
      {layout.stage && <g className="venue-chart-stage"><rect x={layout.stage.x} y={layout.stage.y} width={layout.stage.width} height={layout.stage.height} rx="14" /><path d={layout.stage.width >= layout.stage.height ? `M ${layout.stage.x + layout.stage.width * .35} ${layout.stage.y} l ${layout.stage.width * .15} -28 ${layout.stage.width * .15} 28 z` : `M ${layout.stage.x + layout.stage.width} ${layout.stage.y + layout.stage.height * .3} l 42 ${layout.stage.height * .2} -42 ${layout.stage.height * .2} z`} /><text x={layout.stage.width >= layout.stage.height ? layout.stage.x + layout.stage.width / 2 : undefined} y={layout.stage.width >= layout.stage.height ? layout.stage.y + layout.stage.height / 2 : undefined} transform={layout.stage.width >= layout.stage.height ? undefined : `translate(${layout.stage.x + layout.stage.width / 2} ${layout.stage.y + layout.stage.height / 2}) rotate(-90)`}>{layout.stage.label}</text></g>}
      {layout.areas.filter((area) => !area.hidden).map((area, index) => {
        const areaListings = area.seatSectionId ? listings.filter((listing) => listing.sectionId === area.seatSectionId) : [];
        const available = areaListings.length > 0;
        const selected = area.seatSectionId !== null && activeSectionId === area.seatSectionId;
        const center = centerOf(area);
        const minimumPrice = available ? Math.min(...areaListings.map((listing) => listing.askingPrice)) : null;
        const select = () => { if (available && area.seatSectionId) onSelectSection(selected ? null : area.seatSectionId); };
        return <g key={area.id} className={`venue-chart-area ${available ? "available" : "unavailable"}${selected ? " selected" : ""}`} role={available ? "button" : undefined} tabIndex={available ? 0 : undefined} aria-label={available ? `${area.label}, tickets from ${formatCurrency(minimumPrice ?? 0)}` : `${area.label}, unavailable`} onClick={select} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } }} style={{ "--area-index": index } as CSSProperties}>
          <polygon points={points(area)} fill={available ? area.fill : "#1c2a3a"} />
          <g className="venue-chart-area-label" transform={`translate(${center.x} ${center.y})`}>
            {available && <><rect x="-31" y="-24" width="62" height="19" rx="6" filter="url(#venue-price-shadow)" /><text className="price" y="-11">{formatCurrency(minimumPrice ?? 0)}</text></>}
            <text className="section" y={available ? 10 : 4}>{area.label}</text>
          </g>
        </g>;
      })}
    </svg>
    <div className="venue-chart-legend"><span><i className="available" />Tickets available</span><span><i />Currently unavailable</span><small>Illustrative venue layout</small></div>
  </div>;
}
