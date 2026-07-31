// NF-7 / FR-SR-03: single source of truth for prompt template variables.
//
// AUTHORITATIVE CONTRACT — evidence:
//   1. README §7.4 "Prompts": "Templates support the variables {SOURCE_SCHEMA},
//      {TARGET_SCHEMA}, {EXAMPLES}, {CONSTRAINTS} which are expanded at runtime
//      with the mapping's context."
//   2. Backend substitution sites (the only places a {VAR} is replaced):
//        M1 "Build Enhance Request Payload"  -> SOURCE_SCHEMA, TARGET_SCHEMA, EXAMPLES, CONSTRAINTS
//        M1 "Build Code-Gen Request Payload" -> SOURCE_SCHEMA, TARGET_SCHEMA, EXAMPLES, CONSTRAINTS
//                                               ({SOURCE_ASSET} intentionally left for runtime)
//        M1 "Execute Transform Function"     -> SOURCE_ASSET + the four above
//        M1 "Hybrid: Build AI Request"       -> SOURCE_ASSET + the four above
//        M2 "genApiMap: compose LLM prompt"  -> the seven catalogue variables below
//
//   => schema-mapping prompts support exactly FIVE variables.
//      api-mapping prompts (kind: 'api-mapping') support a separate set of SEVEN.
//
// There is no evidence of any further supported variable. Do not add entries here
// unless a backend node actually substitutes them.

export const PROMPT_LIFECYCLE_STATUSES = ["draft", "active", "deprecated", "archived"];

export const GENERATION_STATUSES = ["idle", "generating", "completed", "error"];

// Shown to the user when no author can be determined for a pre-NF7 record.
export const LEGACY_AUTHOR_LABEL = "Legacy record";

const SCHEMA_MAPPING_VARS = [
  {
    name: "SOURCE_ASSET",
    required: true,
    description: "The raw source asset being transformed. Substituted at transform and dry-run time.",
    example: '{"id":"ds-1","title":"Air quality 2024"}',
  },
  {
    name: "SOURCE_SCHEMA",
    required: false,
    description: "Identifier of the source schema this prompt maps from.",
    example: "DCAT-AP 2.1.1",
  },
  {
    name: "TARGET_SCHEMA",
    required: false,
    description: "Identifier of the target schema this prompt maps to.",
    example: "ISO 19115",
  },
  {
    name: "EXAMPLES",
    required: false,
    description: "The Examples field of this prompt version.",
    example: "input: {...} -> output: {...}",
  },
  {
    name: "CONSTRAINTS",
    required: false,
    description: "The Constraints field of this prompt version.",
    example: "Return valid JSON only. Never invent identifiers.",
  },
];

const API_MAPPING_VARS = [
  { name: "catalogue_name", required: false, description: "Name of the target catalogue.", example: "Diamant Cloud" },
  { name: "catalogue_endpoint", required: false, description: "Base endpoint of the target catalogue.", example: "https://api.example.org/v1" },
  { name: "catalogue_auth", required: false, description: "Auth mode configured for the catalogue.", example: "static-token" },
  { name: "catalogue_interface_type", required: false, description: "Interface type of the catalogue.", example: "Query interface" },
  { name: "local_type_name", required: false, description: "Local asset type name.", example: "Dataset" },
  { name: "local_type_description", required: false, description: "Local asset type description.", example: "A published data product" },
  { name: "remote_type", required: false, description: "Remote asset type identifier.", example: "dcat:Dataset" },
];

export function promptVarsFor(kind) {
  return kind === "api-mapping" ? API_MAPPING_VARS : SCHEMA_MAPPING_VARS;
}

export function promptVarTokens(kind) {
  return promptVarsFor(kind).map((v) => `{${v.name}}`);
}

export function requiredPromptVars(kind) {
  return promptVarsFor(kind).filter((v) => v.required).map((v) => v.name);
}

