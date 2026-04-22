/**
 * Reactive store for the Dashboard application.
 * Uses Vue.reactive() — no external dependencies.
 */

export function createStoreData() {
  return {
    // Auth state
    isLoggedIn: false,
    isCheckingAuth: true,
    isLoggingIn: false,
    loginError: "",
    loginErrorCode: "",
    loginForm: { username: "", password: "" },
    authToken: "",

    // Current user with RBAC permissions (populated from hydrateSession)
    currentUser: {
      id: "",
      email: "",
      username: "",
      roles: [],
      permissions: [],  // flattened permission strings from all roles
      accessAreas: [],  // canonical source of truth for sidebar visibility
      isAuthenticated: false,
      status: ""
    },

    currentPage: "localCatalogue",
    currentTab: "localCatalogue",
    currentSchemaTab: "localSchema",
    currentAdminTab: "accessControl",

    // Modals
    isViewModal: false,
    manageUserModal: false,
    currentViewTab: "Overview",
    isCreateUserModal: false,
    showRegisterRemoteCatalogModal: false,
    isRegisterSchemaEditModal: false,
    isRegisterSchemaNewModal: false,
    showHarvestWizard: false,
    showAccessInformation: false,

    isCreatingUser: false,
    // Create user form
    createUserForm: {
      username: "",
      email: "",
      password: "",
      showPassword: false,
      accessAreas: ["localCatalogue"],
      expiresInDays: null,
      validationError: null,
    },

    // Edit user modal
    isEditUserModal: false,
    isSavingUser: false,
    editUserForm: {
      userId: "",
      username: "",
      email: "",
      status: "active",
      accessAreas: ["localCatalogue"],
      expiresAt: null,
      validationError: null,
    },
    editUserBaseline: null,

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
      authLoginEndpoint: "",
      authUsername: "",
      authPassword: "",
      authPayloadTemplate: '{"email":"{{username}}","password":"{{password}}"}',
      authTokenPath: "token",
      authTokenInjection: "body",
      authTokenFieldName: "token",
      authTokenPrefix: "",
      authStaticToken: "",
      authApiKey: "",
      authApiKeyHeader: "X-API-Key",
      responseRootPath: "",
      responseAssetIdField: "",
      responseAssetNameField: "",
      responseAssetTypeField: "",
      // FR-CR-02 remote → local asset type mapping
      typeMapping: [],
      trustAnchor: "",
      enabled: true,
    },

    // JSON File Upload for Catalogue Registration
    isDraggingJson: false,
    uploadedJsonFile: null,
    jsonUploadError: "",

    // Pagination
    pagination: {
      catalog: { page: 1, perPage: 5 },
      schema: { page: 1, perPage: 5 },
      remoteSchema: { page: 1, perPage: 5 },
      catalogsRegister: { page: 1, perPage: 5 },
      users: { page: 1, perPage: 5 },
      harvest: { page: 1, perPage: 5 },
      provenance: { page: 1, perPage: 10 },
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
    viewingForm: 'both',  // FR-ACM-04: which form is shown in the View modal ('transformed' | 'original' | 'both')
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
    schemaRegistry: [],
    remoteSchemas: [],
    remoteSchemaLoading: false,
    catalogueIdToName: {},

    catalogsTable: [],

    // Asset Type Registry (FR-CR-02) — loaded from backend on mount
    assetTypes: [],
    isLoadingAssetTypes: false,
    isSavingAssetType: false,
    assetTypeError: "",
    assetTypeForm: { id: null, name: "", description: "", icon: "dataset" },
    isEditingAssetType: false,
    showAssetTypeForm: false,
    currentCatalogRegistryTab: "catalogues",

    // FR-CR-03 Catalogue API Mappings
    apiMappings: [],
    apiMappingPrompts: [],
    showApiMappingModal: false,
    apiMappingForm: {
      uniqueId: null,
      catalogueId: "",
      localTypeId: "",
      remoteType: "",
      promptId: "",
      apiRequest: { method: "GET", pathTemplate: "", queryParams: {}, headers: {}, bodyTemplate: null, notes: "" },
      queryParamsRaw: "{}",
      headersRaw: "{}",
    },
    isGeneratingApiMapping: false,
    isSavingApiMapping: false,
    apiMappingError: "",

    // Prompt Management (FR-SR-03, FR-SR-04)
    // Prompts are loaded from MongoDB on mount
    prompts: [
    ],
    showPromptModal: false,
    isEditingPrompt: false,
    promptForm: {
      id: null,
      name: "",
      version: "1.0",
      status: "draft",
      sourceSchema: "",
      targetSchema: "",
      template: "",
      examples: "",
      constraints: "",
      author: "",
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
    promptTestResolvedFromBackend: "",
    showBackendResolved: false,
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
    dcmRoles: [],  // Role definitions from dcm_roles collection

    harvestRecords: [],

    mappingRows: [],

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
    provenanceRows: [],
    provenanceSearch: "",
    provenanceFilters: { catalogue: "", strategy: "", mapped: "" },

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

    // Transformation Audit Trail (Section B)
    auditTrail: {
      rows: [],
      filters: { assetId: "", catalogueId: "", promptVersion: "", status: "", dateFrom: "", dateTo: "" },
      pagination: { page: 1, perPage: 20, total: 0 },
      loading: false,
      error: "",
      loaded: false,
    },

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
      rateLimits: "",
      timeout: 30,
      isDefault: false,
      precedence: 1,
      status: "active",
    },
    providerFormError: "",
    isSavingProvider: false,
    showProviderApiKey: false,
    providerSearch: "",

    // ── Milestone 2: Schema & Mapping Workflows ─────────────
    localSchemaSearch: "",
    remoteSchemaSearch: "",
    mappingSearch: "",
    mappingFilterCatalogue: "",
    mappingFilterRemoteSchema: "",
    mappingFilterLocalSchema: "",

    // RDF Mapping Config (FR-SR-06 / FR-SR-07)
    showRdfConfigPanel: false,
    rdfConfigMapping: null,
    rdfConfigSaving: false,
    rdfConfigForm: { namespacesToPreserve: [], shaclShapeSchemaId: "" },
    rdfConfigNewNamespace: "",
    rdfTestFormat: "turtle",
    rdfTestInput: "",
    rdfTestRunning: false,
    rdfTestResult: null,
    // FR-SR-08: Hybrid Fallback
    hybridTransformLoading: false,
    hybridTransformResult: null,

    // Local Schema create modal
    showCreateLocalSchemaModal: false,
    isEditingLocalSchema: false,
    editingLocalSchemaId: null,
    localSchemaForm: {
      schema: "",
      format: "SHACL",
      body: "",
      namespaces: "",
      status: "draft",
      catalogs: 1,
      localMapping: "",
      versioning: "1.0.0",
      trustLevel: "Federated",
    },
    localSchemaVersionsCache: {},
    showSchemaVersionPanel: false,
    schemaVersionPanelName: "",
    schemaVersionPanelLoading: false,
    validateSampleForm: { assetBody: "", result: null, loading: false },
    showPromptVersionPanel: false,
    promptVersionPanelName: "",
    promptVersionPanelLoading: false,
    promptVersions: [],
    systemSettings: {},
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
      remoteCatalogueId: "",
      remoteSchemaId: "",
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
    harvestDetailTab: "assets",

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

    // Blocking modal for delete-blocked-by-mapping
    deleteBlockedModal: {
      visible: false,
      title: "",
      message: "",
      mappings: [],
    },

    // ── Milestone 4: Admin Tools & Monitoring ──────────────────
    // Monitoring dashboard (live data from backend)
    monitoring: null,
    monitoringError: false,
    monitoringEventFilter: "all",
    monitoringAuditSearch: "",

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
