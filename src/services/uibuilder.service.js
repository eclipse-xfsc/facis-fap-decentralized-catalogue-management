/**
 * FACIS service adapter
 * - Uses real window.uibuilder when available (Node-RED)
 * - Falls back to a mock that prevents errors and feeds sample data (FACIS Preview)
 */

const mockUsers = [
  {
    uniqueId: "u1",
    profile: { firstName: "Alice", lastName: "Schmidt" },
    email: "alice@example.com",
    status: "Active",
    access: ["local_catalogue", "catalogue_registry", "schema_registry", "admin_tools", "harvester"]
  },
  {
    uniqueId: "u2",
    profile: { firstName: "Bob", lastName: "Mueller" },
    email: "bob@example.com",
    status: "Active",
    access: ["local_catalogue", "catalogue_registry"]
  },
  {
    uniqueId: "u3",
    profile: { firstName: "Clara", lastName: "Fischer" },
    email: "clara@example.com",
    status: "Invited",
    access: ["local_catalogue", "schema_registry", "harvester"]
  }
];

const mockCatalogs = [
  {
    uniqueId: "rc1",
    catalog: {
      catalogId: "rc1",
      catalogName: "SensorML Europe",
      owner: "EU Sensors Consortium",
      strategy: "deterministic",
      baseEndpoint: "https://api.sensorml-eu.org/sparql",
      enabled: true
    }
  },
  {
    uniqueId: "rc2",
    catalog: {
      catalogId: "rc2",
      catalogName: "DCAT-AP Germany",
      owner: "GovData.de",
      strategy: "ai",
      baseEndpoint: "https://govdata.de/ckan/api",
      enabled: true
    }
  },
  {
    uniqueId: "rc3",
    catalog: {
      catalogId: "rc3",
      catalogName: "OGC Observations",
      owner: "OGC Foundation",
      strategy: "hybrid",
      baseEndpoint: "https://ogc.org/api/observations",
      enabled: false
    }
  }
];

// ── Route resolution map ────────────────────────────────────────
// Maps each msg.type to a route key used by the Node-RED router switch.
// Add new entries here when introducing new message types.
const ROUTE_MAP = {
  // Dashboard / Auth
  getDashboard:           'dashboard',
  logOut:                 'dashboard',

  // Admin Tools
  inviteUser:             'admin-tools',
  getAdminTools:          'admin-tools',

  // Catalogue Registry
  getCatalogRegistry:     'catalogue-registry',
  registerRemoteCatalog:  'catalogue-registry',
  updateRemoteCatalog:    'catalogue-registry',
  deleteRemoteCatalog:    'catalogue-registry',
  uploadCatalogJson:      'catalogue-registry',

  // Local Catalogue
  getLocalCatalogue:      'local-catalogue',
  deleteLocalAsset:       'local-catalogue',
  updateLocalAsset:       'local-catalogue',

  // Harvest
  getHarvestCatalogues:   'harvest',
  startHarvest:           'harvest',
  listHarvestRuns:        'harvest',
  getHarvestRunDetail:    'harvest',
  listHarvestLogs:        'harvest',
  listHarvestProvenance:  'harvest',
  pauseHarvest:           'harvest',
  resumeHarvest:          'harvest',
  cancelHarvest:          'harvest',

  // Schema Registry
  listPrompts:            'schema-registry',
  createPrompt:           'schema-registry',
  updatePrompt:           'schema-registry',
  deletePrompt:           'schema-registry',
  enhancePrompt:          'schema-registry',
  updatePromptStatus:     'schema-registry',
  updatePromptCode:       'schema-registry',
  dryRunPrompt:           'schema-registry',
  listTestCases:          'schema-registry',
  saveTestCase:           'schema-registry',
  deleteTestCase:         'schema-registry',
  listLlmConfigs:         'schema-registry',
  saveLlmConfig:          'schema-registry',
  deleteLlmConfig:        'schema-registry',
  listProviders:          'schema-registry',
  saveProvider:            'schema-registry',
  deleteProvider:         'schema-registry',
  reorderProvider:        'schema-registry',
  startBatchRetransform:  'schema-registry',
  cancelBatchRetransform: 'schema-registry',
};

