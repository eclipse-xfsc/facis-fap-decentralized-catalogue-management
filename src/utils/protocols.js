// FR-CR-01 / NF-2: the UI and the backend share one normalised protocol
// vocabulary. Legacy labels stored in cr_catalogues are still recognised.
export const PROTOCOLS = [
  { value: "query-interface", label: "Query interface" },
  { value: "dcat", label: "DCAT" },
  { value: "oai-pmh", label: "OAI-PMH" },
];

export const QUERY_LANGUAGES = [
  { value: "rest-json", label: "REST / JSON (no query language)" },
  { value: "sparql", label: "SPARQL" },
  { value: "graphql", label: "GraphQL" },
  { value: "custom-query", label: "Custom query" },
];

export const RESULT_MODES = [
  { value: "sparql-select", label: "SPARQL SELECT bindings" },
  { value: "rdf", label: "RDF graph (CONSTRUCT / DESCRIBE)" },
  { value: "custom-json", label: "Custom JSON" },
];

export const METADATA_PREFIXES = ["oai_dc", "oai_datacite", "dcat", "iso19139"];

export function normaliseProtocol(value) {
  const s = String(value == null ? "" : value).trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (!s) return "query-interface";
  if (s === "oai-pmh" || s === "oaipmh" || s === "oai") return "oai-pmh";
  if (s === "dcat" || s === "dcat-ap" || s === "linked-data") return "dcat";
  if (s === "query-interface" || s === "query" || s === "sparql") return "query-interface";
  return s;
}

export function protocolLabel(value) {
  const p = normaliseProtocol(value);
  const hit = PROTOCOLS.find((x) => x.value === p);
  return hit ? hit.label : String(value || "-");
}

export function normaliseQueryLanguage(value) {
  const s = String(value == null ? "" : value).trim().toLowerCase();
  if (!s) return "rest-json";
  if (s.includes("sparql")) return "sparql";
  if (s.includes("graphql")) return "graphql";
  if (s.includes("custom")) return "custom-query";
  return "rest-json";
}

export function isExecutableQueryLanguage(lang) {
  return ["sparql", "graphql", "custom-query"].includes(normaliseQueryLanguage(lang));
}

// Mirrors the backend rule: an executable query uses its result MIME type, a
// plain REST/JSON endpoint keeps the MIME type configured on the catalogue and
// is never described with the SPARQL default the form pre-fills.
export function expectedMimeType(config) {
  const c = config || {};
  const configured = String(c.mimeType || "").trim();
  const result = String(c.resultMimeType || "").trim();
  if (isExecutableQueryLanguage(c.queryLanguage || c.queryLanguages)) {
    return result || configured || "application/sparql-results+json";
  }
  if (configured) return configured;
  if (result && !/sparql-results/i.test(result)) return result;
  return "application/json";
}

const text = (v) => (v === undefined || v === null ? "" : String(v).trim());

