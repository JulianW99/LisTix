import type { ChangeEvent } from "react";
import "./FormField.css";

type FormFieldProps = { label: string; name: string; value: string; type?: string; options?: string[]; onChange: (name: string, value: string) => void };
export function FormField({ label, name, value, type = "text", options, onChange }: FormFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(name, event.target.value);
  return <label className="form-field"><span>{label}</span>{options ? <select value={value} onChange={handleChange}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input type={type} value={value} onChange={handleChange} />}</label>;
}