function resolveRoute(type) {
  return ROUTE_MAP[type] || null;
}

let msgCallbacks = [];
let _isMock = false;

function dispatchMsg(msg) {
  setTimeout(() => {
    msgCallbacks.forEach((cb) => {
      try { cb(msg); }
      catch (e) { console.error("[facis-service] callback error:", e); }
    });
  }, 150);
}

function createMockResponder(msg) {
  if (!msg) return;

  if (msg.type === "getDashboard") {
    dispatchMsg({
      payload: {
        type: "getDashboard",
        response: {
          action: "getDashboard",
          status: "success",
          userAccess: ["local_catalogue", "catalogue_registry", "schema_registry", "admin_tools", "harvester"],
          userPermissions: {
            local_catalogue:    { read: true, create: false, update: false, delete: false },
            catalogue_registry: { read: true, create: true, update: true, delete: true },
            schema_registry:    { read: true, create: true, update: true, delete: true },
            harvester:          { read: true, create: true, update: true, delete: false },
            admin_tools:        { read: true, create: true, update: true, delete: true },
          }
        }
      }
    });
  }

  if (msg.type === "getCatalogRegistry") {
    dispatchMsg({
      payload: {
        response: {
          action: "getCatalogRegistry",
          status: "success",
          catalogs: mockCatalogs
        }
      }
    });
  }

  if (msg.type === "getAdminTools") {
    dispatchMsg({
      type: "getAdminTools",
      response: { status: "success", users: mockUsers }
    });
  }

  if (msg.type === "inviteUser") {
    dispatchMsg({
      payload: {
        data: msg.data,
        response: {
          action: "inviteUser",
          status: "success",
          uniqueId: "mock-" + Date.now()
        }
      }
    });
  }

  if (msg.type === "registerRemoteCatalog") {
    dispatchMsg({
      payload: {
        response: {
          action: "registerRemoteCatalog",
          status: "success",
          uniqueId: "mock-rc-" + Date.now()
        }
      }
    });
  }

  if (msg.type === "deleteRemoteCatalog") {
    dispatchMsg({
      payload: {
        data: msg.data,
        response: {
          action: "deleteRemoteCatalog",
          status: "success",
          uniqueId: msg.data?.uniqueId
        }
      }
    });
  }

  if (msg.type === "uploadCatalogJson") {
    const catalogs = (msg.data?.catalogs || []).map((c, i) => ({
      uniqueId: "mock-upload-" + Date.now() + "-" + i,
      catalog: c
    }));
    dispatchMsg({
      payload: {
        response: {
          action: "uploadCatalogJson",
          status: "success",
          catalogs
        }
      }
    });
  }

  if (msg.type === "updateRemoteCatalog") {
    dispatchMsg({
      payload: {
        data: msg.data,
        response: {
          action: "updateRemoteCatalog",
          status: "success"
        }
      }
    });
  }

  if (msg.type === "logOut") {
    console.log("[facis-service] Logout requested (no redirect in preview)");
  }

  // ── Harvest Stub Responses ──────────────────────────────────
  if (msg.type === "getHarvestCatalogues") {
    // Return real catalogue data from mockCatalogs
    const catalogs = mockCatalogs.map(c => ({
      uniqueId: c.uniqueId,
      catalogId: c.catalog.catalogId,
      catalogName: c.catalog.catalogName,
      owner: c.catalog.owner,
      strategy: c.catalog.strategy,
      baseEndpoint: c.catalog.baseEndpoint,
      enabled: c.catalog.enabled,
      protocol: "Query interface",
    }));
    dispatchMsg({ payload: { response: { action: "getHarvestCatalogues", status: "success", catalogs } } });
  }

  if (msg.type === "startHarvest") {
    const runId = "run-" + Date.now().toString(36);
    const catNames = (msg.data?.catalogues || []).map(c => c.catalogName).join(", ");
    const run = {
      uniqueId: runId,
      catalogueName: catNames || "Harvest",
      catalogues: msg.data?.catalogues || [],
      scope: msg.data?.scope || {},
      lifecycle: msg.data?.lifecycle || {},
      status: "completed",
      startedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      totalAssets: 42,
      assetsAdded: 38,
      duration: "2m 15s",
      result: "Success",
    };
    dispatchMsg({ payload: { response: { action: "startHarvest", status: "success", run } } });
    // Simulate progress completion
    setTimeout(() => {
      dispatchMsg({ payload: { response: {
        action: "harvestProgress",
        runId, status: "completed", catalogueName: catNames || "Harvest",
        progress: 100, totalAssets: 42, processedAssets: 42,
        successCount: 38, errorCount: 4, startedAt: run.startedAt,
      } } });
    }, 500);
  }

  if (msg.type === "listHarvestRuns") {
    dispatchMsg({ payload: { response: { action: "listHarvestRuns", status: "success", runs: [] } } });
  }

  if (msg.type === "getHarvestRunDetail") {
    dispatchMsg({ payload: { response: { action: "getHarvestRunDetail", status: "success", run: {
      uniqueId: msg.data?.runId, catalogueName: "Preview", status: "Completed",
      startedAt: "-", duration: "-", imported: "-", assets: []
    } } } });
  }

  if (msg.type === "listHarvestLogs") {
    dispatchMsg({ payload: { response: { action: "listHarvestLogs", status: "success", logs: [] } } });
  }

  if (msg.type === "listHarvestProvenance") {
    dispatchMsg({ payload: { response: { action: "listHarvestProvenance", status: "success", provenance: [] } } });
  }

  if (msg.type === "pauseHarvest" || msg.type === "resumeHarvest" || msg.type === "cancelHarvest") {
    // No-op in preview
  }

  // ── Local Catalogue Stub Responses ──────────────────────────
  if (msg.type === "getLocalCatalogue") {
    dispatchMsg({ payload: { response: { action: "getLocalCatalogue", status: "success", assets: [], totalAssets: 0, totalRuns: 0 } } });
  }

  if (msg.type === "deleteLocalAsset") {
    dispatchMsg({ payload: { response: { action: "deleteLocalAsset", status: "success" } } });
  }

  if (msg.type === "updateLocalAsset") {
    dispatchMsg({ payload: { response: { action: "updateLocalAsset", status: "success" } } });
  }

  // ── Schema Registry Stub Responses ──────────────────────────
  // These are thin stubs only — no business logic, no code execution,
  // no ID generation, no simulation. All real processing happens in the
  // Node-RED backend flow (DCM-SchemaPrompts.json).
  // In preview mode these stubs return acknowledgements so the UI doesn't hang.

  const schemaStubs = {
    enhancePrompt:          () => ({ action: "enhancePrompt", status: "success", enhancedPrompt: "[Connect to Node-RED backend for real AI-enhanced prompt]" }),
    createPrompt:           (d) => ({ action: "createPrompt", status: "success", prompt: { id: "preview-placeholder", version: d.version || "1.0", status: "draft", sourceSchema: d.sourceSchema || "", targetSchema: d.targetSchema || "", template: d.template || "", examples: d.examples || "", constraints: d.constraints || "", generatedCode: "", codeGenerationStatus: "pending", createdAt: "", updatedAt: "" } }),
    listPrompts:            () => ({ action: "listPrompts", status: "success", prompts: [
      { id: "prompt-001", version: "1.0", status: "active", sourceSchema: "OGC SensorML", targetSchema: "DCAT-AP.de", template: "Transform the following {SOURCE_SCHEMA} asset into a valid {TARGET_SCHEMA} record.\n\nSource asset:\n{SOURCE_ASSET}\n\nExamples:\n{EXAMPLES}\n\nConstraints:\n{CONSTRAINTS}", examples: "Input: SensorML observation → Output: DCAT Dataset with dct:title, dcat:distribution", constraints: "All output must validate against the target SHACL shape. Preserve original identifiers.", createdAt: "2026-01-15", updatedAt: "2026-02-01", generatedCode: "function transform(input) {\n  const output = {};\n  output[\"@type\"] = \"dcat:Dataset\";\n  output[\"dct:identifier\"] = input.identifier || input.id || \"\";\n  output[\"dct:title\"] = input.name || input.title || \"\";\n  output[\"dct:description\"] = input.description || \"\";\n  return output;\n}", originalPrompt: "", enhancedPrompt: "", codeGenerationStatus: "completed", lastGeneratedAt: "2026-02-01" },
      { id: "prompt-002", version: "2.0", status: "draft", sourceSchema: "ISO 19115-1", targetSchema: "DCAT-AP.de", template: "Map the ISO 19115-1 metadata record to DCAT-AP.de format.\n\nSource:\n{SOURCE_ASSET}", examples: "", constraints: "Preserve spatial extent.", createdAt: "2026-02-10", updatedAt: "2026-02-10", generatedCode: "", originalPrompt: "", enhancedPrompt: "", codeGenerationStatus: "", lastGeneratedAt: "" },
    ] }),
    updatePromptCode:       (d) => ({ action: "updatePromptCode", status: "success", promptId: d.promptId, code: d.code, updatedAt: "" }),
    deletePrompt:           (d) => ({ action: "deletePrompt", status: "success", promptId: d.promptId }),
    dryRunPrompt:           (d) => ({ action: "dryRunPrompt", status: "success", promptId: d.promptId, result: "[Connect to Node-RED backend for real dry run execution]" }),
    saveTestCase:           (d) => ({ action: "saveTestCase", status: "success", testCaseId: d.id || "preview-tc", isNew: !d.id, testCase: { id: d.id || "preview-tc", name: d.name || "", promptId: d.promptId || "", llmConfigId: d.llmConfigId || "", sampleInput: d.sampleInput || "", expectedOutput: d.expectedOutput || "", lastResult: "", lastRunAt: "", createdAt: "", updatedAt: "" } }),
    listTestCases:          () => ({ action: "listTestCases", status: "success", testCases: [
      { id: "tc-001", name: "SensorML to DCAT basic", promptId: "prompt-001", llmConfigId: "llm-001", sampleInput: '{\n  "@type": "SensorML",\n  "identifier": "sensor-abc-123",\n  "name": "Temperature Sensor Berlin",\n  "description": "Outdoor temperature monitoring station"\n}', expectedOutput: "", lastResult: "", lastRunAt: "2026-02-20", createdAt: "2026-02-20", updatedAt: "2026-02-20" },
    ] }),
    deleteTestCase:         (d) => ({ action: "deleteTestCase", status: "success", testCaseId: d.testCaseId }),
    updatePrompt:           (d) => ({ action: "updatePrompt", status: "success", promptId: d.promptId, version: d.version, sourceSchema: d.sourceSchema, targetSchema: d.targetSchema, template: d.template, examples: d.examples, constraints: d.constraints, promptStatus: d.status, code: d.code, updatedAt: "" }),
    updatePromptStatus:     (d) => ({ action: "updatePromptStatus", status: "success", promptId: d.promptId, newStatus: d.status, updatedAt: "" }),
    saveLlmConfig:          (d) => ({ action: "saveLlmConfig", status: "success", configId: d.id || "preview-llm", isNew: !d.id, config: { id: d.id || "preview-llm", name: d.name || "", provider: d.provider || "OpenAI", model: d.model || "", temperature: d.temperature ?? 0.3, maxTokens: d.maxTokens ?? 4096, timeout: d.timeout ?? 30, status: d.status || "active", createdAt: "", updatedAt: "" } }),
    deleteLlmConfig:        (d) => ({ action: "deleteLlmConfig", status: "success", configId: d.configId }),
    saveProvider:           (d) => ({ action: "saveProvider", status: "success", providerId: d.id || "preview-prov", isNew: !d.id, provider: { id: d.id || "preview-prov", name: d.name || "", type: d.type || "openai", apiEndpoint: d.apiEndpoint || "", models: Array.isArray(d.models) ? d.models : [], isDefault: !!d.isDefault, precedence: d.precedence || 1, status: d.status || "active", createdAt: "", updatedAt: "" } }),
    deleteProvider:         (d) => ({ action: "deleteProvider", status: "success", providerId: d.providerId }),
    reorderProvider:        () => ({ action: "reorderProvider", status: "success", providers: [] }),
    startBatchRetransform:  () => ({ action: "startBatchRetransform", status: "success", totalAssets: 0, startedAt: "" }),
    cancelBatchRetransform: () => ({ action: "batchRetransformProgress", status: "cancelled", completedAt: "" }),
    listLlmConfigs:         () => ({ action: "listLlmConfigs", status: "success", configs: [
      { id: "llm-001", name: "GPT-4o Production", provider: "OpenAI", model: "gpt-4o", temperature: 0.2, maxTokens: 4096, timeout: 30, status: "active", createdAt: "2026-01-10", updatedAt: "2026-02-15" },
      { id: "llm-002", name: "Claude Staging", provider: "Anthropic", model: "claude-3.5-sonnet", temperature: 0.3, maxTokens: 8192, timeout: 60, status: "active", createdAt: "2026-02-01", updatedAt: "2026-02-20" },
      { id: "llm-003", name: "Mistral Dev", provider: "Mistral", model: "mistral-large", temperature: 0.5, maxTokens: 2048, timeout: 45, status: "inactive", createdAt: "2025-12-05", updatedAt: "2026-01-18" },
    ] }),
    listProviders:          () => ({ action: "listProviders", status: "success", providers: [
      { id: "prov-001", name: "OpenAI", type: "openai", apiEndpoint: "https://api.openai.com/v1", models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"], isDefault: true, precedence: 1, status: "active", createdAt: "2026-01-05" },
      { id: "prov-002", name: "Anthropic", type: "anthropic", apiEndpoint: "https://api.anthropic.com/v1", models: ["claude-3.5-sonnet", "claude-3-opus"], isDefault: false, precedence: 2, status: "active", createdAt: "2026-01-10" },
    ] }),
  };

  if (schemaStubs[msg.type]) {
    dispatchMsg({ payload: { response: schemaStubs[msg.type](msg.data || {}) } });
  }
}

const mockAdapter = {
  start() {
    console.log("[facis-service] mock start()");
  },
  send(msg) {
    console.log("[facis-service] mock send():", JSON.stringify(msg, null, 2));
    createMockResponder(msg);
  },
  onChange(prop, cb) {
    if (prop === "msg" && typeof cb === "function") {
      msgCallbacks.push(cb);
    }
  },
  get(prop) {
    if (prop === "clientId") return "mock-client-001";
    return undefined;
  },
  set() {},
  eventSend() {}
};

const uibuilderService = {
  init() {
    if (window.uibuilder) {
      _isMock = false;
      console.log("[facis-service] Using real uibuilder");
    } else {
      _isMock = true;
      window.uibuilder = mockAdapter;
      console.log("[facis-service] Mock uibuilder activated");
    }
  },

  onMessage(handler) {
    if (_isMock) {
      msgCallbacks.push(handler);
    } else {
      window.uibuilder.onChange("msg", handler);
    }
  },

  send(msg) {
    // Auto-attach route from the type→route map if not already set
    if (msg && msg.type && !msg.route) {
      const route = resolveRoute(msg.type);
      if (route) msg.route = route;
    }
    window.uibuilder.send(msg);
  },

  start() {
    window.uibuilder.start();
  },

  get(prop) {
    return window.uibuilder.get(prop);
  },

  isMock() {
    return _isMock;
  }
};

export { uibuilderService };
