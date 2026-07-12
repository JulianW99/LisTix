import { getStatusTone } from "../../Functions/getStatusTone";
import "./StatusBadge.css";
export function StatusBadge({ status }: { status: string }) { return <span className={`status-badge ${getStatusTone(status)}`}>{status}</span>; }
