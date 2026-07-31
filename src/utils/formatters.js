/**
 * Formatting and CSS-class utility functions.
 * Pure functions — no Vue dependency.
 */

export function statusClass(status) {
  if (status === "Active") return "green";
  if (status === "Warning") return "yellow";
  if (status === "Error") return "red";
  return "gray";
}

export function trustClass(level) {
  if (level === "Hybrid AI Mapping") return "green";
  if (level === "Deterministic RDF") return "yellow";
  if (level === "AI-driven") return "blue";
  return "gray";
}

export function roleClass(role) {
  if (role === "Harvester") return "blue";
  if (role === "Schema Admin") return "green";
  if (role === "Administrator") return "red";
  return "gray";
}

export function resultClass(result) {
  const v = String(result || "").trim().toLowerCase();
  if (v === "success") return "green";
  if (v === "partial" || v === "warning" || v === "completed_with_errors") return "yellow";
  if (v === "failed" || v === "error") return "red";
  return "gray";
}

export function logPillClass(level) {
  const v = String(level || "").trim().toLowerCase();
  if (v === "info") return "blue";
  if (v === "warn" || v === "warning") return "yellow";
  if (v === "error" || v === "fatal") return "red";
  return "gray";
}

export function resultLabel(result) {
  const v = String(result || "").trim().toLowerCase();
  if (v === "completed_with_errors") return "Completed with errors";
  if (v === "failed") return "Failed";
  if (v === "partial") return "Partial";
  if (v === "success") return "Success";
  return result || "-";
}

export function namespaceClass(ns) {
  const v = String(ns || "").trim().toLowerCase();
  if (v === "ex:" || v === "ex") return "green";
  if (v === "dcat:" || v === "dcat") return "blue";
  if (v === "dct:" || v === "dct") return "yellow";
  return "gray";
}

export function strategyPillClass(strategy) {
  const v = String(strategy || "").toLowerCase();
  if (v.includes("deterministic")) return "yellow";
  if (v.includes("hybrid")) return "green";
  if (v.includes("ai")) return "blue";
  return "gray";
}

export function strategyLabel(code) {
  const m = {
    none: "None",
    ai: "AI-driven",
    hybrid: "Hybrid AI Mapping",
    deterministic: "Deterministic RDF"
  };
  return m[code] || code || "None";
}

export function getAccessInitial(key) {
  const map = {
    local_catalogue: "L",
    catalogue_registry: "C",
    schema_registry: "S",
    admin_tools: "A",
    harvester: "H",
  };
  return map[key] || "?";
}
