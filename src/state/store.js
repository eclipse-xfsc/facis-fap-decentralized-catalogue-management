/**
 * Reactive store for the Dashboard application.
 * Uses Vue.reactive() — no external dependencies.
 */

export function createStoreData() {
  return {
    currentPage: "schemaRegistry",
    currentTab: "localCatalogue",
    currentSchemaTab: "localSchema",
    currentAdminTab: "accessControl",

    // Modals
    isViewModal: false,
    manageUserModal: false,
    currentViewTab: "Overview",
    isInviteModal: false,
    showRegisterRemoteCatalogModal: false,
    isRegisterSchemaEditModal: false,
    isRegisterSchemaNewModal: false,
    showHarvestWizard: false,
    showAccessInformation: false,

    // Invite form
    inviteForm: {
      firstName: "",
      lastName: "",
      email: "",
      role: "Searcher",
      expiresIn: "30 Days",
      altRole: "",
      message: "You have been invited to join the federated catalogue system.",
      selectedAccess: ["Local Catalogue"]
    },

    // Manage user form
    manageForm: {
      firstName: "",
      lastName: "",
      email: "",
      role: "Searcher",
      selectedRoles: ["Local Catalogue"],
      expiresIn: "30 Days",
      altRole: "",
      message: ""
    },

    // Remote catalog form
    editingRemoteCatalogId: null,
    isEditingRemoteCatalog: false,
    remoteCatalogForm: {
      catalogId: "",
      catalogName: "",
      owner: "",
      protocol: "Query interface",
      baseEndpoint: "",
      mimeType: "application/sparql-results+json",
      queryEndpoint: "",
      queryLanguages: "",
      // OAI-PMH fields
      metadataPrefix: "oai_dc",
      setSpec: "",
      resumptionToken: false,
      // DCAT fields
      dcatCatalogUri: "",
      linkedDataEndpoint: "",
      contentNegotiation: "application/ld+json",
      strategy: "none",
      promptId: "",
      llmConfigId: "",
      namespacesToPreserve: "",
      shaclShapeId: "",
      auth: "none",
      trustAnchor: "",
      enabled: true,
    },

    // Pagination
    pagination: {
      catalog: { page: 1, perPage: 5 },
      schema: { page: 1, perPage: 5 },
      remoteSchema: { page: 1, perPage: 5 },
      catalogsRegister: { page: 1, perPage: 5 },
      users: { page: 1, perPage: 5 },
      harvest: { page: 1, perPage: 5 },
      mapping: { page: 1, perPage: 5 },
      harvestWizard: { page: 1, perPage: 5 }
    },

    // Manage menu
    manageMenu: {
      open: false,
      x: 0,
      y: 0,
      stage: "root",
      userId: null,
      anchorEl: null
    },

    roles: ["Harvester", "Catalog Admin", "Schema Admin", "Administrator", "Searcher"],

    // Schema form
    registerSchemaForm: {
      name: "",
      format: "SHACL",
      catalogSearch: "",
      remoteCatalogs: ["DCAT-AP.de", "OGC SensorML"],
      namespaces: ["ex:", "dcat:", "dct:"],
      version: "",
      sourceUrl: "",
      summaryTab: "SHACL"
    },

    schemaSummaries: {
      Parsed: `Targets: dcat:Distribution, ex:GeoDataset
Required Properties: dct:title, dct:dataset

Classes: dcat:Dataset (class), dcat:Distribution (lclass)
Properties: dcat:mediaType, dcat:spatial

Terms: ex:dataset - http://example.org/dataset, dcat:dataset
IRIs: ex - http://example.org/, dcat - http://www.w3.org/ns/dcat#`,
      SHACL: `@prefix sh:   <http://www.w3.org/ns/shacl#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dct:  <http://purl.org/dc/terms/> .

:CatalogueShape a sh:NodeShape ;
  sh:targetClass dcat:Catalogue ;
  sh:property [
    sh:path dcat:dataset ;
    sh:minCount 1 ;
    sh:node :DatasetShape ;
  ] .

:DatasetShape a sh:NodeShape ;
  sh:targetClass dcat:Dataset ;
  sh:property [
    sh:path dct:identifier ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
  ] ;
  sh:property [
    sh:path dct:title ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
  ] ;
  sh:property [
    sh:path dct:publisher ;
    sh:minCount 1 ;
  ] ;
  sh:property [
    sh:path dcat:distribution ;
    sh:node :DistributionShape ;
    sh:minCount 0 ;
  ] .

:DistributionShape a sh:NodeShape ;
  sh:targetClass dcat:Distribution ;
  sh:property [
    sh:path dcat:accessURL ;
    sh:nodeKind sh:IRI ;
    sh:minCount 1 ;
  ] ;
  sh:property [
    sh:path dcat:mediaType ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
  ] .`,
      Vocab: `# RDF vocab output placeholder (ttl)
@prefix ex: <http://example.org/> .
ex:Dataset a ex:Class .
ex:publisher a ex:Property .`,
      JSONLD: `{
  "@context": {
    "dcat": "http://www.w3.org/ns/dcat#",
    "dct": "http://purl.org/dc/terms/"
  }
}`
    },

    // Asset Detail Panel (Milestone 1)
    showAssetDetailPanel: false,
    assetDetailRow: null,
    isEditingAsset: false,
    assetEditForm: {
      assets: "",
      type: "",
      name: "",
      domain: "",
      integrationStatus: "Active",
    },
    showDeleteAssetConfirm: false,
    deleteAssetTargetId: null,

    // Selections
    selectedRows: [],
    selectedMappingRows: [],
    auditSearch: "",

    // Transformation / validation data
    transformationSummary: [
      "Schema harmonization",
      "Domain enrichment",
      "Attribute normalization",
      "Additional rules applied...",
      "Recursive timestamp update (Enabled)",
      "Harvested data items: 18,564",
      "Transformation issues resolved: 1,013"
    ],
    validation: {
      status: "Passed",
      minorWarnings: 52,
      criticalErrors: 2
    },
    auditMini: [
      { id: 1, level: "Info", step: "Schemas Harmonized", timestamp: "2026-09-02 10:32 (UTC)" }
    ],
    auditRows: [
      { id: 1, rule: "Recursive Time Updates", level: "Info", step: "Schemas Harmonized", timestamp: "2026-06-02 10:32 (UTC)", assetId: "sensor-asset-001", catalogueId: "SensorML", promptVersion: "1.0", status: "Success" },
      { id: 2, rule: "Schemas Harmonized", level: "Warning", step: "Schemas Harmonized", timestamp: "2026-09-02 10:32 (UTC)", assetId: "dataset-energy-042", catalogueId: "DCAT-AP.de", promptVersion: "2.0", status: "Warning" },
      { id: 3, rule: "Null value issues fixed", level: "Error", step: "Schemas Harmonized", timestamp: "2026-09-02 10:32 (UTC)", assetId: "service-api-007", catalogueId: "OGC SensorML", promptVersion: "1.0", status: "Error" },
      { id: 4, rule: "Namespace prefix mapped", level: "Info", step: "RDF Mapping", timestamp: "2026-09-01 14:20 (UTC)", assetId: "sensor-asset-001", catalogueId: "SensorML", promptVersion: "", status: "Success" },
      { id: 5, rule: "AI fallback triggered", level: "Warning", step: "Hybrid Mapping", timestamp: "2026-08-28 09:15 (UTC)", assetId: "dataset-energy-042", catalogueId: "DCAT-AP.de", promptVersion: "1.0", status: "Warning" },
    ],

    // Audit trail filters (FR-SR-09)
    auditFilters: {
      assetId: "",
      catalogueId: "",
      promptVersion: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    },

    // JSON diff data
    originalJsonLines: [
      { text: "{", changeType: null },
      { text: '  "identifier": "sensor-asset-001",', changeType: null },
      { text: '  "catalogue": "SensorML",', changeType: null },
      { text: '  "updateTime": "2026-02-09T10:32:18Z",', changeType: null },
      { text: '  "temperature": 22.5,', changeType: null },
      { text: '  "humidity": 60,', changeType: null },
      { text: '  "airQualityIndex": 42,', changeType: null },
      { text: '  "status": "active",', changeType: null },
      { text: '  "owner": {', changeType: null },
      { text: '    "name": "Local Organization",', changeType: null },
      { text: '    "contact": "support@am.com"', changeType: null },
      { text: "  },", changeType: null },
      { text: '  "location": {', changeType: null },
      { text: '    "latitude": 40.7128,', changeType: null },
      { text: '    "longitude": -74.006', changeType: null },
      { text: "  },", changeType: null },
      { text: '  "tags": [', changeType: null },
      { text: '    "sensor-network",', changeType: null },
      { text: '    "environmental-monitoring",', changeType: null },
      { text: '    "asset-safety"', changeType: null },
      { text: "  ],", changeType: null },
      { text: '  "metrics": {', changeType: null },
      { text: '    "batteryLevel": 87,', changeType: null },
      { text: '    "signalStrength": -71,', changeType: null },
      { text: '    "lastHeartbeat": "2026-02-09T10:30:01Z"', changeType: null },
      { text: "  }", changeType: null },
      { text: "}", changeType: null }
    ],
    localJsonLines: [
      { text: "{", changeType: null },
      { text: '  "identifier": "sensor-asset-001",', changeType: null },
      { text: '  "catalogue": "SensorML",', changeType: null },
      { text: '  "updated_at": "2026-02-09T10:32:18Z",', changeType: "updated" },
      { text: '  "snisn_temperature": 22.5,', changeType: "updated" },
      { text: '  "snisn_humidity": 60,', changeType: "updated" },
      { text: '  "ai-generated-field-1": "deterministic_fallback",', changeType: "new" },
      { text: '  "status": "active",', changeType: null },
      { text: '  "owner": {', changeType: null },
      { text: '    "name": "Local Organization",', changeType: null },
      { text: '    "contact_email": "support@am.com"', changeType: "updated" },
      { text: "  },", changeType: null },
      { text: '  "location": null,', changeType: "deleted" },
      { text: '  "domain_tags": [', changeType: null },
      { text: '    "asset-safety",', changeType: null },
      { text: '    "environmental-monitoring",', changeType: null },
      { text: '    "sensor-network"', changeType: null },
      { text: "  ],", changeType: null },
      { text: '  "metrics": {', changeType: "new" },
      { text: '    "batteryLevel": 87,', changeType: "new" },
      { text: '    "signalStrength": -71,', changeType: "new" },
      { text: '    "lastHeartbeat": "2026-02-09T10:30:01Z",', changeType: "new" },
      { text: '    "harvestRunId": "run-2026-02-09-001"', changeType: "new" },
      { text: "  },", changeType: "new" },
      { text: '  "airQualityIndex": null', changeType: "deleted" },
      { text: "}", changeType: null }
    ],

    // Search and filters
    searchText: "",
    filters: {
      catalog: "",
      type: "",
      domain: "",
      status: ""
    },

    // Data
    allCatalogsRaw: [],
    tableRows: [],
    localCatalogueStats: { totalAssets: 0, totalRuns: 0 },
    schemaRegistry: [
      { id: 1, schema: "DCAT-AP.de", catalogs: 3, localMapping: "Service, Data Product", versioning: "v1.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" },
      { id: 2, schema: "Data Specifications", catalogs: 2, localMapping: "Dataset (1)", versioning: "v1.1", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" },
      { id: 3, schema: "OGC SensorML", catalogs: 1, localMapping: "Asset + Safety", versioning: "v1.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" },
      { id: 4, schema: "Xxx Taxonomy", catalogs: 1, localMapping: null, versioning: "v2.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Untrusted" }
    ],
    remoteSchema: [
      { id: 1, schema: "ISO 19115-1", catalogs: 5, localMapping: "Dataset (2)", versioning: "v2.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" },
      { id: 2, schema: "schema.org Dataset", catalogs: 7, localMapping: "Dataset (5)", versioning: "v1.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" },
      { id: 3, schema: "OpenAPI Specification", catalogs: 3, localMapping: "Service, Data Product", versioning: "v1.1", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" },
      { id: 4, schema: "W3C PROV-O", catalogs: 2, localMapping: "Asset + Safety", versioning: "v2.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" },
      { id: 5, schema: "SKOS Concept Scheme", catalogs: 1, localMapping: null, versioning: "v1.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Untrusted" },
      { id: 6, schema: "INSPIRE Metadata", catalogs: 4, localMapping: "Dataset (4)", versioning: "v1.1", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" },
      { id: 7, schema: "DCAT", catalogs: 8, localMapping: "Service, Data Product", versioning: "v2.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" },
      { id: 8, schema: "OGC Observations & Measurements", catalogs: 2, localMapping: "Asset + Safety", versioning: "v1.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: "Federated" }
    ],

    catalogsTable: [],

    // Asset Type Registry
    assetTypes: [
      { id: 1, name: "Dataset", description: "A collection of related data records", icon: "dataset" },
      { id: 2, name: "Service", description: "An API or web service endpoint", icon: "service" },
      { id: 3, name: "Document", description: "A document or report artifact", icon: "document" },
      { id: 4, name: "Software Release", description: "A versioned software package or release", icon: "software" },
      { id: 5, name: "Compliance Artifact", description: "A regulatory or compliance record", icon: "compliance" },
    ],
    assetTypeForm: { id: null, name: "", description: "", icon: "dataset" },
    isEditingAssetType: false,
    showAssetTypeForm: false,
    currentCatalogRegistryTab: "catalogues",

    // Prompt Management (FR-SR-03, FR-SR-04)
    // Prompts are loaded from MongoDB on mount
    prompts: [
    ],
    showPromptModal: false,
    isEditingPrompt: false,
    promptForm: {
      id: null,
      version: "1.0",
      status: "draft",
      sourceSchema: "",
      targetSchema: "",
      template: "",
      examples: "",
      constraints: "",
    },
    promptFormError: "",
    promptSearch: "",
    isEnhancingPrompt: false,
    isGeneratingCode: false,

    // Edit Code modal
    showEditCodeModal: false,
    editCodePromptId: null,
    editCodeValue: "",

    // LLM Configuration (FR-SR-11)
    // LLM configs are loaded from MongoDB on mount
    llmConfigs: [],
    showLlmConfigModal: false,
    isEditingLlmConfig: false,
    llmConfigForm: {
      id: null,
      name: "",
      provider: "OpenAI",
      model: "",
      temperature: 0.3,
      maxTokens: 4096,
      timeout: 30,
      status: "active",
    },
    llmConfigSearch: "",
    llmConfigError: "",

    // Prompt Testing (FR-SR-10)
    promptTestSelectedPrompt: "",
    promptTestSelectedLlm: "",
    promptTestSampleInput: "",
    promptTestRunning: false,
    promptTestResult: "",
    promptTestError: "",
    promptTestShowResolved: false,
    // Test cases are loaded from MongoDB on mount
    promptTestCases: [],
    showTestCaseModal: false,
    isEditingTestCase: false,
    testCaseForm: {
      id: null,
      name: "",
      promptId: "",
      llmConfigId: "",
      sampleInput: "",
      expectedOutput: "",
    },

    users: [],

    harvestRecords: [],

    mappingRows: [
      { id: 1, remoteCatalogue: "DCAT-AP.de", remoteSchema: "Data Service Entity 1.0", remoteSchemaMeta: "", transformationStrategy: "Deterministic RDF", promptsCount: 2, shaclCount: 3 },
      { id: 2, remoteCatalogue: "DCAT-AP.de", remoteSchema: "Energy Product 1.0", remoteSchemaMeta: "5", transformationStrategy: " AI-driven", promptsCount: 1, shaclCount: 2 },
      { id: 3, remoteCatalogue: "OGC SensorML", remoteSchema: "Dataset Schema", remoteSchemaMeta: "v1", transformationStrategy: "Deterministic RDF", promptsCount: 2, shaclCount: 3 },
      { id: 4, remoteCatalogue: "OGC SensorML", remoteSchema: "Mobility Data", remoteSchemaMeta: "Mobility 0.3 Data Service", transformationStrategy: "Hybrid AI Mapping", promptsCount: 0, shaclCount: 0 }
    ],

    // Resize
    resizeTimer: null,
    userAccess: ["local_catalogue", "catalogue_registry", "schema_registry", "admin_tools", "harvester"],

    // Granular per-area CRUD permissions (FR-AC-01)
    userPermissions: {
      local_catalogue:    { read: true, create: true, update: true, delete: true },
      catalogue_registry: { read: true, create: true, update: true, delete: true },
      schema_registry:    { read: true, create: true, update: true, delete: true },
      harvester:          { read: true, create: true, update: true, delete: true },
      admin_tools:        { read: true, create: true, update: true, delete: true },
    },

    // Harvest wizard
    harvestWizardStep: 1,
    harvestWizardSearch: "",
    harvestWizardRows: [],
    harvestWizardSelected: [],
    harvestWizardSelectedRows: [],
    harvestWizardRowsBase: [],

    // Remote catalog pending state
    pendingRemoteCatalog: null,
    isRegisteringRemoteCatalog: false,
    registerRemoteCatalogError: "",
    originalRemoteCatalogForm: null,
    isUpdatingRemoteCatalog: false,
    updateRemoteCatalogError: "",
    pendingUpdateRemoteCatalogId: null,

    // Harvest scope
    harvestScope: {
      selected: [],
      typeValue: "",
      queryValue: "",
      fromDate: "",
      toDate: "",
      includeNewAssets: false,
      schemaMappingEnabled: false,
      resolveReferences: false,
    },

    // Lifecycle mapping
    lifecycleMapping: {
      performSchemaMapping: true,
      updateHandling: "version",
      deletionHandling: "remove",
      resolveReferences: true
    },

    // Harvest error log (FR-ACM-01)
    harvestLog: [],
    showHarvestLog: false,

    // Provenance metadata per imported asset (FR-ACM-01)
    harvestProvenance: [],

    // Loading states for harvest
    isLoadingHarvestCatalogues: false,
    isSubmittingHarvest: false,
    harvestSubmitError: "",

    overviewToggles: {
      catalogsSelectedEnabled: true,
      mappingStrategiesEnabled: true
    },

    // Batch Re-transformation (FR-SR-13)
    showBatchRetransformModal: false,
    batchRetransform: {
      trigger: "prompt_change",   // prompt_change | strategy_change | llm_change | manual
      scope: "all",               // all | catalogue | query
      catalogueFilter: "",
      queryFilter: "",
      dryRun: true,
      status: "idle",             // idle | running | completed | cancelled | error
      progress: 0,
      totalAssets: 0,
      processedAssets: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      startedAt: "",
      completedAt: "",
      errors: [],
    },
    batchRetransformHistory: [
      { id: "br-001", trigger: "Prompt updated (prompt-001 v1.0→v1.1)", scope: "All assets", dryRun: false, total: 275, success: 270, errors: 5, skipped: 0, startedAt: "2026-02-20 14:30", completedAt: "2026-02-20 14:42", status: "completed" },
      { id: "br-002", trigger: "LLM config changed (llm-001)", scope: "Catalogue: SensorML", dryRun: true, total: 120, success: 118, errors: 2, skipped: 0, startedAt: "2026-02-18 09:15", completedAt: "2026-02-18 09:22", status: "completed" },
    ],

    // Multi-Model Provider Support (FR-SR-12)
    // Providers are loaded from MongoDB on mount
    llmProviders: [],
    showProviderModal: false,
    isEditingProvider: false,
    providerForm: {
      id: null,
      name: "",
      type: "openai",
      apiEndpoint: "",
      models: "",
      isDefault: false,
      precedence: 1,
      status: "active",
    },
    providerFormError: "",
    providerSearch: "",

    // ── Milestone 2: Schema & Mapping Workflows ─────────────
    // Local Schema create modal
    showCreateLocalSchemaModal: false,
    isEditingLocalSchema: false,
    editingLocalSchemaId: null,
    localSchemaForm: {
      schema: "",
      format: "SHACL",
      catalogs: 1,
      localMapping: "",
      versioning: "v1.0",
      trustLevel: "Federated",
    },
    showDeleteSchemaConfirm: false,
    deleteSchemaTargetId: null,

    // Schema version diff
    showSchemaDiffPanel: false,
    schemaDiffRow: null,
    schemaDiffVersionA: "",
    schemaDiffVersionB: "",

    // Add Mapping modal
    showAddMappingModal: false,
    isEditingMapping: false,
    editingMappingId: null,
    addMappingForm: {
      remoteCatalogue: "",
      remoteSchema: "",
      remoteSchemaMeta: "",
      transformationStrategy: "Deterministic RDF",
      promptsCount: 0,
      shaclCount: 0,
    },

    // ── Milestone 3: Harvester Live Operations ──────────────
    // Harvest run detail view
    showHarvestRunDetail: false,
    harvestRunDetailData: null,

    // Live harvest progress
    activeHarvest: {
      running: false,
      catalogueName: "",
      progress: 0,
      totalAssets: 0,
      processedAssets: 0,
      successCount: 0,
      errorCount: 0,
      status: "idle",
      startedAt: "",
      errors: [],
    },
    _harvestInterval: null,

    // Test Connection feedback
    testConnectionResult: {
      status: "",
      message: "",
      latency: 0,
    },
    isTestingConnection: false,

    // Mapping View/Edit detail panel
    showMappingDetailPanel: false,
    mappingDetailRow: null,
    isEditingMappingDetail: false,
    mappingDetailEditForm: {
      remoteCatalogue: "",
      remoteSchema: "",
      remoteSchemaMeta: "",
      transformationStrategy: "Deterministic RDF",
    },

    // ── Milestone 5: Global UX & Safety ────────────────────────
    toasts: [],
    _toastCounter: 0,
    confirmDialog: {
      visible: false,
      title: "",
      message: "",
      confirmLabel: "Delete",
      onConfirm: null,
    },
    showDeleteRemoteCatalogConfirm: false,
    deleteRemoteCatalogTargetId: null,

    // ── Milestone 4: Admin Tools & Monitoring ──────────────────
    // Monitoring dashboard
    monitoringMetrics: {
      systemUptime: "99.7%",
      avgResponseTime: "245ms",
      totalHarvestsToday: 12,
      failedHarvestsToday: 1,
      activeConnections: 8,
      queuedJobs: 3,
      diskUsage: "42%",
      memoryUsage: "67%",
    },
    monitoringEvents: [
      { id: 1, type: "info", source: "Harvester", message: "Scheduled harvest completed for SensorML", timestamp: "2026-03-05 12:58 (UTC)" },
      { id: 2, type: "warning", source: "Schema Mapper", message: "SHACL validation returned 3 minor warnings for DCAT-AP.de batch", timestamp: "2026-03-05 12:45 (UTC)" },
      { id: 3, type: "error", source: "Remote Catalogue", message: "Connection to OGC SensorML endpoint timed out after 30s", timestamp: "2026-03-05 12:30 (UTC)" },
      { id: 4, type: "info", source: "System", message: "Automatic backup completed successfully", timestamp: "2026-03-05 12:00 (UTC)" },
      { id: 5, type: "info", source: "Auth", message: "User 'admin@facis.eu' logged in", timestamp: "2026-03-05 11:45 (UTC)" },
      { id: 6, type: "warning", source: "LLM Provider", message: "OpenAI rate limit approached — 85% of quota used", timestamp: "2026-03-05 11:30 (UTC)" },
      { id: 7, type: "info", source: "Harvester", message: "275 assets imported from DCAT-AP.de", timestamp: "2026-03-05 11:00 (UTC)" },
      { id: 8, type: "error", source: "Schema Mapper", message: "LLM transformation failed for 2 assets — timeout exceeded", timestamp: "2026-03-05 10:30 (UTC)" },
    ],
    monitoringEventFilter: "all",
    monitoringAuditSearch: "",

    // Service status
    serviceStatus: [
      { name: "Harvest Engine", status: "operational", lastCheck: "2 min ago" },
      { name: "Schema Mapper", status: "operational", lastCheck: "1 min ago" },
      { name: "LLM Gateway", status: "degraded", lastCheck: "5 min ago" },
      { name: "SPARQL Endpoint", status: "operational", lastCheck: "3 min ago" },
      { name: "Remote Catalogue Proxy", status: "operational", lastCheck: "1 min ago" },
    ],

    // User profile
    showUserProfile: false,
    userProfile: {
      name: "Admin User",
      email: "admin@facis.eu",
      role: "Administrator",
      organization: "Facis DCM",
      lastLogin: "2026-03-05 11:45 (UTC)",
      memberSince: "2025-09-01",
      sessionsToday: 3,
    },
    passwordForm: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    passwordFormError: "",
    passwordFormSuccess: "",

    // Access map
    accessMap: {
      "Local Catalogue": "local_catalogue",
      "Catalogue Registry": "catalogue_registry",
      "Schema Registry": "schema_registry",
      "Harvest": "harvester",
      "Admin Tools": "admin_tools",
    },
  };
}