// Returns { unknown: string[], missingRequired: string[], used: string[] }
export function validatePromptTemplate(template, kind) {
  const allowed = promptVarsFor(kind);
  const allowedNames = allowed.map((v) => v.name);
  const used = [];
  const unknown = [];
  const re = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  let m;
  while ((m = re.exec(String(template || ""))) !== null) {
    if (!used.includes(m[1])) used.push(m[1]);
    if (!allowedNames.includes(m[1]) && !unknown.includes(m[1])) unknown.push(m[1]);
  }
  const missingRequired = allowed
    .filter((v) => v.required && !used.includes(v.name))
    .map((v) => v.name);
  return { unknown, missingRequired, used };
}

export function unknownVarMessage(unknown, kind) {
  const plural = unknown.length > 1 ? "s" : "";
  return (
    `Unknown template variable${plural}: ${unknown.map((u) => `{${u}}`).join(", ")}. ` +
    `Supported variable${plural}: ${promptVarTokens(kind).join(", ")}.`
  );
}

export function missingVarMessage(missing, kind) {
  const plural = missing.length > 1 ? "s" : "";
  return (
    `Missing required template variable${plural}: ${missing.map((u) => `{${u}}`).join(", ")}. ` +
    `Add ${missing.length > 1 ? "them" : "it"} to the template so the ${
      kind === "api-mapping" ? "catalogue" : "source asset"
    } is passed to the model.`
  );
}

// Mirrors the backend substitution order used by "Execute Transform Function".
export function substitutePromptTemplate(template, ctx = {}) {
  let out = String(template || "");
  out = out.replace(/\{SOURCE_ASSET\}/g, ctx.sourceAsset != null ? String(ctx.sourceAsset) : "");
  out = out.replace(/\{SOURCE_SCHEMA\}/g, ctx.sourceSchema || "");
  out = out.replace(/\{TARGET_SCHEMA\}/g, ctx.targetSchema || "");
  out = out.replace(/\{EXAMPLES\}/g, ctx.examples || "");
  out = out.replace(/\{CONSTRAINTS\}/g, ctx.constraints || "");
  return out;
}

export function normalizePromptStatus(status) {
  const v = String(status == null ? "" : status).trim().toLowerCase();
  if (PROMPT_LIFECYCLE_STATUSES.includes(v)) return v;
  const legacy = {
    "writing code": "draft", writing_code: "draft", generating: "draft",
    processing: "draft", pending: "draft", error: "draft", failed: "draft",
    completed: "active", complete: "active", published: "active", enabled: "active",
    inactive: "deprecated", disabled: "deprecated",
  };
  return legacy[v] || "draft";
}

export function comparePromptVersions(a, b) {
  const parse = (v) => {
    const m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(v || "").trim());
    return m ? [+m[1], +m[2], +(m[3] || 0)] : [0, 0, 0];
  };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// Human-readable, actionable messages for each provider-resolution failure class.
export const PROVIDER_ERROR_MESSAGES = {
  provider_not_selected:
    "No LLM provider selected. Choose a provider on this prompt, or set a default in Schema Registry → Providers.",
  provider_not_found:
    "The provider saved on this prompt no longer exists. Select a different provider in Schema Registry → Providers.",
  provider_inactive:
    "The provider saved on this prompt is not active. Activate it in Schema Registry → Providers, or choose another.",
  credential_missing:
    "This provider has no API key stored. Add a key in Schema Registry → Providers, then retry generation.",
  credential_invalid:
    "The stored API key for this provider could not be decrypted or was rejected. Re-enter the key in Schema Registry → Providers.",
  provider_unreachable:
    "The provider endpoint could not be reached. Check the endpoint URL and network access, then retry.",
  provider_error:
    "The provider returned an error. Check the provider configuration and model name, then retry.",
};

export function providerErrorMessage(code, fallback) {
  return PROVIDER_ERROR_MESSAGES[code] || fallback || "Code generation failed.";
}
