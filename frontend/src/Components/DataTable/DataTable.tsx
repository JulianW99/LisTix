import type { ReactNode } from "react";
import "./DataTable.css";

export type DataTableColumn<T> = { key: string; header: ReactNode; render: (row: T) => ReactNode; className?: string };
type DataTableProps<T> = { columns: DataTableColumn<T>[]; rows: T[]; rowKey: (row: T) => string | number; emptyMessage?: string };

export function DataTable<T>({ columns, rows, rowKey, emptyMessage = "No records found." }: DataTableProps<T>) {
  return (
    <div className="data-table-shell">
      <table className="data-table">
        <thead><tr>{columns.map((column) => <th key={column.key} className={column.className}>{column.header}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} className={column.className}>{column.render(row)}</td>)}</tr>) : <tr><td className="data-table-empty" colSpan={columns.length}>{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
