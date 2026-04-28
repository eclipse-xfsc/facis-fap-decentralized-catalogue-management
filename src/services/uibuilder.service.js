/**
 * FACIS service adapter
 * - Uses real window.uibuilder when available (Node-RED)
 * - Falls back to a mock that prevents errors and feeds sample data (FACIS Preview)
 */

function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

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

const _defaultCatalogs = [
  {
    uniqueId: "rc1",
    catalog: {
      catalogId: "rc1",
      catalogName: "SensorML Europe",
      owner: "EU Sensors Consortium",
      strategy: "deterministic-rdf",
      protocol: "DCAT Linked Data",
      baseEndpoint: "https://api.sensorml-eu.org/sparql",
      mimeType: "application/ld+json",
      enabled: true,
      updatedAt: "2025-11-20 14:30",
      sourceData: [
        { identifier: "sml-eu-001", title: "Temperature Sensor Berlin", "@type": "sml:PhysicalSystem", description: "Outdoor temperature monitoring station in Berlin-Mitte", domain: "Environment", theme: "Climate" },
        { identifier: "sml-eu-002", title: "Air Quality Monitor Munich", "@type": "sml:PhysicalSystem", description: "PM2.5 and PM10 air quality sensor in Munich city center", domain: "Environment", theme: "Air Quality" },
        { identifier: "sml-eu-003", title: "Wind Speed Station Hamburg", "@type": "sml:PhysicalSystem", description: "Anemometer station at Hamburg port", domain: "Environment", theme: "Climate" },
        { identifier: "sml-eu-004", title: "Humidity Sensor Frankfurt", "@type": "sml:PhysicalSystem", description: "Relative humidity sensor network in Frankfurt am Main", domain: "Environment", theme: "Climate" },
        { identifier: "sml-eu-005", title: "Pressure Monitor Dresden", "@type": "sml:PhysicalSystem", description: "Barometric pressure monitoring in Dresden", domain: "Environment", theme: "Climate" },
        { identifier: "sml-eu-006", title: "Radiation Sensor Cologne", "@type": "sml:PhysicalSystem", description: "Solar radiation measurement station in Cologne", domain: "Energy", theme: "Solar" },
        { identifier: "sml-eu-007", title: "Water Level Gauge Leipzig", "@type": "sml:PhysicalSystem", description: "River water level gauge on the White Elster", domain: "Environment", theme: "Hydrology" },
        { identifier: "sml-eu-008", title: "Noise Monitor Stuttgart", "@type": "sml:PhysicalSystem", description: "Urban noise level monitoring in Stuttgart", domain: "Health", theme: "Noise Pollution" },
        { identifier: "sml-eu-009", title: "CO2 Sensor Dusseldorf", "@type": "sml:PhysicalSystem", description: "Atmospheric CO2 concentration sensor in Dusseldorf", domain: "Environment", theme: "Air Quality" },
        { identifier: "sml-eu-010", title: "UV Index Station Bonn", "@type": "sml:PhysicalSystem", description: "UV index measurement station in Bonn", domain: "Health", theme: "Radiation" },
      ]
    }
  },
  {
    uniqueId: "rc2",
    catalog: {
      catalogId: "rc2",
      catalogName: "DCAT-AP Germany",
      owner: "GovData.de",
      strategy: "ai-driven",
      protocol: "Query interface",
      baseEndpoint: "https://govdata.de/ckan/api",
      mimeType: "application/sparql-results+json",
      enabled: true,
      updatedAt: "2025-12-01 09:15",
      sourceData: {
        "dcat:dataset": [
          { identifier: "govdata-001", title: "Land Use Map NRW", "@type": "dcat:Dataset", description: "Land use classification map for North Rhine-Westphalia", domain: "Geospatial", theme: "Land Use" },
          { identifier: "govdata-002", title: "Elevation Model Bavaria", "@type": "dcat:Dataset", description: "Digital elevation model for Bavaria at 1m resolution", domain: "Geospatial", theme: "Topography" },
          { identifier: "govdata-003", title: "River Network Dataset", "@type": "dcat:Dataset", description: "Complete river network dataset for Germany", domain: "Geospatial", theme: "Hydrology" },
          { identifier: "govdata-004", title: "Soil Classification Map", "@type": "dcat:Dataset", description: "National soil type classification map", domain: "Agriculture", theme: "Soil Science" },
          { identifier: "govdata-005", title: "Forest Coverage Index", "@type": "dcat:Dataset", description: "Annual forest coverage index for all federal states", domain: "Environment", theme: "Forestry" },
          { identifier: "govdata-006", title: "Urban Area Boundaries", "@type": "dcat:Dataset", description: "Official urban area boundary dataset", domain: "Geospatial", theme: "Administrative" },
          { identifier: "govdata-007", title: "Protected Areas Registry", "@type": "dcat:Dataset", description: "Registry of all nature protection areas in Germany", domain: "Environment", theme: "Conservation" },
          { identifier: "govdata-008", title: "Coastal Erosion Dataset", "@type": "dcat:Dataset", description: "Coastal erosion measurements for North Sea and Baltic coast", domain: "Geospatial", theme: "Coastal" },
          { identifier: "govdata-009", title: "Flood Risk Zones", "@type": "dcat:Dataset", description: "Flood risk zone mapping for major river basins", domain: "Environment", theme: "Disaster Risk" },
          { identifier: "govdata-010", title: "Agricultural Parcels", "@type": "dcat:Dataset", description: "Agricultural land parcel registration dataset", domain: "Agriculture", theme: "Land Use" },
        ]
      }
    }
  },
  {
    uniqueId: "rc3",
    catalog: {
      catalogId: "rc3",
      catalogName: "OGC Observations",
      owner: "OGC Foundation",
      strategy: "hybrid",
      protocol: "OAI-PMH",
      baseEndpoint: "https://ogc.org/api/observations",
      mimeType: "application/xml",
      enabled: true,
      updatedAt: "2025-10-18 16:45",
      sourceData: [
        { identifier: "ogc-obs-001", title: "DCAT Dataset Entry", "@type": "dcat:Dataset", description: "Standard DCAT dataset entry for OGC observations", domain: "Geospatial", theme: "Standards" },
        { identifier: "ogc-obs-002", title: "Metadata Record", "@type": "iso:MD_Metadata", description: "ISO 19115 metadata record for observation services", domain: "Geospatial", theme: "Metadata" },
        { identifier: "ogc-obs-003", title: "Service Description", "@type": "dcat:DataService", description: "OGC Web Service description document", domain: "Geospatial", theme: "Services" },
        { identifier: "ogc-obs-004", title: "Distribution Package", "@type": "dcat:Distribution", description: "Data distribution package for observation data", domain: "Geospatial", theme: "Distribution" },
        { identifier: "ogc-obs-005", title: "Data Series Record", "@type": "dcat:Dataset", description: "Time series observation data record", domain: "Climate", theme: "Time Series" },
        { identifier: "ogc-obs-006", title: "Feature Catalogue", "@type": "iso:MD_Metadata", description: "Feature catalogue for observation types", domain: "Geospatial", theme: "Features" },
        { identifier: "ogc-obs-007", title: "Application Schema", "@type": "sml:SimpleProcess", description: "Application schema for sensor observation processing", domain: "Geospatial", theme: "Schema" },
        { identifier: "ogc-obs-008", title: "Quality Report", "@type": "iso:MD_Metadata", description: "Data quality assessment report", domain: "Geospatial", theme: "Quality" },
      ]
    }
  }
];

// Persist mockCatalogs in localStorage so uploaded sourceData survives refresh
const _CATALOG_VERSION = 2; // Bump when default catalogue data changes
function _loadCatalogs() {
  try {
    const ver = parseInt(localStorage.getItem("facis_catalogs_v"), 10);
    if (ver === _CATALOG_VERSION) {
      const stored = JSON.parse(localStorage.getItem("facis_catalogs"));
      if (Array.isArray(stored) && stored.length > 0) return stored;
    }
  } catch (e) {}
  // Clear stale version and return fresh defaults
  try { localStorage.removeItem("facis_catalogs"); localStorage.removeItem("facis_local_assets"); localStorage.removeItem("facis_hv_runs"); localStorage.removeItem("facis_hv_logs"); localStorage.removeItem("facis_hv_provenance"); } catch (e) {}
  return JSON.parse(JSON.stringify(_defaultCatalogs));
}
function _saveCatalogs() {
  try { localStorage.setItem("facis_catalogs", JSON.stringify(mockCatalogs)); localStorage.setItem("facis_catalogs_v", String(_CATALOG_VERSION)); } catch (e) {}
}
let mockCatalogs = _loadCatalogs();