// Mirrors the backend rules so the form can block an incomplete configuration
// before it is ever saved.
export function validateProtocolConfig(form) {
  const errors = {};
  const protocol = normaliseProtocol(form.protocol);
  if (!PROTOCOLS.some((p) => p.value === protocol)) {
    errors.protocol = `Unsupported protocol "${form.protocol}".`;
    return errors;
  }
  if (form.sourceData) return errors;

  if (protocol === "oai-pmh") {
    if (!text(form.baseEndpoint)) errors.baseEndpoint = "OAI-PMH requires a base endpoint.";
    else if (!/^https?:\/\/\S+$/i.test(text(form.baseEndpoint))) errors.baseEndpoint = "Base endpoint must be an absolute http(s) URL.";
    if (!text(form.metadataPrefix)) errors.metadataPrefix = "OAI-PMH requires a metadata prefix.";
    const pages = form.maxPages === "" || form.maxPages === null || form.maxPages === undefined ? 50 : Number(form.maxPages);
    if (!Number.isInteger(pages) || pages < 1) errors.maxPages = "Maximum page limit must be a whole number of at least 1.";
    if (form.setSpecEnabled && !text(form.setSpec)) errors.setSpec = "A set specification is enabled but empty.";
  } else if (protocol === "dcat") {
    const uri = text(form.dcatCatalogUri) || text(form.baseEndpoint);
    if (!uri) errors.dcatCatalogUri = "DCAT requires a catalogue URI or base endpoint.";
    else if (!/^https?:\/\/\S+$/i.test(uri)) errors.dcatCatalogUri = "The catalogue URI must be an absolute http(s) URL.";
  } else {
    const endpoint = text(form.queryEndpoint) || text(form.baseEndpoint);
    if (!endpoint) errors.queryEndpoint = "A query interface requires a query endpoint.";
    else if (!/^https?:\/\/\S+$/i.test(endpoint)) errors.queryEndpoint = "The query endpoint must be an absolute http(s) URL.";
    const lang = text(form.queryLanguage);
    if (!lang) errors.queryLanguage = "Select the query language, or REST/JSON for a plain endpoint.";
    else if (isExecutableQueryLanguage(lang)) {
      const method = text(form.queryMethod).toUpperCase() || "GET";
      if (!text(form.queryText)) errors.queryText = "An executable query is required.";
      if (method !== "GET" && method !== "POST") errors.queryMethod = "Use GET or POST.";
      const form_encoded = text(form.requestContentType).toLowerCase().includes("x-www-form-urlencoded");
      if ((method === "GET" || form_encoded) && !text(form.queryParameterName)) {
        errors.queryParameterName = "A query parameter name is required for GET and form-encoded POST requests.";
      }
      if (!text(form.resultMimeType)) errors.resultMimeType = "An expected result MIME type is required.";
      const mode = text(form.resultMode);
      if (!mode) errors.resultMode = "Select how query results should be processed.";
      else if (mode === "sparql-select" && !text(form.resultIdVariable)) errors.resultIdVariable = "SELECT harvesting needs the variable holding the asset identifier.";
      else if (mode === "custom-json" && !text(form.resultRootPath)) errors.resultRootPath = "Custom JSON results need the result root path.";
    }
  }
  return errors;
}

export function isProtocolReady(form) {
  return Object.keys(validateProtocolConfig(form)).length === 0;
}

// The harvester needs the complete protocol configuration, not just the
// endpoint, so the wizard forwards every stored protocol field.
export function protocolHarvestConfig(base, override) {
  const cfg = Object.assign({}, base || {}, override || {});
  return {
    protocol: normaliseProtocol(cfg.protocol),
    queryEndpoint: cfg.queryEndpoint || "",
    queryLanguage: normaliseQueryLanguage(cfg.queryLanguage || cfg.queryLanguages),
    queryMethod: String(cfg.queryMethod || "GET").toUpperCase(),
    queryText: cfg.queryText || "",
    queryParameterName: cfg.queryParameterName || "query",
    requestContentType: cfg.requestContentType || "",
    resultMimeType: cfg.resultMimeType || "",
    resultMode: cfg.resultMode || "",
    resultRootPath: cfg.resultRootPath || "",
    resultIdVariable: cfg.resultIdVariable || "",
    resultNameVariable: cfg.resultNameVariable || "",
    resultTypeVariable: cfg.resultTypeVariable || "",
    metadataPrefix: cfg.metadataPrefix || "",
    setSpec: cfg.setSpecEnabled === false ? "" : (cfg.setSpec || ""),
    resumptionTokenEnabled: cfg.resumptionTokenEnabled !== false,
    maxPages: Number(cfg.maxPages) || 50,
    dcatCatalogUri: cfg.dcatCatalogUri || "",
    mimeType: cfg.mimeType || "",
    strategy: cfg.strategy || "none",
    namespacesToPreserve: cfg.namespacesToPreserve || [],
    shaclShapeId: cfg.shaclShapeId || cfg.shaclShapeSchemaId || "",
  };
}