// ── Route resolution map ────────────────────────────────────────
// Maps each msg.type to a route key used by the Node-RED router switch.
// Add new entries here when introducing new message types.
const ROUTE_MAP = {
  // Dashboard / Auth
  getDashboard:           'dashboard',
  login:                  'auth',
  checkAuth:              'auth',
  logOut:                 'auth',

  // Admin Tools
  createUser:             'admin-tools',
  getAdminTools:          'admin-tools',
  listUsers:              'admin-tools',
  getUserDetail:          'admin-tools',
  updateUser:             'admin-tools',
  updateUserPassword:     'admin-tools',
  deleteUser:             'admin-tools',
  listRoles:              'admin-tools',
  createRole:             'admin-tools',
  updateRole:             'admin-tools',
  deleteRole:             'admin-tools',
  listAudit:              'admin-tools',
  getMonitoringOverview:  'admin-tools',

  // Auth (new endpoints)
  hydrateSession:         'auth',
  changePassword:         'auth',

  // Catalogue Registry
  getCatalogRegistry:     'catalogue-registry',
  registerRemoteCatalog:  'catalogue-registry',
  updateRemoteCatalog:    'catalogue-registry',
  deleteRemoteCatalog:    'catalogue-registry',
  uploadCatalogJson:      'catalogue-registry',
  listAssetTypes:         'catalogue-registry',
  saveAssetType:          'catalogue-registry',
  updateAssetType:        'catalogue-registry',
  deleteAssetType:        'catalogue-registry',
  testRemoteCatalogConnection:  'catalogue-registry',
  // FR-CR-03 API Mappings
  listApiMappings:              'catalogue-registry',
  saveApiMapping:               'catalogue-registry',
  deleteApiMapping:             'catalogue-registry',
  generateApiMappingWithAi:     'catalogue-registry',

  // Local Catalogue
  getLocalCatalogue:      'local-catalogue',
  deleteLocalAsset:       'local-catalogue',
  updateLocalAsset:       'local-catalogue',
  getLocalProvenance:     'local-catalogue',
  getLocalAssetDetail:    'local-catalogue',
  getLocalStats:          'local-catalogue',

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
  clearHarvestHistory:    'harvest',

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

  // Schema Registry – Local Schema & Mapping CRUD
  saveLocalSchema:        'schema-registry',
  listLocalSchemas:       'schema-registry',
  deleteLocalSchema:      'schema-registry',
  saveMapping:            'schema-registry',
  listMappings:           'schema-registry',
  deleteMapping:          'schema-registry',
  saveRemoteSchema:       'schema-registry',
  listRemoteSchemas:      'schema-registry',
  deleteRemoteSchema:     'schema-registry',
  listLocalSchemaVersions:   'schema-registry',
  activateLocalSchemaVersion: 'schema-registry',
  validateSampleAsset:       'schema-registry',
  listTransformationAudit:  'schema-registry',
  exportTransformationAudit: 'schema-registry',
  listPromptVersions:        'schema-registry',
  getLlmUsage:               'schema-registry',
  getSystemSettings:         'schema-registry',
  setSystemSetting:          'schema-registry',
  saveRdfMappingConfig:      'schema-registry',
  testRdfMapping:            'schema-registry',
  executeHybridTransform:    'schema-registry',
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

  if (msg.type === "getMonitoringOverview") {
    dispatchMsg({ payload: { response: {
      action: "getMonitoringOverview",
      ok: true,
      status: "success",
      data: {
        generatedAt: new Date().toISOString(),
        users: { total: 5, active: 3, disabled: 1, expired: 1 },
        sessions: { active: 2 },
        activity24h: { logins: 8, loginsFailed: 2, loginsBlockedDisabled: 1, userUpdates: 3, userDeletions: 0 },
        audit7dCount: 42,
        modules: [
          { module: "SchemaRegistry", status: "up", lastSeen: new Date().toISOString() },
          { module: "CatalogueRegistry", status: "up", lastSeen: new Date().toISOString() },
          { module: "Harvester", status: "up", lastSeen: new Date().toISOString() },
          { module: "AdminTools", status: "up", lastSeen: new Date().toISOString() },
          { module: "Auth", status: "up", lastSeen: new Date().toISOString() },
          { module: "LocalCatalogue", status: "up", lastSeen: new Date().toISOString() }
        ],
        recentAudit: [
          { at: new Date().toISOString(), action: "login.success", actor: "admin", target: "admin", meta: null },
          { at: new Date(Date.now() - 60000).toISOString(), action: "updateUser", actor: "admin", target: "editor1", meta: '{"status":"active"}' },
          { at: new Date(Date.now() - 120000).toISOString(), action: "createUser", actor: "admin", target: "viewer1", meta: null },
          { at: new Date(Date.now() - 300000).toISOString(), action: "login.failed", actor: "unknown", target: "unknown", meta: null },
          { at: new Date(Date.now() - 600000).toISOString(), action: "login.blocked.disabled", actor: "disabledUser", target: "disabledUser", meta: null }
        ]
      }
    } } });
  }

  if (msg.type === "listUsers") {
    var listUserRows = mockUsers.map(function(u, i) {
      var areas = u.access || [];
      var allFive = ['local_catalogue','catalogue_registry','schema_registry','admin_tools','harvester'];
      var accessLabel = 'No Access';
      if (allFive.every(function(a){return areas.indexOf(a) >= 0;})) { accessLabel = 'Full Access'; }
      else { accessLabel = areas.map(function(a){return a.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}).join(' + ') || 'No Access'; }
      return {
        uniqueId: u.uniqueId,
        _id: u.uniqueId,
        username: u.email.split("@")[0],
        email: u.email,
        name: (u.profile ? u.profile.firstName + " " + u.profile.lastName : u.email),
        status: u.status || "Active",
        roles: ["viewer"],
        access: areas,
        accessAreas: areas,
        accessLabel: accessLabel,
        expiresAt: null,
        createdAt: "2026-01-01",
      };
    });
    dispatchMsg({
      payload: {
        response: {
          action: "listUsers",
          ok: true,
          status: "success",
          users: listUserRows
        }
      }
    });
  }

  if (msg.type === "listRoles") {
    dispatchMsg({
      payload: {
        response: {
          action: "listRoles",
          ok: true,
          status: "success",
          roles: [
            { id: "r1", key: "admin", name: "Administrator", description: "Full system access", permissions: ["*"], system: true },
            { id: "r2", key: "editor", name: "Editor", description: "Can create and update", permissions: ["catalogue.registry.read", "catalogue.registry.create"], system: true },
            { id: "r3", key: "viewer", name: "Viewer", description: "Read-only access", permissions: ["catalogue.registry.read"], system: true }
          ]
        }
      }
    });
  }

  if (msg.type === "createUser") {
    const id = msg.data || {};
    const now = new Date().toISOString();
    const areas = id.accessAreas || [];
    const allFive = ['localCatalogue','catalogueRegistry','schemaRegistry','adminTools','harvest'];
    let accessLabel = 'No Access';
    if (allFive.every(a => areas.includes(a))) { accessLabel = 'Full Access'; }
    else {
      const lm = { localCatalogue:'Local Catalogue', catalogueRegistry:'Catalogue Registry', schemaRegistry:'Schema Registry', adminTools:'Admin Tools', harvest:'Harvest' };
      accessLabel = ['localCatalogue','catalogueRegistry','schemaRegistry','adminTools','harvest'].filter(a => areas.includes(a)).map(a => lm[a]).join(' + ') || 'No Access';
    }
    let expiresAt = null;
    if (id.expiresInDays && Number(id.expiresInDays) > 0) expiresAt = new Date(Date.now() + Number(id.expiresInDays) * 86400000).toISOString();
    const uid = 'mock-u-' + Date.now().toString(36);
    dispatchMsg({
      payload: {
        response: {
          action: "createUser",
          ok: true,
          status: "success",
          user: {
            _id: uid,
            uniqueId: uid,
            email: id.email || null,
            username: id.username || "",
            status: "active",
            accessAreas: areas,
            accessLabel: accessLabel,
            expiresAt: expiresAt,
            roles: ["custom:mock"],
            createdAt: now,
            updatedAt: now
          }
        }
      }
    });
  }

  if (msg.type === "updateUser") {
    const id = msg.data || {};
    const areas = id.accessAreas || [];
    const allFive = ['localCatalogue','catalogueRegistry','schemaRegistry','adminTools','harvest'];
    let accessLabel = 'No Access';
    if (allFive.every(a => areas.includes(a))) { accessLabel = 'Full Access'; }
    else {
      const lm = { localCatalogue:'Local Catalogue', catalogueRegistry:'Catalogue Registry', schemaRegistry:'Schema Registry', adminTools:'Admin Tools', harvest:'Harvest' };
      accessLabel = ['localCatalogue','catalogueRegistry','schemaRegistry','adminTools','harvest'].filter(a => areas.includes(a)).map(a => lm[a]).join(' + ') || 'No Access';
    }
    dispatchMsg({
      payload: {
        response: {
          action: "updateUser",
          ok: true,
          status: "success",
          user: {
            _id: id.userId || 'mock',
            uniqueId: id.userId || 'mock',
            username: id.username || '',
            email: id.email || null,
            status: id.status || 'active',
            accessAreas: areas,
            accessLabel: accessLabel,
            expiresAt: id.expiresAt || null,
            roles: ['custom:mock'],
            updatedAt: new Date().toISOString()
          }
        }
      }
    });
  }

  if (msg.type === "deleteUser") {
    const id = msg.data || {};
    const delId = id.userId || id.uniqueId || id._id;
    dispatchMsg({
      payload: {
        response: {
          action: "deleteUser",
          ok: true,
          status: "success",
          uniqueId: delId
        }
      }
    });
  }

  if (msg.type === "listAssetTypes") {
    const items = JSON.parse(localStorage.getItem("mock_asset_types") || "[]");
    dispatchMsg({ payload: { response: { action: "listAssetTypes", status: "success", items } } });
  }

  if (msg.type === "saveAssetType") {
    const items = JSON.parse(localStorage.getItem("mock_asset_types") || "[]");
    const d = msg.data || {};
    const uid = "at_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const item = {
      uniqueId: uid,
      name: d.name || "",
      description: d.description || "",
      icon: d.icon || "dataset",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(item);
    localStorage.setItem("mock_asset_types", JSON.stringify(items));
    dispatchMsg({ payload: { response: { action: "saveAssetType", status: "success", uniqueId: uid, item } } });
  }

  if (msg.type === "updateAssetType") {
    const items = JSON.parse(localStorage.getItem("mock_asset_types") || "[]");
    const d = msg.data || {};
    const idx = items.findIndex(it => it.uniqueId === d.uniqueId);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...(d.patch || {}), updatedAt: new Date().toISOString() };
      localStorage.setItem("mock_asset_types", JSON.stringify(items));
      dispatchMsg({ payload: { response: { action: "updateAssetType", status: "success", uniqueId: d.uniqueId, patch: d.patch || {} } } });
    } else {
      dispatchMsg({ payload: { response: { action: "updateAssetType", status: "error", message: "Not found" } } });
    }
  }

  if (msg.type === "deleteAssetType") {
    const items = JSON.parse(localStorage.getItem("mock_asset_types") || "[]");
    const d = msg.data || {};
    const filtered = items.filter(it => it.uniqueId !== d.uniqueId);
    localStorage.setItem("mock_asset_types", JSON.stringify(filtered));
    dispatchMsg({ payload: { response: { action: "deleteAssetType", status: "success", uniqueId: d.uniqueId } } });
  }

  if (msg.type === "registerRemoteCatalog") {
    const uid = "mock-rc-" + Date.now();
    const d = msg.data || {};
    // Add to mockCatalogs so getHarvestCatalogues returns it
    mockCatalogs.push({
      uniqueId: uid,
      catalog: {
        catalogId: d.catalogId || uid,
        catalogName: d.catalogName || "New Catalogue",
        owner: d.owner || "",
        strategy: d.strategy || "none",
        baseEndpoint: d.baseEndpoint || d.queryEndpoint || "",
        protocol: d.protocol || "Query interface",
        mimeType: d.mimeType || "",
        queryEndpoint: d.queryEndpoint || "",
        queryLanguages: d.queryLanguages || "",
        dcatCatalogUri: d.dcatCatalogUri || "",
        linkedDataEndpoint: d.linkedDataEndpoint || "",
        metadataPrefix: d.metadataPrefix || "",
        auth: d.auth || "none",
        authLoginEndpoint: d.authLoginEndpoint || "",
        authUsername: d.authUsername || "",
        authPassword: d.authPassword || "",
        authPayloadTemplate: d.authPayloadTemplate || "",
        authTokenPath: d.authTokenPath || "token",
        authTokenInjection: d.authTokenInjection || "body",
        authTokenFieldName: d.authTokenFieldName || "token",
        authTokenPrefix: d.authTokenPrefix || "",
        authStaticToken: d.authStaticToken || "",
        authApiKey: d.authApiKey || "",
        authApiKeyHeader: d.authApiKeyHeader || "X-API-Key",
        responseRootPath: d.responseRootPath || "",
        responseAssetIdField: d.responseAssetIdField || "",
        responseAssetNameField: d.responseAssetNameField || "",
        responseAssetTypeField: d.responseAssetTypeField || "",
        trustAnchor: d.trustAnchor || "",
        promptId: d.promptId || "",
        llmConfigId: d.llmConfigId || "",
        namespacesToPreserve: d.namespacesToPreserve || "",
        shaclShapeId: d.shaclShapeId || "",
        enabled: d.enabled !== false,
        // Persist uploaded JSON source data for harvest
        sourceData: d.sourceData || null,
        sourceFileName: d.sourceFileName || "",
        updatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      }
    });
    _saveCatalogs();
    dispatchMsg({
      payload: {
        response: {
          action: "registerRemoteCatalog",
          status: "success",
          uniqueId: uid
        }
      }
    });
  }

  if (msg.type === "deleteRemoteCatalog") {
    const delId = msg.data?.uniqueId;
    // Remove from mockCatalogs so it disappears from harvest list too
    mockCatalogs = mockCatalogs.filter(c => c.uniqueId !== delId);
    _saveCatalogs();
    dispatchMsg({
      payload: {
        data: msg.data,
        response: {
          action: "deleteRemoteCatalog",
          status: "success",
          uniqueId: delId
        }
      }
    });
  }

  if (msg.type === "uploadCatalogJson") {
    const catalogs = (msg.data?.catalogs || []).map((c, i) => {
      const uid = "mock-upload-" + Date.now() + "-" + i;
      const entry = { uniqueId: uid, catalog: { ...c, catalogId: c.catalogId || uid, enabled: c.enabled !== false } };
      // Add to mockCatalogs for harvest
      mockCatalogs.push(entry);
      return entry;
    });
    _saveCatalogs();
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
    // Update the catalogue in mockCatalogs
    const updId = msg.data?.uniqueId;
    const patch = msg.data?.patch || msg.data || {};
    const idx = mockCatalogs.findIndex(c => c.uniqueId === updId);
    if (idx !== -1) {
      Object.assign(mockCatalogs[idx].catalog, patch);
      _saveCatalogs();
    }
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

  if (msg.type === "login") {
    const d = msg.data || {};
    if (d.username === "admin" && d.password === "1234") {
      const token = "mock-token-" + Date.now().toString(36);
      dispatchMsg({ payload: { response: {
        action: "login",
        status: "success",
        token: token,
        user: {
          username: "admin",
          role: "Administrator",
          email: "admin@facis.eu",
          access: ["local_catalogue", "catalogue_registry", "schema_registry", "admin_tools", "harvester"],
          accessAreas: ["localCatalogue", "catalogueRegistry", "schemaRegistry", "adminTools", "harvest"],
          roles: ["admin"],
          permissions: ["*"]
        }
      } } });
    } else {
      dispatchMsg({ payload: { response: {
        action: "login",
        status: "error",
        message: "Invalid username or password."
      } } });
    }
  }

  if (msg.type === "checkAuth") {
    const token = msg.data?.token || "";
    if (token && token.startsWith("mock-token-")) {
      dispatchMsg({ payload: { response: {
        action: "checkAuth",
        status: "success",
        user: {
          username: "admin",
          role: "Administrator",
          email: "admin@facis.eu",
          access: ["local_catalogue", "catalogue_registry", "schema_registry", "admin_tools", "harvester"],
          accessAreas: ["localCatalogue", "catalogueRegistry", "schemaRegistry", "adminTools", "harvest"],
          roles: ["admin"],
          permissions: ["*"]
        }
      } } });
    } else {
      dispatchMsg({ payload: { response: {
        action: "checkAuth",
        status: "error",
        message: "Session expired or invalid."
      } } });
    }
  }

  if (msg.type === "logOut") {
    dispatchMsg({ payload: { response: {
      action: "logOut",
      status: "success"
    } } });
  }

  // ── Persistent harvest data stores (backed by localStorage) ──
  // These simulate MongoDB collections: hv_runs, local_assets, hv_logs, hv_provenance
  function _loadStore(key) { try { return JSON.parse(localStorage.getItem("facis_" + key)) || []; } catch(e) { return []; } }
  function _saveStore(key, arr) { try { localStorage.setItem("facis_" + key, JSON.stringify(arr)); } catch(e) {} }

  if (!createMockResponder._harvestRuns) createMockResponder._harvestRuns = _loadStore("hv_runs");
  if (!createMockResponder._localAssets) createMockResponder._localAssets = _loadStore("local_assets");
  if (!createMockResponder._harvestLogs) createMockResponder._harvestLogs = _loadStore("hv_logs");
  if (!createMockResponder._harvestProvenance) createMockResponder._harvestProvenance = _loadStore("hv_provenance");

  // Asset name templates per domain
  const _assetNames = {
    sensor: ["Temperature Sensor Berlin", "Air Quality Monitor Munich", "Wind Speed Station Hamburg", "Humidity Sensor Frankfurt", "Pressure Monitor Dresden", "Radiation Sensor Cologne", "Water Level Gauge Leipzig", "Noise Monitor Stuttgart", "CO2 Sensor Dusseldorf", "UV Index Station Bonn"],
    geo: ["Land Use Map NRW", "Elevation Model Bavaria", "River Network Dataset", "Soil Classification Map", "Forest Coverage Index", "Urban Area Boundaries", "Protected Areas Registry", "Coastal Erosion Dataset", "Flood Risk Zones", "Agricultural Parcels"],
    catalog: ["DCAT Dataset Entry", "Metadata Record", "Service Description", "Distribution Package", "Data Series Record", "Feature Catalogue", "Application Schema", "Quality Report", "Lineage Description", "Constraint Document"]
  };
  const _assetTypes = ["dcat:Dataset", "sml:PhysicalSystem", "iso:MD_Metadata", "dcat:DataService", "dcat:Distribution", "sml:SimpleProcess"];
  const _domains = ["Environment", "Climate", "Geospatial", "Transport", "Energy", "Health", "Agriculture"];
  const _statuses = ["Active", "Active", "Active", "Pending Review", "Transformed"];

  function _pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function _ts() { return new Date().toISOString().replace("T", " ").slice(0, 16); }

  // Extract importable entries from uploaded catalogue JSON source data.
  // Helper: resolve a dotted path like "data.items" on an object
  function _resolvePath(obj, path) {
    if (!path || !obj) return obj;
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[p];
    }
    return cur;
  }

  // Supports common catalogue JSON structures: arrays, DCAT datasets, nested records.
  function _extractEntriesFromSource(data, rootPath) {
    if (!data || typeof data !== "object") return [];
    // If a responseRootPath is configured, use it first
    if (rootPath) {
      const resolved = _resolvePath(data, rootPath);
      if (Array.isArray(resolved)) return resolved;
      if (resolved && typeof resolved === "object") return [resolved];
    }
    // If data is already an array of entries
    if (Array.isArray(data)) return data;
    // DCAT-style: { "dcat:dataset": [...] } or { "dataset": [...] }
    if (Array.isArray(data["dcat:dataset"])) return data["dcat:dataset"];
    if (Array.isArray(data.dataset)) return data.dataset;
    if (Array.isArray(data.datasets)) return data.datasets;
    // Common wrapper: { "data": [...] }
    if (Array.isArray(data.data)) return data.data;
    // CKAN-style: { "result": { "results": [...] } } or { "results": [...] }
    if (Array.isArray(data.results)) return data.results;
    if (data.result && Array.isArray(data.result.results)) return data.result.results;
    // Generic: { "records": [...] }, { "items": [...] }, { "entries": [...] }, { "assets": [...] }, { "catalogs": [...] }
    if (Array.isArray(data.records)) return data.records;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.entries)) return data.entries;
    if (Array.isArray(data.assets)) return data.assets;
    if (Array.isArray(data.catalogs)) return data.catalogs;
    // Single object with identifiable fields — treat as one entry
    if (data.title || data.name || data.identifier || data["@type"]) return [data];
    // Non-standard API record: objects with _id, requestId, companyDetails, etc.
    if (data._id || data.requestId != null || data.companyDetails) return [data];
    // Try first array-valued property that looks like a data collection (skip small metadata arrays)
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === "object") {
        // Skip arrays that look like audit/approval metadata, not data entries
        const skipKeys = ["auditInfo","approveInfo","decisionHistory","errors","warnings","logs"];
        if (!skipKeys.includes(key)) return data[key];
      }
    }
    return [];
  }

  if (msg.type === "getHarvestCatalogues") {
    const catalogs = mockCatalogs
      .filter(c => c.catalog?.enabled !== false)
      .map(c => ({
        uniqueId: c.uniqueId,
        catalogId: c.catalog.catalogId || c.uniqueId,
        catalogName: c.catalog.catalogName || c.catalog.catalogId || c.uniqueId,
        owner: c.catalog.owner || "",
        strategy: c.catalog.strategy || "none",
        baseEndpoint: c.catalog.baseEndpoint || c.catalog.queryEndpoint || "",
        enabled: c.catalog.enabled !== false,
        protocol: c.catalog.protocol || "Query interface",
        mimeType: c.catalog.mimeType || "",
        updatedAt: c.catalog.updatedAt || "",
      }));
    dispatchMsg({ payload: { response: { action: "getHarvestCatalogues", status: "success", catalogs } } });
  }

  if (msg.type === "startHarvest") {
    const runId = "run-" + Date.now().toString(36);
    const selectedCats = msg.data?.catalogues || [];
    const catNames = selectedCats.map(c => c.catalogName).join(", ");
    const scope = msg.data?.scope || {};
    const lifecycle = msg.data?.lifecycle || {};
    const startedAt = _ts();

    function _extractAssetName(srcEntry, nameField) {
      if (!srcEntry || typeof srcEntry !== "object") return "Unknown Asset";
      // 1. Configured field path (e.g. "companyDetails.A.1.1.1")
      if (nameField) { const v = _resolvePath(srcEntry, nameField); if (v && typeof v === "string" && v.trim()) return v; }
      // 2. Standard top-level name fields
      const cands = ["title","name","catalogName","label","displayName","companyName","organisationName","organization","fullName","shortName","legalName","tradingName","firma"];
      for (const f of cands) { if (srcEntry[f] && typeof srcEntry[f] === "string" && srcEntry[f].trim()) return srcEntry[f]; }
      // 3. Nested companyDetails with known identity fields (e.g. Trusted Cloud / SRS format)
      const cd = srcEntry.companyDetails;
      if (cd && typeof cd === "object") {
        // A.1.1.1 = company name, A.2.1.1 = service name in SRS format
        if (cd["A.1.1.1"] && typeof cd["A.1.1.1"] === "string") return cd["A.1.1.1"];
        if (cd["A.2.1.1"] && typeof cd["A.2.1.1"] === "string") return cd["A.2.1.1"];
        // Also try standard name fields inside companyDetails
        for (const f of cands) { if (cd[f] && typeof cd[f] === "string" && cd[f].trim()) return cd[f]; }
      }
      // 4. createdBy.fullName
      if (srcEntry.createdBy?.fullName && typeof srcEntry.createdBy.fullName === "string") return srcEntry.createdBy.fullName;
      // 5. Nested metadata containers (look for name-like fields in any nested object)
      for (const key of Object.keys(srcEntry)) {
        const nested = srcEntry[key];
        if (nested && typeof nested === "object" && !Array.isArray(nested)) {
          for (const f of cands) { if (nested[f] && typeof nested[f] === "string" && nested[f].trim()) return nested[f]; }
        }
      }
      // 6. Top-level string fallback (skip IDs, dates, hex strings, short codes)
      for (const key of Object.keys(srcEntry)) {
        const val = srcEntry[key];
        if (typeof val === "string" && val.length > 2 && val.length < 200
            && !/^[\d\-:.TZ]+$/.test(val)
            && !/^[0-9a-f]{24}$/i.test(val)
            && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(val)
            && !key.startsWith("_")) return val;
      }
      // 7. description as last resort
      if (srcEntry.description && typeof srcEntry.description === "string") return srcEntry.description.slice(0, 120);
      return "Unknown Asset";
    }

    function _buildAsset(srcEntry, cat, idField, nameField, typeField, idx) {
      if (!srcEntry || typeof srcEntry !== "object") return null;
      const assetId = "asset-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      const remoteId = String((idField ? _resolvePath(srcEntry, idField) : null) || srcEntry?.identifier || srcEntry?.id || srcEntry?._id || srcEntry?.requestId || ("remote-" + Math.random().toString(36).slice(2, 10)));
      // Resolve asset type: configured field > @type > type > companyDetails.A.1.1.0 (SRS) > fallback
      const cd = srcEntry?.companyDetails;
      const assetType = String((typeField ? _resolvePath(srcEntry, typeField) : null) || srcEntry?.["@type"] || srcEntry?.type || (cd?.["A.1.1.0"]) || (cd?.["A.2.1.4"]) || "dcat:Dataset");
      // Resolve domain: standard fields > companyDetails service description > catalogue name
      const domain = srcEntry?.domain || srcEntry?.theme || srcEntry?.category || (cd?.["A.2.1.4"]) || cat.catalogName || "";
      const assetName = _extractAssetName(srcEntry, nameField);
      const now = _ts();
      return {
        asset: { id: assetId, assets: assetName, title: assetName, type: assetType, name: cat.catalogName || "Unknown", domain, updated: now, integrationStatus: scope.schemaMappingEnabled ? "Transformed" : "Active", sourceCatalogue: cat.catalogName || cat.uniqueId, sourceCatalogueId: cat.uniqueId, harvestRunId: runId, remoteAssetId: remoteId, originalForm: srcEntry, transformedForm: scope.schemaMappingEnabled ? { "@type": "dcat:Dataset", "dct:identifier": assetId, "dct:title": assetName } : null },
        provenance: { id: "prov-" + assetId, assetId, remoteAssetId: remoteId, runId, catalogueId: cat.uniqueId, catalogueName: cat.catalogName, harvestDate: now, strategy: cat.strategy || "none", schemaMapped: !!scope.schemaMappingEnabled },
        log: { id: "log-" + Date.now().toString(36) + "-" + idx, runId, level: "info", timestamp: now, catalogueId: cat.uniqueId, catalogueName: cat.catalogName, message: "Imported: " + assetName },
      };
    }

    function _finalizeHarvest(assets, logs, provenance) {
      createMockResponder._localAssets.push(...assets);
      createMockResponder._harvestLogs.push(...logs);
      createMockResponder._harvestProvenance.push(...provenance);
      _saveStore("local_assets", createMockResponder._localAssets);
      _saveStore("hv_logs", createMockResponder._harvestLogs);
      _saveStore("hv_provenance", createMockResponder._harvestProvenance);
      const runCatalogues = selectedCats.map(c => { const { sourceData: _sd, ...rest } = c; return rest; });
      const run = { uniqueId: runId, catalogueName: catNames || "Harvest", catalogues: runCatalogues, scope, lifecycle, status: "completed", startedAt, totalAssets: assets.length, assetsAdded: assets.length, successCount: assets.length, errorCount: 0, duration: Math.floor(1 + Math.random() * 5) + "m " + Math.floor(Math.random() * 59) + "s", result: "Success", tool: "Harvester", assetIds: assets.map(a => a.id) };
      createMockResponder._harvestRuns.unshift(run);
      _saveStore("hv_runs", createMockResponder._harvestRuns);
      const allStored = createMockResponder._localAssets || [];
      const allProv = createMockResponder._harvestProvenance || [];
      const allRunIds = new Set(allStored.map(a => a.harvestRunId).filter(Boolean));
      dispatchMsg({ payload: { response: { action: "startHarvest", status: "success", run, allAssets: allStored, allProvenance: allProv, totalAssets: allStored.length, totalRuns: allRunIds.size } } });
      setTimeout(() => { dispatchMsg({ payload: { response: { action: "harvestProgress", runId, status: "completed", catalogueName: catNames || "Harvest", progress: 100, totalAssets: assets.length, processedAssets: assets.length, successCount: assets.length, errorCount: 0, startedAt } } }); }, 500);
      setTimeout(() => { const fresh = createMockResponder._localAssets || []; const fRunIds = new Set(fresh.map(a => a.harvestRunId).filter(Boolean)); dispatchMsg({ payload: { response: { action: "getLocalCatalogue", status: "success", assets: fresh, totalAssets: fresh.length, totalRuns: fRunIds.size } } }); dispatchMsg({ payload: { response: { action: "listHarvestProvenance", status: "success", provenance: createMockResponder._harvestProvenance || [] } } }); }, 700);
    }

    const allAssets = [];
    const allLogs = [];
    const allProvenance = [];
    console.log("[facis-harvest] Starting harvest for", selectedCats.length, "catalogue(s):", selectedCats.map(c => c.catalogName));
    const catPromises = selectedCats.map(async (cat) => {
      const storedCat = mockCatalogs.find(c => c.uniqueId === cat.uniqueId);
      const catConfig = storedCat?.catalog || {};
      const rootPath = cat.responseRootPath || catConfig.responseRootPath || "";
      const idField = cat.responseAssetIdField || catConfig.responseAssetIdField || "";
      const nameField = cat.responseAssetNameField || catConfig.responseAssetNameField || "";
      const typeField = cat.responseAssetTypeField || catConfig.responseAssetTypeField || "";
      let sourceData = cat.sourceData || catConfig.sourceData || null;
      console.log("[facis-harvest]", cat.catalogName, "| sourceData:", sourceData ? (Array.isArray(sourceData) ? sourceData.length + " items (array)" : "object") : "null", "| storedCat:", !!storedCat);
      if (!sourceData) {
        const endpoint = cat.baseEndpoint || catConfig.baseEndpoint || catConfig.queryEndpoint || "";
        if (endpoint) {
          console.log("[facis-harvest]", cat.catalogName, "| No sourceData — attempting live API fetch from:", endpoint);
          try {
            // Merge auth config from payload (preferred) and stored catalogue
            const authType = cat.auth || catConfig.auth || "none";
            const hdrs = { "Accept": "application/json" };
            if (authType === "static-token") {
              const tok = cat.authStaticToken || catConfig.authStaticToken;
              if (tok) hdrs["Authorization"] = (cat.authTokenPrefix || catConfig.authTokenPrefix || "Bearer") + " " + tok;
            } else if (authType === "api-key") {
              const key = cat.authApiKey || catConfig.authApiKey;
              if (key) hdrs[cat.authApiKeyHeader || catConfig.authApiKeyHeader || "X-API-Key"] = key;
            } else if (authType === "token-login") {
              const loginUrl = cat.authLoginEndpoint || catConfig.authLoginEndpoint;
              if (loginUrl) {
                try {
                  let body = (cat.authPayloadTemplate || catConfig.authPayloadTemplate || '{"email":"{{username}}","password":"{{password}}"}')
                    .replace("{{username}}", cat.authUsername || catConfig.authUsername || "")
                    .replace("{{password}}", cat.authPassword || catConfig.authPassword || "");
                  const lr = await fetch(loginUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body });
                  if (lr.ok) { const ld = await lr.json(); const tok = _resolvePath(ld, cat.authTokenPath || catConfig.authTokenPath || "token"); if (tok) hdrs["Authorization"] = (cat.authTokenPrefix || catConfig.authTokenPrefix || "Bearer") + " " + tok; }
                } catch (e) { allLogs.push({ id: "log-auth-" + cat.uniqueId, runId, level: "warning", timestamp: _ts(), catalogueId: cat.uniqueId, catalogueName: cat.catalogName, message: "Auth login failed: " + e.message }); }
              }
            }
            const r = await fetch(endpoint, { headers: hdrs });
            if (r.ok) {
              sourceData = await r.json();
              // Cache fetched data so subsequent harvests don't need to re-fetch
              if (storedCat?.catalog) { storedCat.catalog.sourceData = sourceData; _saveCatalogs(); }
              allLogs.push({ id: "log-fetch-" + cat.uniqueId, runId, level: "info", timestamp: _ts(), catalogueId: cat.uniqueId, catalogueName: cat.catalogName, message: "Fetched " + (Array.isArray(sourceData) ? sourceData.length + " records" : "data") + " from " + endpoint });
            } else {
              allLogs.push({ id: "log-fetcherr-" + cat.uniqueId, runId, level: "error", timestamp: _ts(), catalogueId: cat.uniqueId, catalogueName: cat.catalogName, message: "HTTP " + r.status + " from " + endpoint });
            }
          } catch (e) {
            const isCors = e.message && (e.message.includes("Failed to fetch") || e.message.includes("NetworkError") || e.message.includes("CORS"));
            const detail = isCors
              ? "API unreachable (likely CORS). Upload the API response as JSON when registering the catalogue."
              : "Fetch error: " + e.message;
            console.warn("[facis-harvest]", cat.catalogName, "|", detail);
            allLogs.push({ id: "log-fetcherr-" + cat.uniqueId, runId, level: "error", timestamp: _ts(), catalogueId: cat.uniqueId, catalogueName: cat.catalogName, message: detail });
          }
        } else {
          console.warn("[facis-harvest]", cat.catalogName, "| No sourceData and no endpoint configured — nothing to harvest");
          allLogs.push({ id: "log-nosrc-" + cat.uniqueId, runId, level: "warning", timestamp: _ts(), catalogueId: cat.uniqueId, catalogueName: cat.catalogName, message: "No source data and no endpoint configured" });
        }
      }
      const entries = sourceData ? _extractEntriesFromSource(sourceData, rootPath) : [];
      console.log("[facis-harvest]", cat.catalogName, "| entries extracted:", entries.length, entries.length > 0 ? "(first keys: " + Object.keys(entries[0] || {}).slice(0, 5).join(", ") + ")" : "");
      for (let i = 0; i < entries.length; i++) { const result = _buildAsset(entries[i], cat, idField, nameField, typeField, i); if (result) { allAssets.push(result.asset); allProvenance.push(result.provenance); allLogs.push(result.log); console.log("[facis-harvest]  asset", i, ":", result.asset.assets, "(id:", result.asset.remoteAssetId + ")"); } }
      allLogs.push({ id: "log-done-" + cat.uniqueId, runId, level: "info", timestamp: startedAt, catalogueId: cat.uniqueId, catalogueName: cat.catalogName, message: "Harvest completed for " + cat.catalogName + ": " + entries.length + " assets" + (sourceData ? "" : " (no source data)") });
    });
    Promise.all(catPromises)
      .then(() => _finalizeHarvest(allAssets, allLogs, allProvenance))
      .catch(err => { console.error("[facis-service] startHarvest ERROR:", err); dispatchMsg({ payload: { response: { action: "startHarvest", status: "error", message: "Harvest error: " + err.message } } }); });
  }

  if (msg.type === "listHarvestRuns") {
    dispatchMsg({ payload: { response: { action: "listHarvestRuns", status: "success", runs: createMockResponder._harvestRuns } } });
  }

  if (msg.type === "getHarvestRunDetail") {
    const runId = msg.data?.runId;
    const run = createMockResponder._harvestRuns.find(r => r.uniqueId === runId);
    if (run) {
      const runAssets = createMockResponder._localAssets.filter(a => a.harvestRunId === runId);
      const runLogs = createMockResponder._harvestLogs.filter(l => l.runId === runId);
      const runProvenance = createMockResponder._harvestProvenance.filter(p => p.runId === runId);
      dispatchMsg({ payload: { response: { action: "getHarvestRunDetail", status: "success", run: {
        ...run,
        imported: run.assetsAdded + " assets",
        assets: runAssets,
      }, logs: runLogs, provenance: runProvenance } } });
    } else {
      dispatchMsg({ payload: { response: { action: "getHarvestRunDetail", status: "success", run: {
        uniqueId: runId, catalogueName: "-", status: "Not Found",
        startedAt: "-", duration: "-", imported: "0", assets: [],
      }, logs: [], provenance: [] } } });
    }
  }

  if (msg.type === "listHarvestLogs") {
    dispatchMsg({ payload: { response: { action: "listHarvestLogs", status: "success", logs: createMockResponder._harvestLogs } } });
  }

  if (msg.type === "listHarvestProvenance") {
    dispatchMsg({ payload: { response: { action: "listHarvestProvenance", status: "success", provenance: createMockResponder._harvestProvenance } } });
  }

  if (msg.type === "pauseHarvest" || msg.type === "resumeHarvest" || msg.type === "cancelHarvest") {
    dispatchMsg({ payload: { response: { action: msg.type, status: "success" } } });
  }

  // ── Local Catalogue (persistent) ───────────────────────────
  if (msg.type === "getLocalCatalogue") {
    const assets = createMockResponder._localAssets || [];
    const runIds = new Set(assets.map(a => a.harvestRunId).filter(Boolean));
    dispatchMsg({ payload: { response: {
      action: "getLocalCatalogue", status: "success",
      assets: assets,
      totalAssets: assets.length,
      totalRuns: runIds.size,
    } } });
  }

  if (msg.type === "deleteLocalAsset") {
    const delId = msg.data?.assetId || msg.data?.uniqueId;
    if (delId) {
      createMockResponder._localAssets = (createMockResponder._localAssets || []).filter(a => a.id !== delId);
      _saveStore("local_assets", createMockResponder._localAssets);
    }
    dispatchMsg({ payload: { response: { action: "deleteLocalAsset", status: "success" } } });
  }

  if (msg.type === "updateLocalAsset") {
    const updId = msg.data?.assetId || msg.data?.uniqueId;
    const patch = msg.data?.patch || msg.data || {};
    if (updId) {
      const idx = (createMockResponder._localAssets || []).findIndex(a => a.id === updId);
      if (idx !== -1) {
        Object.assign(createMockResponder._localAssets[idx], patch);
        createMockResponder._localAssets[idx].updated = _ts();
        _saveStore("local_assets", createMockResponder._localAssets);
      }
    }
    dispatchMsg({ payload: { response: { action: "updateLocalAsset", status: "success" } } });
  }

  if (msg.type === "getLocalProvenance") {
    const provenance = createMockResponder._harvestProvenance || [];
    dispatchMsg({ payload: { response: {
      action: "getLocalProvenance", status: "success",
      provenance: provenance,
      total: provenance.length
    } } });
  }

  if (msg.type === "getLocalAssetDetail") {
    const assetId = msg.data?.assetId || msg.data?.uniqueId || '';
    const asset = (createMockResponder._localAssets || []).find(a => a.id === assetId) || null;
    const provenance = (createMockResponder._harvestProvenance || []).filter(p => p.assetId === assetId);
    dispatchMsg({ payload: { response: {
      action: "getLocalAssetDetail", status: "success",
      asset: asset,
      provenance: provenance
    } } });
  }

  if (msg.type === "getLocalStats") {
    const assets = createMockResponder._localAssets || [];
    const provenance = createMockResponder._harvestProvenance || [];
    const runIds = new Set(assets.map(a => a.harvestRunId).filter(Boolean));
    const catIds = new Set(assets.map(a => a.sourceCatalogueId || a.sourceCatalogue).filter(Boolean));
    const statusCounts = { Active: 0, Warning: 0, Error: 0, Archived: 0 };
    assets.forEach(a => { const s = a.integrationStatus || 'Active'; if (statusCounts[s] !== undefined) statusCounts[s]++; });
    dispatchMsg({ payload: { response: {
      action: "getLocalStats", status: "success",
      totalAssets: assets.length,
      totalRuns: runIds.size,
      linkedCatalogues: catIds.size,
      totalProvenance: provenance.length,
      statusCounts: statusCounts,
      warningCount: statusCounts.Warning,
      errorCount: statusCounts.Error
    } } });
  }

  // ── Schema Registry Stub Responses ──────────────────────────
  // These are thin stubs only — no business logic, no code execution,
  // no ID generation, no simulation. All real processing happens in the
  // Node-RED backend flow (DCM-SchemaRegistry.json).
  // In preview mode these stubs return acknowledgements so the UI doesn't hang.

  // Helper: generate a unique short ID for mock/preview mode
  function mockId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function now() { return new Date().toISOString().slice(0, 10); }

  const schemaStubs = {
    enhancePrompt:          (d) => ({ action: "enhancePrompt", status: "success", enhancedPrompt: (d.rawPrompt || d.template || "") + "\n\n[Enhanced in preview mode — connect Node-RED backend for real AI enhancement]" }),
    createPrompt:           (d) => {
      const id = mockId("prompt-");
      const ts = now();
      return { action: "createPrompt", status: "success", prompt: { id, version: d.version || "1.0", status: "draft", sourceSchema: d.sourceSchema || "", targetSchema: d.targetSchema || "", template: d.template || "", examples: d.examples || "", constraints: d.constraints || "", generatedCode: "", codeGenerationStatus: "pending", createdAt: ts, updatedAt: ts } };
    },
    listPrompts:            () => ({ action: "listPrompts", status: "success", prompts: [
      { id: "prompt-001", version: "1.0", status: "active", sourceSchema: "OGC SensorML", targetSchema: "DCAT-AP.de", template: "Transform the following {SOURCE_SCHEMA} asset into a valid {TARGET_SCHEMA} record.\n\nSource asset:\n{SOURCE_ASSET}\n\nExamples:\n{EXAMPLES}\n\nConstraints:\n{CONSTRAINTS}", examples: "Input: SensorML observation → Output: DCAT Dataset with dct:title, dcat:distribution", constraints: "All output must validate against the target SHACL shape. Preserve original identifiers.", createdAt: "2026-01-15", updatedAt: "2026-02-01", generatedCode: "function transform(input) {\n  const output = {};\n  output[\"@type\"] = \"dcat:Dataset\";\n  output[\"dct:identifier\"] = input.identifier || input.id || \"\";\n  output[\"dct:title\"] = input.name || input.title || \"\";\n  output[\"dct:description\"] = input.description || \"\";\n  return output;\n}", originalPrompt: "", enhancedPrompt: "", codeGenerationStatus: "completed", lastGeneratedAt: "2026-02-01" },
      { id: "prompt-002", version: "2.0", status: "draft", sourceSchema: "ISO 19115-1", targetSchema: "DCAT-AP.de", template: "Map the ISO 19115-1 metadata record to DCAT-AP.de format.\n\nSource:\n{SOURCE_ASSET}", examples: "", constraints: "Preserve spatial extent.", createdAt: "2026-02-10", updatedAt: "2026-02-10", generatedCode: "", originalPrompt: "", enhancedPrompt: "", codeGenerationStatus: "", lastGeneratedAt: "" },
    ] }),
    updatePromptCode:       (d) => ({ action: "updatePromptCode", status: "success", promptId: d.promptId, code: d.code, updatedAt: now() }),
    deletePrompt:           (d) => ({ action: "deletePrompt", status: "success", promptId: d.promptId }),
    dryRunPrompt:           (d) => {
      // In preview mode, try to execute the code if available
      return { action: "dryRunPrompt", status: "success", promptId: d.promptId, result: "{\n  \"@type\": \"dcat:Dataset\",\n  \"dct:identifier\": \"preview-result\",\n  \"dct:title\": \"Preview Transform Output\"\n}" };
    },
    saveTestCase:           (d) => {
      const id = d.id || mockId("tc-");
      const ts = now();
      return { action: "saveTestCase", status: "success", testCaseId: id, isNew: !d.id, testCase: { id, name: d.name || "", promptId: d.promptId || "", llmConfigId: d.llmConfigId || "", sampleInput: d.sampleInput || "", expectedOutput: d.expectedOutput || "", lastResult: "", lastRunAt: "", createdAt: ts, updatedAt: ts } };
    },
    listTestCases:          () => ({ action: "listTestCases", status: "success", testCases: [
      { id: "tc-001", name: "SensorML to DCAT basic", promptId: "prompt-001", llmConfigId: "llm-001", sampleInput: '{\n  "@type": "SensorML",\n  "identifier": "sensor-abc-123",\n  "name": "Temperature Sensor Berlin",\n  "description": "Outdoor temperature monitoring station"\n}', expectedOutput: "", lastResult: "", lastRunAt: "2026-02-20", createdAt: "2026-02-20", updatedAt: "2026-02-20" },
    ] }),
    deleteTestCase:         (d) => ({ action: "deleteTestCase", status: "success", testCaseId: d.testCaseId }),
    updatePrompt:           (d) => ({ action: "updatePrompt", status: "success", promptId: d.promptId, version: d.version, sourceSchema: d.sourceSchema, targetSchema: d.targetSchema, template: d.template, examples: d.examples, constraints: d.constraints, promptStatus: d.status, code: d.code, updatedAt: now() }),
    updatePromptStatus:     (d) => ({ action: "updatePromptStatus", status: "success", promptId: d.promptId, newStatus: d.status, updatedAt: now() }),
    saveLlmConfig:          (d) => {
      const id = d.id || mockId("llm-");
      const ts = now();
      return { action: "saveLlmConfig", status: "success", configId: id, isNew: !d.id, config: { id, name: d.name || "", provider: d.provider || "OpenAI", model: d.model || "", temperature: d.temperature ?? 0.3, maxTokens: d.maxTokens ?? 4096, timeout: d.timeout ?? 30, status: d.status || "active", createdAt: ts, updatedAt: ts } };
    },
    deleteLlmConfig:        (d) => ({ action: "deleteLlmConfig", status: "success", configId: d.configId }),
    saveProvider:           (d) => {
      const id = d.id || mockId("prov-");
      const ts = now();
      return { action: "saveProvider", status: "success", providerId: id, isNew: !d.id, provider: { id, name: d.name || "", type: d.type || "openai", apiEndpoint: d.apiEndpoint || "", models: Array.isArray(d.models) ? d.models : [], isDefault: !!d.isDefault, precedence: d.precedence || 1, status: d.status || "active", createdAt: ts, updatedAt: ts } };
    },
    deleteProvider:         (d) => ({ action: "deleteProvider", status: "success", providerId: d.providerId }),
    reorderProvider:        () => ({ action: "reorderProvider", status: "success", providers: [] }), // empty array = no-op in handler (only updates if length > 0)
    startBatchRetransform:  (d) => {
      const total = d.scope === "all" ? 275 : d.scope === "catalogue" ? 120 : 50;
      const startedAt = new Date().toISOString().replace("T", " ").slice(0, 16);
      // Simulate progress updates in preview mode
      let processed = 0;
      const step = Math.ceil(total / 10);
      const interval = setInterval(() => {
        processed = Math.min(total, processed + step);
        const progress = Math.round((processed / total) * 100);
        const done = processed >= total;
        dispatchMsg({ payload: { response: {
          action: "batchRetransformProgress",
          status: done ? "completed" : "running",
          progress, totalAssets: total, processedAssets: processed,
          successCount: processed - (done ? 3 : 0), errorCount: done ? 3 : 0, skippedCount: 0,
          startedAt,
          completedAt: done ? new Date().toISOString().replace("T", " ").slice(0, 16) : "",
          errors: done ? [{ assetId: "asset-err-001", message: "SHACL validation failed", timestamp: new Date().toISOString().slice(0, 19) }] : [],
          historyEntry: done ? { id: mockId("br-"), trigger: "Manual (preview)", scope: d.scope || "all", dryRun: !!d.dryRun, total, success: processed - 3, errors: 3, skipped: 0, startedAt, completedAt: new Date().toISOString().replace("T", " ").slice(0, 16), status: "completed" } : undefined,
        } } });
        if (done) clearInterval(interval);
      }, 400);
      return { action: "startBatchRetransform", status: "success", totalAssets: total, startedAt };
    },
    cancelBatchRetransform: () => ({ action: "batchRetransformProgress", status: "cancelled", completedAt: new Date().toISOString().replace("T", " ").slice(0, 16) }),
    saveLocalSchema:        (d) => {
      const id = d.id || mockId("schema-");
      const ts = now();
      return { action: "saveLocalSchema", status: "success", schemaId: id, isNew: !d.id, schema: { id, schema: d.schema || "", format: d.format || "SHACL", catalogs: d.catalogs || 1, localMapping: d.localMapping || null, versioning: d.versioning || "v1.0", versionOptions: ["v1.0", "v1.1", "v2.0"], trustLevel: d.trustLevel || "Federated", createdAt: ts, updatedAt: ts } };
    },
    listLocalSchemas:       () => ({ action: "listLocalSchemas", status: "success", schemas: [] }),
    deleteLocalSchema:      (d) => ({ action: "deleteLocalSchema", status: "success", schemaId: d.schemaId }),
    saveMapping:            (d) => {
      const id = d.id || mockId("map-");
      const ts = now();
      return { action: "saveMapping", status: "success", mappingId: id, isNew: !d.id, mapping: { id, remoteCatalogueId: d.remoteCatalogueId || "", remoteSchemaId: d.remoteSchemaId || "", remoteCatalogue: d.remoteCatalogue || "", remoteSchema: d.remoteSchema || "", remoteSchemaMeta: d.remoteSchemaMeta || "", transformationStrategy: d.transformationStrategy || "Deterministic RDF", promptsCount: d.promptsCount || 0, shaclCount: d.shaclCount || 0, createdAt: ts, updatedAt: ts } };
    },
    listMappings:           () => ({ action: "listMappings", status: "success", mappings: [] }),
    deleteMapping:          (d) => ({ action: "deleteMapping", status: "success", mappingId: d.mappingId }),
    saveRemoteSchema:       (d) => {
      const id = d.id || mockId("rschema-");
      const ts = now();
      return { action: "saveRemoteSchema", ok: true, status: "success", schemaId: id, isNew: !d.id, schema: { id, name: d.name || d.schema || "", format: d.format || "json-schema", body: d.body || "", namespaces: d.namespaces || [], version: d.version || "1.0.0", status: d.status || "draft", trustLevel: d.trustLevel || "Federated", catalogueIds: d.catalogueIds || [], description: d.description || "", author: d.author || "", createdAt: ts, updatedAt: ts } };
    },
    listRemoteSchemas:      () => ({ action: "listRemoteSchemas", ok: true, status: "success", schemas: [], catalogueIdToName: {} }),
    deleteRemoteSchema:     (d) => ({ action: "deleteRemoteSchema", ok: true, status: "success", schemaId: d.schemaId || d.id }),
    listLocalSchemaVersions: (d) => ({ action: "listLocalSchemaVersions", ok: true, status: "success", schemaName: d.schemaName, versions: [] }),
    activateLocalSchemaVersion: (d) => ({ action: "activateLocalSchemaVersion", ok: true, status: "success", schemaName: d.schemaName, version: d.version }),
    validateSampleAsset: () => ({ action: "validateSampleAsset", ok: true, valid: true, errors: [] }),
    listPromptVersions: (d) => ({ action: "listPromptVersions", ok: true, status: "success", versions: [] }),
    getLlmUsage: () => ({ action: "getLlmUsage", ok: true, status: "success", usage: [], total: 0 }),
    getSystemSettings: () => ({ action: "getSystemSettings", ok: true, status: "success", settings: {} }),
    setSystemSetting: (d) => ({ action: "setSystemSetting", ok: true, status: "success", key: d.key, value: d.value }),
    saveRdfMappingConfig: (d) => ({ action: "saveRdfMappingConfig", success: true, mappingId: d.mappingId, namespacesToPreserve: d.namespacesToPreserve || [], shaclShapeSchemaId: d.shaclShapeSchemaId || "" }),
    testRdfMapping: (d) => ({ action: "testRdfMapping", success: true, result: { output: "(preview mode — RDF execution runs in Node-RED backend)", retainedCount: 0, discardedCount: 0, totalTriples: 0, shaclResult: null, retainedTriples: [], discardedTriples: [] } }),
    executeHybridTransform: (d) => ({ action: "executeHybridTransform", ok: true, phase: "deterministic", fallbackTriggered: false, result: { output: "(preview mode — Hybrid execution runs in Node-RED backend)", retainedCount: 0, totalTriples: 0, success: true }, timing: { startedAt: new Date().toISOString(), completedAt: new Date().toISOString() } }),
    listTransformationAudit: () => ({ action: "listTransformationAudit", ok: true, status: "success", rows: [], total: 0 }),
    exportTransformationAudit: (d) => ({ action: "exportTransformationAudit", ok: true, status: "success", format: d.format || "csv", base64Payload: "", filename: "audit_export." + (d.format || "csv") }),
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
    try {
      createMockResponder(msg);
    } catch(e) {
      console.error("[facis-service] createMockResponder ERROR:", e);
    }
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
    var forceMock = false;
    try { forceMock = window.__VITE_USE_MOCK === 'true'; } catch(e) {}
    if (window.uibuilder && !forceMock) {
      _isMock = false;
      console.log("[facis-service] Using real uibuilder");
    } else if (forceMock || !window.uibuilder) {
      _isMock = true;
      window.uibuilder = mockAdapter;
      console.log("[facis-service] Mock uibuilder activated" + (forceMock ? ' (VITE_USE_MOCK)' : ' (no uibuilder)'));
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
    if (msg && msg.type && !msg.route) {
      const route = resolveRoute(msg.type);
      if (route) msg.route = route;
    }

    // CRITICAL: uibuilder v7.5.0 strips msg.auth and may not reliably
    // transport msg.data. Put the token in MULTIPLE locations to ensure
    // the backend Auth Resolver can find it.
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('authToken'))
               || (typeof document !== 'undefined' && getCookie('userToken'))
               || '';
    if (token && msg.type !== 'login') {
      // 1. Top-level _token property (simple string, should survive transport)
      msg._token = token;

      // 2. Inside data object (may or may not survive)
      if (!msg.data) msg.data = {};
      if (!msg.data.token) msg.data.token = token;

      // 3. Inside payload object (standard uibuilder property)
      if (!msg.payload) msg.payload = {};
      if (typeof msg.payload === 'object' && !Array.isArray(msg.payload)) {
        msg.payload.token = token;
      }

      // 4. As topic suffix (topic is ALWAYS transported by uibuilder)
      // Format: "original-topic|TOKEN"  — backend will parse this
      if (!msg.topic) msg.topic = '';
      if (msg.topic.indexOf('|') === -1) {
        msg.topic = (msg.topic || msg.route || '') + '|' + token;
      }
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
