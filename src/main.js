/**
 * main.js — Dashboard entry point
 *
 * Mounts the Vue 3 app, registers all components,
 * and wires the FACIS service to the store.
 */

import { uibuilderService } from "./services/uibuilder.service.js";
// OpenAI operations are now handled by the Node-RED backend via uibuilder messages.
// The openai.service.js is kept for reference but no longer imported here.
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
// Light theme — no dark theme import needed
import { EditorState } from "@codemirror/state";
import { createStoreData } from "./state/store.js";
import {
  statusClass, trustClass, roleClass, resultClass, logPillClass,
  namespaceClass, strategyPillClass, strategyLabel, getAccessInitial
} from "./utils/formatters.js";
import {
  getCookie, normalizeText, normalizeFilter, paginate, deepIncludes,
  matchValue, getCatalogAssets, getAssetTitle, assetMatchesQuery,
  getChangedFields, parseJsonLine, hasPermission
} from "./utils/helpers.js";

// Components
import AppSidebar from "./components/Sidebar.js";
import AppTopbar from "./components/Topbar.js";
import StatCard from "./components/StatCard.js";
import TableStatusbar from "./components/TableStatusbar.js";
import DashboardLayout from "./layouts/DashboardLayout.js";

// Views
import LocalCatalogueView from "./views/LocalCatalogueView.js";
import CatalogueRegistryView from "./views/CatalogueRegistryView.js";
import SchemaRegistryView from "./views/SchemaRegistryView.js";
import AdminToolsView from "./views/AdminToolsView.js";
import HarvesterView from "./views/HarvesterView.js";

// Modals
import ViewModal from "./modals/ViewModal.js";
import CreateUserModal from "./modals/InviteModal.js";
import ManageUserModal from "./modals/ManageUserModal.js";
import RegisterCatalogModal from "./modals/RegisterCatalogModal.js";
import SchemaModal from "./modals/SchemaModal.js";
import HarvestWizardModal from "./modals/HarvestWizardModal.js";
import AccessInfoModal from "./modals/AccessInfoModal.js";
import ManageMenu from "./modals/ManageMenu.js";

// ─── Initialise FACIS service ────────────────────────────────────
uibuilderService.init();

// ─── Create Vue app ──────────────────────────────────────────────
const { createApp, toRaw } = Vue;

const app = createApp({
  data() {
    return createStoreData();
  },

  computed: {
    catalogPagination() {
      return paginate(this.tableRows, this.pagination.catalog.page, this.pagination.catalog.perPage);
    },
    filteredSchemaRegistry() {
      const q = (this.localSchemaSearch || "").trim().toLowerCase();
      if (!q) return this.schemaRegistry;
      return this.schemaRegistry.filter(s =>
        (s.schema || "").toLowerCase().includes(q) ||
        (s.localMapping || "").toLowerCase().includes(q) ||
        (s.trustLevel || "").toLowerCase().includes(q)
      );
    },
    schemaPagination() {
      return paginate(this.filteredSchemaRegistry, this.pagination.schema.page, this.pagination.schema.perPage);
    },
    filteredRemoteSchema() {
      const q = (this.remoteSchemaSearch || "").trim().toLowerCase();
      if (!q) return this.remoteSchemas;
      return this.remoteSchemas.filter(s =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.format || "").toLowerCase().includes(q) ||
        (s.trustLevel || "").toLowerCase().includes(q)
      );
    },
    remoteSchemaPagination() {
      return paginate(this.filteredRemoteSchema, this.pagination.remoteSchema.page, this.pagination.remoteSchema.perPage);
    },
    filteredMappingRows() {
      const q = (this.mappingSearch || "").trim().toLowerCase();
      let rows = this.mappingRows;
      if (this.mappingFilterCatalogue) {
        rows = rows.filter(r => r.remoteCatalogue === this.mappingFilterCatalogue);
      }
      if (this.mappingFilterRemoteSchema) {
        rows = rows.filter(r => r.remoteSchema === this.mappingFilterRemoteSchema);
      }
      if (this.mappingFilterLocalSchema) {
        rows = rows.filter(r => r.localSchema === this.mappingFilterLocalSchema);
      }
      if (q) {
        rows = rows.filter(r =>
          (r.remoteCatalogue || "").toLowerCase().includes(q) ||
          (r.remoteSchema || "").toLowerCase().includes(q) ||
          (r.localSchema || "").toLowerCase().includes(q) ||
          (r.transformationStrategy || "").toLowerCase().includes(q)
        );
      }
      return rows;
    },
    mappingPagination() {
      return paginate(this.filteredMappingRows, this.pagination.mapping.page, this.pagination.mapping.perPage);
    },
    filteredLlmProviders() {
      const q = (this.providerSearch || "").trim().toLowerCase();
      if (!q) return this.llmProviders;
      return this.llmProviders.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.type || "").toLowerCase().includes(q) ||
        (p.apiEndpoint || "").toLowerCase().includes(q)
      );
    },
    catalogsRegisterPagination() {
      const tableRows = this.catalogsTable.map(c => ({
        id: c.id || c.uniqueId,
        catalogName: c.catalogName,
        ownerContact: c.owner,
        transformationStrategy: strategyLabel(c.strategy),
        accessUrl: c.baseEndpoint,
        enabled: !!c.enabled,
        _catalog: c
      }));
      return paginate(tableRows, this.pagination.catalogsRegister.page, this.pagination.catalogsRegister.perPage);
    },
    usersPagination() {
      return paginate(this.users, this.pagination.users.page, this.pagination.users.perPage);
    },
    harvestPagination() {
      return paginate(this.harvestRecords, this.pagination.harvest.page, this.pagination.harvest.perPage);
    },
    harvesterOverviewStats() {
      const remoteCataloguesCount = Array.isArray(this.catalogsTable)
        ? this.catalogsTable.length
        : 0;

      const toInt = (v) => {
        if (v == null) return 0;
        if (typeof v === 'number') return isFinite(v) ? v : 0;
        // strip a leading "+" (our UI mapping decorates assetsAdded as "+N")
        const n = parseInt(String(v).replace(/^\+/, '').trim(), 10);
        return isNaN(n) ? 0 : n;
      };

      let newAssetsCount = 0;
      let errorsCount    = 0;

      const runs = Array.isArray(this.harvestRecords) ? this.harvestRecords : [];
      for (const row of runs) {
        const raw = (row && row._run) ? row._run : (row || {});
        const added = toInt(raw.assetsAdded);
        const succ  = toInt(raw.successCount);
        const errs  = toInt(raw.errorCount);
        newAssetsCount += (added > 0 ? added : succ);
        errorsCount    += errs;
      }

      return { remoteCataloguesCount, newAssetsCount, errorsCount };
    },
    harvestWizardPagination() {
      return paginate(this.harvestWizardRows, this.pagination.harvestWizard.page, this.pagination.harvestWizard.perPage);
    },
    provenancePagination() {
      return paginate(this.provenanceRows, this.pagination.provenance.page, this.pagination.provenance.perPage);
    },
    provenanceStats() {
      const all = this.harvestProvenance || [];
      const assets = this.allCatalogsRaw || [];
      const runIds = new Set(assets.map(a => a.harvestRunId).filter(Boolean));
      const catIds = new Set(assets.map(a => a.sourceCatalogueId || a.sourceCatalogue).filter(Boolean));
      const mapped = all.filter(p => p.schemaMapped).length;
      const warnCount = assets.filter(a => a.integrationStatus === "Warning").length;
      const errCount = assets.filter(a => a.integrationStatus === "Error").length;
      return {
        totalAssets: assets.length,
        totalRuns: runIds.size,
        linkedCatalogues: catIds.size,
        totalProvenance: all.length,
        schemaMappedCount: mapped,
        warningCount: warnCount,
        errorCount: errCount
      };
    },
    provenanceCatalogueOptions() {
      const set = new Set();
      (this.harvestProvenance || []).forEach(p => { if (p.catalogueName) set.add(p.catalogueName); });
      return Array.from(set).sort();
    },
    isWizardAllSelected() {
      const ids = this.harvestWizardRows.map(r => r.id);
      if (!ids.length) return false;
      return ids.every(id => this.harvestWizardSelectedRows.includes(id));
    },
    canCreateUser() {
      const f = this.createUserForm;
      const emailOk = !(f.email || "").trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((f.email || "").trim());
      return (f.username || "").trim()
        && (f.password || "").length >= 8
        && emailOk
        && (f.accessAreas || []).length > 0;
    },
    canSaveEditUser() {
      const f = this.editUserForm;
      const emailOk = !(f.email || "").trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((f.email || "").trim());
      if (!emailOk || (f.accessAreas || []).length === 0) return false;
      if (this.isSavingUser) return false;
      if (!this.editUserBaseline) return false;
      // Deep-compare current form vs baseline to detect changes
      const current = JSON.stringify({
        email: ((f.email || "").trim().toLowerCase()) || "",
        status: f.status || "active",
        accessAreas: (f.accessAreas || []).slice().sort(),
        expiresAt: f.expiresAt ? String(f.expiresAt) : null
      });
      return current !== this.editUserBaseline;
    },
    currentSummaryText() {
      return this.schemaSummaries[this.registerSchemaForm.summaryTab] || "";
    },
    filteredRemoteCatalogs() {
      const q = (this.registerSchemaForm.catalogSearch || "").toLowerCase().trim();
      if (!q) return this.registerSchemaForm.remoteCatalogs;
      return this.registerSchemaForm.remoteCatalogs.filter(c => c.toLowerCase().includes(q));
    },
    filteredPrompts() {
      const q = (this.promptSearch || "").trim().toLowerCase();
      if (!q) return this.prompts;
      return this.prompts.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.id || "").toLowerCase().includes(q) ||
        (p.sourceSchema || "").toLowerCase().includes(q) ||
        (p.targetSchema || "").toLowerCase().includes(q) ||
        (p.status || "").toLowerCase().includes(q)
      );
    },
    promptTemplateParts() {
      const tpl = this.promptForm.template || "";
      const parts = [];
      const regex = /(\{SOURCE_ASSET\}|\{SOURCE_SCHEMA\}|\{TARGET_SCHEMA\}|\{EXAMPLES\}|\{CONSTRAINTS\})/g;
      let last = 0;
      let match;
      while ((match = regex.exec(tpl)) !== null) {
        if (match.index > last) parts.push({ text: tpl.slice(last, match.index), isVar: false });
        parts.push({ text: match[1], isVar: true });
        last = regex.lastIndex;
      }
      if (last < tpl.length) parts.push({ text: tpl.slice(last), isVar: false });
      return parts;
    },
    filteredLlmConfigs() {
      const q = (this.llmConfigSearch || "").trim().toLowerCase();
      if (!q) return this.llmConfigs;
      return this.llmConfigs.filter(c =>
        (c.id || "").toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.provider || "").toLowerCase().includes(q) ||
        (c.model || "").toLowerCase().includes(q) ||
        (c.status || "").toLowerCase().includes(q)
      );
    },
    resolvedPromptPreview() {
      if (!this.promptTestSelectedPrompt || !this.promptTestSampleInput) return "";
      const p = this.prompts.find(x => x.id === this.promptTestSelectedPrompt);
      if (!p) return "";
      let tpl = p.template || "";
      tpl = tpl.replace(/\{SOURCE_ASSET\}/g, this.promptTestSampleInput);
      tpl = tpl.replace(/\{SOURCE_SCHEMA\}/g, p.sourceSchema || "");
      tpl = tpl.replace(/\{TARGET_SCHEMA\}/g, p.targetSchema || "");
      tpl = tpl.replace(/\{EXAMPLES\}/g, p.examples || "");
      tpl = tpl.replace(/\{CONSTRAINTS\}/g, p.constraints || "");
      return tpl;
    },
    filteredAuditMini() {
      const q = this.auditSearch.trim().toLowerCase();
      if (!q) return this.auditMini;
      return this.auditMini.filter(r =>
        (r.level || "").toLowerCase().includes(q) ||
        (r.step || "").toLowerCase().includes(q) ||
        (r.timestamp || "").toLowerCase().includes(q)
      );
    },
    filteredAuditRowsInline() {
      let rows = this.auditRows;
      const f = this.auditFilters;
      if (f.assetId) rows = rows.filter(r => (r.assetId || "").toLowerCase().includes(f.assetId.toLowerCase()));
      if (f.catalogueId) rows = rows.filter(r => r.catalogueId === f.catalogueId);
      if (f.promptVersion) rows = rows.filter(r => r.promptVersion === f.promptVersion);
      if (f.status) rows = rows.filter(r => r.status === f.status);
      if (f.dateFrom) rows = rows.filter(r => (r.timestamp || "") >= f.dateFrom);
      if (f.dateTo) rows = rows.filter(r => (r.timestamp || "") <= f.dateTo + " 23:59");
      return rows;
    },
    filteredMonitoringEvents() {
      const m = this.monitoring;
      if (!m || !m.recentAudit) return [];
      const f = this.monitoringEventFilter;
      const q = (this.monitoringAuditSearch || "").trim().toLowerCase();
      let events = m.recentAudit;
      if (f !== "all") {
        events = events.filter(e => {
          const a = (e.action || "").toLowerCase();
          if (f === "error") return a.includes("failed") || a.includes("blocked") || a.includes("delete");
          if (f === "warning") return a.includes("update") || a.includes("degraded");
          return !a.includes("failed") && !a.includes("blocked") && !a.includes("delete");
        });
      }
      if (q) events = events.filter(e =>
        (e.action || "").toLowerCase().includes(q) ||
        (e.actor || "").toLowerCase().includes(q) ||
        (e.target || "").toLowerCase().includes(q) ||
        (e.at || "").toLowerCase().includes(q)
      );
      return events;
    },
    catalogOptions() {
      const set = new Set();
      for (const item of this.tableRows) {
        const v = item?.domain;
        if (v && v !== '-') set.add(String(v));
      }
      return Array.from(set).sort();
    },
    typeOptions() {
      const set = new Set();
      for (const item of this.tableRows) {
        const v = item?.type;
        if (v && v !== '-') set.add(String(v));
      }
      return Array.from(set).sort();
    },
    domainOptions() {
      const set = new Set();
      for (const item of this.tableRows) {
        const v = item?.domain;
        if (v && v !== '-') set.add(String(v));
      }
      return Array.from(set).sort();
    },
    statusOptions() {
      return ["Active", "Warning", "Error"];
    },
    pageWindow() {
      return (key, size = 5) => {
        const p = this.pagination[key].page;
        const total = this[`${key}Pagination`]?.totalPages || 1;
        const start = Math.min(p, Math.max(1, total - size + 1));
        const end = Math.min(total, start + size - 1);
        const pages = [];
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
      };
    },
    isSavingRemoteCatalog() {
      return this.isRegisteringRemoteCatalog || this.isUpdatingRemoteCatalog;
    },
    inverseAccessMap() {
      const inv = {};
      Object.entries(this.accessMap || {}).forEach(([label, key]) => {
        inv[key] = label;
      });
      return inv;
    },
    wizardSelectedCatalogRows() {
      const set = new Set(this.harvestWizardSelectedRows);
      return (this.harvestWizardRowsBase || []).filter(r => set.has(r.id));
    },
    wizardSelectedCount() {
      return this.wizardSelectedCatalogRows.length;
    },
    overviewScopeLines() {
      const s = this.harvestScope || {};
      const selected = Array.isArray(s.selected) ? s.selected : [];
      const lines = [];
      const has = (k) => selected.includes(k);
      if (has("all_assets")) return ["All assets in the remote catalogue"];
      if (has("by_type")) lines.push(`All assets of type: ${s.typeValue || "-"}`);
      if (has("matching_query")) lines.push(`Assets matching a query: ${s.queryValue || "-"}`);
      if (has("ever_imported")) lines.push("All assets ever imported from that remote catalogue");
      if (has("last_harvest")) lines.push("Assets imported in the last harvest");
      if (has("changed_between")) {
        lines.push(`Assets changed between: ${s.fromDate || "-"} \u2192 ${s.toDate || "-"}`);
      }
      if (has("last_harvest_scope")) lines.push("All assets in scope of last harvest");
      if ((has("ever_imported") || has("last_harvest")) && !!s.includeNewAssets) {
        lines.push("Include any new assets in remote catalogue");
      }
      return lines.length ? lines : ["\u2014 No scope selected"];
    },
    overviewLifecycleLines() {
      const l = this.lifecycleMapping;
      const updateText = l.updateHandling === "version"
        ? "Update Handling: Create new version of the corresponding local asset"
        : "Update Handling: Create a separate local asset";
      const deletionText = l.deletionHandling === "remove"
        ? "Deletion Handling: Delete the corresponding local asset"
        : "Deletion Handling: Retain the local copy (mark as orphaned)";
      const lines = [updateText, deletionText];
      return lines;
    },
    overviewMappingCounts() {
      const rows = this.wizardSelectedCatalogRows || [];
      const counts = { ai: 0, hybrid: 0, deterministic: 0, none: 0 };
      rows.forEach(r => {
        const st = r.strategy || r.transformationStrategy || "none";
        if (st === "ai-driven" || st === "ai" || st === "AI-driven") counts.ai++;
        else if (st === "hybrid" || st === "Hybrid") counts.hybrid++;
        else if (st === "deterministic-rdf" || st === "deterministic" || st === "Deterministic RDF") counts.deterministic++;
        else counts.none++;
      });
      return counts;
    },
    isAllAssetsSelected() {
      return this.harvestScope.selected.includes("all_assets");
    },
    showIncludeNewAssetsToggle() {
      const s = this.harvestScope.selected;
      return s.includes("last_harvest") || s.includes("ever_imported");
    },
    auditTrailTotalPages() {
      return Math.max(1, Math.ceil(this.auditTrail.pagination.total / this.auditTrail.pagination.perPage));
    },
    auditTrailPage() {
      const p = this.auditTrail.pagination;
      const start = (p.page - 1) * p.perPage;
      return this.auditTrail.rows.slice(start, start + p.perPage);
    },
  },

  watch: {
    isViewModal(val) {
      document.body.style.overflow = val ? "hidden" : "";
    },
    isCreateUserModal(v) {
      document.body.style.overflow = v ? "hidden" : "";
    },
    isEditUserModal(v) {
      document.body.style.overflow = v ? "hidden" : "";
    },
    currentSchemaTab(val) {
      if (val === "auditTrail" && !this.auditTrail.loaded) {
        this.fetchAuditTrail();
      }
    },
    provenanceFilters: {
      handler() { this.filterProvenance(); },
      deep: true
    },
    currentTab(newTab) {
      if (newTab === "localCatalogue") {
        this.loadLocalCatalogs();
      }
      if (newTab === "provenance") {
        this.loadLocalProvenance();
      }
    },
    currentPage(newPage) {
      if (newPage === "catalogueRegistry") {
        uibuilderService.send({
          type: "getCatalogRegistry",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
        });
      }
      if (newPage === "adminTools") {
        // Only fetch admin data if user has adminTools access
        const aa = this.currentUser.accessAreas || [];
        if (aa.includes('adminTools') || this.userAccess.includes('admin_tools')) {
          const auth = { userToken: localStorage.getItem("authToken") || getCookie("userToken"), clientId: getCookie("uibuilder-client-id") };
          uibuilderService.send({ type: "listUsers", auth: auth });
          uibuilderService.send({ type: "listRoles", auth: auth });
          // Start monitoring polling if on monitoring tab
          if (this.currentAdminTab === 'monitoring') {
            this.startMonitoringPolling();
          }
        }
      } else {
        this.stopMonitoringPolling();
      }
      if (newPage === "harvester") {
        this.loadHarvestData();
        // Also refresh the remote catalogue list so the overview KPI reflects
        // the current Catalogue Registry without requiring a prior visit to that page.
        uibuilderService.send({
          type: "getCatalogRegistry",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
        });
      }
      if (newPage === "localCatalogue") {
        this.loadLocalCatalogs();
        this.loadLocalProvenance();
      }
    },
    currentAdminTab(newTab) {
      if (newTab === "monitoring" && this.currentPage === "adminTools") {
        this.startMonitoringPolling();
      } else {
        this.stopMonitoringPolling();
      }
    }
  },

  methods: {
    // ── Formatters (delegated) ─────────────────────────────────
    statusClass, trustClass, roleClass, resultClass, logPillClass,
    namespaceClass, strategyPillClass, strategyLabel, getAccessInitial,
    parseJsonLine,

    // ── Helpers ────────────────────────────────────────────────
    getCookie,
    hasAccess(key) {
      // Use accessAreas (camelCase) as the single source of truth for sidebar visibility
      const aa = this.currentUser.accessAreas || [];
      // Map snake_case sidebar keys to camelCase accessAreas
      const keyMap = { local_catalogue: 'localCatalogue', catalogue_registry: 'catalogueRegistry', schema_registry: 'schemaRegistry', admin_tools: 'adminTools', harvester: 'harvest' };
      const mapped = keyMap[key] || key;
      return aa.includes(mapped) || this.userAccess.includes(key);
    },
    $can(area, action) { return hasPermission(this.$data, area, action); },
    canRead(area)   {
      // New RBAC: check flattened permissions
      if (this.currentUser?.isAuthenticated) {
        const areaMap = { admin_tools: 'users', catalogue_registry: 'catalogue.registry', schema_registry: 'schema.registry', harvester: 'harvest.run', local_catalogue: 'local.catalogue' };
        const mapped = areaMap[area] || area;
        return this.$can(mapped, 'read');
      }
      return !!(this.userPermissions[area] && this.userPermissions[area].read);
    },
    canCreate(area) {
      if (this.currentUser?.isAuthenticated) {
        const areaMap = { admin_tools: 'users', catalogue_registry: 'catalogue.registry', schema_registry: 'schema.registry', harvester: 'harvest.run', local_catalogue: 'catalogue.registry' };
        return this.$can(areaMap[area] || area, 'create');
      }
      return !!(this.userPermissions[area] && this.userPermissions[area].create);
    },
    canUpdate(area) {
      if (this.currentUser?.isAuthenticated) {
        const areaMap = { admin_tools: 'users', catalogue_registry: 'catalogue.registry', schema_registry: 'schema.registry', harvester: 'harvest.run', local_catalogue: 'catalogue.registry' };
        return this.$can(areaMap[area] || area, 'update');
      }
      return !!(this.userPermissions[area] && this.userPermissions[area].update);
    },
    canDelete(area) {
      if (this.currentUser?.isAuthenticated) {
        const areaMap = { admin_tools: 'users', catalogue_registry: 'catalogue.registry', schema_registry: 'schema.registry', harvester: 'harvest.run', local_catalogue: 'catalogue.registry' };
        return this.$can(areaMap[area] || area, 'delete');
      }
      return !!(this.userPermissions[area] && this.userPermissions[area].delete);
    },

    // ── Pagination ─────────────────────────────────────────────
    paginate,
    handlePageChange(evt) {
      this.pagination[evt.key].page = evt.page;
    },

    setPerPageByViewport() {
      const h = window.innerHeight;
      let perPage;
      if (h < 800) perPage = 4;
      else if (h < 900) perPage = 6;
      else if (h < 1000) perPage = 8;
      else perPage = 10;
      Object.keys(this.pagination).forEach((key) => {
        const p = this.pagination[key];
        if (p.perPage !== perPage) {
          p.perPage = perPage;
          const total = this.getTotalFor(key);
          const totalPages = Math.max(1, Math.ceil(total / p.perPage));
          if (p.page > totalPages) p.page = totalPages;
        }
      });
    },
    getTotalFor(key) {
      switch (key) {
        case "catalog": return this.tableRows.length;
        case "schema": return this.schemaRegistry.length;
        case "catalogsRegister": return this.catalogsTable.length;
        case "users": return this.users.length;
        case "harvest": return this.harvestRecords.length;
        default: return 0;
      }
    },
    onResize() {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.setPerPageByViewport(), 150);
    },

    // ── Local Catalogue ────────────────────────────────────────
    loadLocalCatalogs() {
      // Always load from backend — database is the source of truth
      uibuilderService.send({
        type: "getLocalCatalogue",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
      });
    },
    runSearch() {
      const q = normalizeText(this.searchText);
      const fCatalog = normalizeFilter(this.filters.catalog);
      const fType = normalizeFilter(this.filters.type);
      const fDomain = normalizeFilter(this.filters.domain);
      const fStatus = normalizeFilter(this.filters.status);

      const filtered = this.allCatalogsRaw.filter(item => {
        if (fCatalog && String(item.domain) !== String(fCatalog)) return false;
        if (fDomain && String(item.domain) !== String(fDomain)) return false;
        if (fType && String(item.type) !== String(fType)) return false;
        if (fStatus && String(item.integrationStatus) !== String(fStatus)) return false;
        if (q) {
          const hay = normalizeText([item.assets, item.title, item.type, item.name, item.domain, item.integrationStatus, item.sourceCatalogue, item.remoteAssetId].join(" "));
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      this.tableRows = filtered;
      this.pagination.catalog.page = 1;
    },
    clearFilters() {
      this.searchText = "";
      this.filters = { catalog: "", type: "", domain: "", status: "" };
      this.pagination.catalog.page = 1;
      this.runSearch();
    },

    // ── Provenance Tab (Local Catalogue) ─────────────────────
    filterProvenance() {
      const q = (this.provenanceSearch || "").trim().toLowerCase();
      const fCat = this.provenanceFilters.catalogue;
      const fStrat = this.provenanceFilters.strategy;
      const fMapped = this.provenanceFilters.mapped;
      const all = this.harvestProvenance || [];
      this.provenanceRows = all.filter(p => {
        if (fCat && p.catalogueName !== fCat) return false;
        if (fStrat && p.strategy !== fStrat) return false;
        if (fMapped === "yes" && !p.schemaMapped) return false;
        if (fMapped === "no" && p.schemaMapped) return false;
        if (q) {
          const hay = [p.assetId, p.catalogueName, p.strategy, p.harvestDate, p.remoteAssetId].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      this.pagination.provenance.page = 1;
    },
    clearProvenanceFilters() {
      this.provenanceSearch = "";
      this.provenanceFilters = { catalogue: "", strategy: "", mapped: "" };
      this.provenanceRows = this.harvestProvenance || [];
      this.pagination.provenance.page = 1;
    },
    loadLocalProvenance() {
      // Always load from backend — database is the source of truth
      uibuilderService.send({
        type: "getLocalProvenance",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
      });
    },

    // ── Asset Detail Panel / View Modal (FR-ACM-04) ──────────
    openViewDetail(row) {
      // Open modal immediately; contents populated from backend response below.
      this.assetDetailRow = { ...row };
      this.isViewModal = true;
      this.viewingForm = 'both';
      this.originalJsonLines = [{ text: 'Loading original form...', changeType: null }];
      this.localJsonLines = [{ text: 'Loading transformed form...', changeType: null }];
      const uid = row.uniqueId || row.id;
      if (!uid) return;
      uibuilderService.send({
        type: 'getLocalAssetDetail',
        auth: { userToken: getCookie('userToken'), clientId: getCookie('uibuilder-client-id') },
        data: { uniqueId: uid, form: 'both' }
      });
    },
    _applyLocalAssetDetailResponse(resp) {
      // FR-ACM-04: resp = { action, status, form, asset: { ..., originalForm?, transformedForm?, linkedAssets, viewingForm } }
      const a = resp && resp.asset;
      if (!a) {
        this.originalJsonLines = [{ text: 'No data.', changeType: null }];
        this.localJsonLines = [{ text: 'No data.', changeType: null }];
        return;
      }
      const original = a.originalForm || null;
      const transformed = a.transformedForm || null;
      this.viewingForm = a.viewingForm || resp.form || 'both';
      if (original) {
        this.originalJsonLines = this._jsonToLines(original);
      } else {
        this.originalJsonLines = [{ text: 'No original form stored for this asset.', changeType: null }];
      }
      if (transformed) {
        this.localJsonLines = this._jsonToLines(transformed, original || undefined);
      } else {
        this.localJsonLines = [{ text: 'No transformed form yet (mapping pending or not configured).', changeType: null }];
      }
      // Keep a reference for the toggle
      this.assetDetailRow = Object.assign({}, this.assetDetailRow || {}, {
        linkedAssets: a.linkedAssets || { hasOriginal: !!original, hasTransformed: !!transformed }
      });
    },
    setViewingForm(form) {
      // FR-ACM-04 explicit-form toggle inside the View modal
      if (form !== 'transformed' && form !== 'original' && form !== 'both') return;
      this.viewingForm = form;
      const uid = (this.assetDetailRow && (this.assetDetailRow.uniqueId || this.assetDetailRow.id)) || null;
      if (!uid) return;
      uibuilderService.send({
        type: 'getLocalAssetDetail',
        auth: { userToken: getCookie('userToken'), clientId: getCookie('uibuilder-client-id') },
        data: { uniqueId: uid, form: form }
      });
    },
    _jsonToLines(obj, compareObj) {
      try {
        const text = JSON.stringify(obj, null, 2);
        const lines = text.split("\n");
        if (!compareObj) return lines.map(l => ({ text: l, changeType: null }));
        const origText = JSON.stringify(compareObj, null, 2);
        const origLines = new Set(origText.split("\n"));
        return lines.map(l => ({
          text: l,
          changeType: origLines.has(l) ? null : "updated"
        }));
      } catch (e) { return [{ text: JSON.stringify(obj), changeType: null }]; }
    },
    openAssetDetail(row) {
      this.assetDetailRow = { ...row };
      this.isEditingAsset = false;
      this.showAssetDetailPanel = true;
    },
    closeAssetDetail() {
      this.showAssetDetailPanel = false;
      this.assetDetailRow = null;
      this.isEditingAsset = false;
    },
    startEditAsset() {
      if (!this.assetDetailRow) return;
      this.assetEditForm = {
        assets: this.assetDetailRow.assets,
        type: this.assetDetailRow.type,
        name: this.assetDetailRow.name,
        domain: this.assetDetailRow.domain,
        integrationStatus: this.assetDetailRow.integrationStatus,
      };
      this.isEditingAsset = true;
    },
    cancelEditAsset() {
      this.isEditingAsset = false;
    },
    saveEditAsset() {
      if (!this.assetDetailRow) return;
      const idx = this.tableRows.findIndex(r => r.id === this.assetDetailRow.id);
      if (idx !== -1) {
        const updated = { ...this.tableRows[idx], ...this.assetEditForm, updated: new Date().toISOString().slice(0, 10) };
        this.tableRows.splice(idx, 1, updated);
        this.assetDetailRow = { ...updated };
        // Persist to backend
        const uid = updated.uniqueId || updated.id;
        if (uid) {
          uibuilderService.send({
            type: "updateLocalAsset",
            auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
            data: { uniqueId: uid, patch: { title: updated.assets, type: updated.type, domain: updated.domain, status: updated.integrationStatus } }
          });
        }
      }
      this.isEditingAsset = false;
      this.addToast("success", "Asset updated.");
    },
    deleteAsset(id) {
      const row = this.tableRows.find(r => r.id === id);
      this.tableRows = this.tableRows.filter(r => r.id !== id);
      this.allCatalogsRaw = this.allCatalogsRaw.filter(r => r.id !== id);
      this.selectedRows = this.selectedRows.filter(x => x !== id);
      if (this.assetDetailRow && this.assetDetailRow.id === id) {
        this.closeAssetDetail();
      }
      const uid = row?.uniqueId || row?.id;
      if (uid) {
        uibuilderService.send({
          type: "deleteLocalAsset",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { uniqueId: uid }
        });
      }
      this.addToast("success", "Asset deleted.");
    },
    confirmDeleteAsset(id) {
      this.showConfirm("Delete Asset", "Are you sure you want to delete this asset? This action cannot be undone.", "Delete", () => this.deleteAsset(id));
    },
    archiveAsset(id) {
      const idx = this.tableRows.findIndex(r => r.id === id);
      if (idx !== -1) {
        this.tableRows.splice(idx, 1, { ...this.tableRows[idx], integrationStatus: 'Archived' });
        if (this.assetDetailRow && this.assetDetailRow.id === id) {
          this.assetDetailRow = { ...this.tableRows[idx] };
        }
        const uid = this.tableRows[idx]?.uniqueId || this.tableRows[idx]?.id;
        if (uid) {
          uibuilderService.send({
            type: "updateLocalAsset",
            auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
            data: { uniqueId: uid, patch: { status: 'Archived' } }
          });
        }
      }
      this.addToast("success", "Asset archived.");
    },
    // ── Bulk Actions (Milestone 1) ─────────────────────────────
    bulkDeleteAssets() {
      if (!this.selectedRows.length) return;
      const count = this.selectedRows.length;
      this.showConfirm("Delete Assets", `Are you sure you want to delete ${count} selected asset${count > 1 ? 's' : ''}? This action cannot be undone.`, "Delete", () => {
        // Send delete requests to backend for each selected asset
        for (const id of this.selectedRows) {
          const row = this.tableRows.find(r => r.id === id);
          const uid = row?.uniqueId || row?.id;
          if (uid) {
            uibuilderService.send({
              type: "deleteLocalAsset",
              auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
              data: { uniqueId: uid }
            });
          }
        }
        this.tableRows = this.tableRows.filter(r => !this.selectedRows.includes(r.id));
        this.allCatalogsRaw = this.allCatalogsRaw.filter(r => !this.selectedRows.includes(r.id));
        if (this.assetDetailRow && this.selectedRows.includes(this.assetDetailRow.id)) {
          this.closeAssetDetail();
        }
        this.selectedRows = [];
        this.addToast("success", `${count} asset${count > 1 ? 's' : ''} deleted.`);
      });
    },
    bulkChangeStatus(status) {
      if (!this.selectedRows.length) return;
      const set = new Set(this.selectedRows);
      // Send update requests to backend for each selected asset
      for (const id of this.selectedRows) {
        const row = this.tableRows.find(r => r.id === id);
        const uid = row?.uniqueId || row?.id;
        if (uid) {
          uibuilderService.send({
            type: "updateLocalAsset",
            auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
            data: { uniqueId: uid, patch: { status: status } }
          });
        }
      }
      this.tableRows = this.tableRows.map(r => set.has(r.id) ? { ...r, integrationStatus: status } : r);
      this.allCatalogsRaw = this.allCatalogsRaw.map(r => set.has(r.id) ? { ...r, integrationStatus: status } : r);
      this.selectedRows = [];
    },
    _downloadCsv(rows, filename) {
      const headers = ["ID", "Assets", "Type", "Name", "Domain", "Updated", "Integration Status", "Harvest Run", "Source Asset", "Strategy"];
      const csvRows = rows.map(r => [r.id || r.uniqueId, r.assets, r.type, r.name, r.domain, r.updated, r.integrationStatus, r.harvestRunId || '', r.sourceAssetId || '', r.strategy || ''].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(","));
      const content = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    bulkExportAssets() {
      if (!this.selectedRows.length) return;
      const set = new Set(this.selectedRows);
      const rows = this.tableRows.filter(r => set.has(r.id));
      this._downloadCsv(rows, "assets-export-selected.csv");
    },
    exportAllAssets() {
      const rows = this.allCatalogsRaw.length > 0 ? this.allCatalogsRaw : this.tableRows;
      if (!rows.length) {
        this.addToast("warning", "No assets to export.");
        return;
      }
      this._downloadCsv(rows, "local-catalogue-export.csv");
    },
    toggleSelectAll(e) {
      if (e.target.checked) {
        this.selectedRows = this.catalogPagination.rows.map(r => r.id);
      } else {
        this.selectedRows = [];
      }
    },

    // ── Catalog Registry ───────────────────────────────────────
    toggleCatalogEnabled(id, e) {
      const c = this.catalogsTable.find(x => x.id === id);
      if (c) c.enabled = !!e.target.checked;
    },
    openRegisterRemoteCatalogModal() {
      this.isEditingRemoteCatalog = false;
      this.editingRemoteCatalogId = null;
      this.remoteCatalogForm = {
        catalogId: "", catalogName: "", owner: "",
        protocol: "Query interface", baseEndpoint: "",
        mimeType: "application/sparql-results+json",
        queryEndpoint: "", queryLanguages: "",
        metadataPrefix: "oai_dc", setSpec: "", resumptionToken: false,
        dcatCatalogUri: "", linkedDataEndpoint: "", contentNegotiation: "application/ld+json",
        strategy: "none", promptId: "", llmConfigId: "", providerId: "",
        namespacesToPreserve: "", shaclShapeId: "",
        auth: "none",
        authLoginEndpoint: "", authUsername: "", authPassword: "",
        authPayloadTemplate: '{"email":"{{username}}","password":"{{password}}"}',
        authTokenPath: "token", authTokenInjection: "body",
        authTokenFieldName: "token", authTokenPrefix: "",
        authStaticToken: "", authApiKey: "", authApiKeyHeader: "X-API-Key",
        responseRootPath: "", responseAssetIdField: "",
        responseAssetNameField: "", responseAssetTypeField: "",
        trustAnchor: "", enabled: true,
        sourceData: null, sourceFileName: "",
      };
      this.uploadedJsonFile = null;
      this.jsonUploadError = "";
      this.showRegisterRemoteCatalogModal = true;
    },
    openEditRemoteCatalog(row) {
      this.isEditingRemoteCatalog = true;
      this.editingRemoteCatalogId = row.id;
      this.remoteCatalogForm = JSON.parse(JSON.stringify(row));
      this.originalRemoteCatalogForm = JSON.parse(JSON.stringify(row));
      // Restore saved file indicator from persisted sourceData
      if (row.sourceData && row.sourceFileName) {
        this.uploadedJsonFile = { name: row.sourceFileName };
      } else {
        this.uploadedJsonFile = null;
      }
      this.jsonUploadError = "";
      this.showRegisterRemoteCatalogModal = true;
    },
    closeRegisterRemoteCatalogModal() {
      this.showRegisterRemoteCatalogModal = false;
    },
    testRemoteCatalogConnection() {
      this.isTestingConnection = true;
      this.testConnectionResult = { status: "", message: "", latency: 0 };

      // Lightweight client-side validation — backend will re-validate
      const auth = this.remoteCatalogForm.auth || "none";
      if (auth === "token-login") {
        if (!(this.remoteCatalogForm.authLoginEndpoint || "").trim()) {
          this.testConnectionResult = { status: "error", message: "Login endpoint URL is required for Token Login auth.", latency: 0 };
          this.isTestingConnection = false;
          return;
        }
        if (!this.remoteCatalogForm.authUsername || !this.remoteCatalogForm.authPassword) {
          this.testConnectionResult = { status: "error", message: "Username and password are required for Token Login auth.", latency: 0 };
          this.isTestingConnection = false;
          return;
        }
      }

      // Send to backend — response arrives via the testRemoteCatalogConnection handler below
      uibuilderService.send({
        type: "testRemoteCatalogConnection",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: JSON.parse(JSON.stringify(this.remoteCatalogForm))
      });

      // Safety timeout — if backend never responds, surface a clear error
      if (this._testConnTimeout) clearTimeout(this._testConnTimeout);
      this._testConnTimeout = setTimeout(() => {
        if (this.isTestingConnection) {
          this.testConnectionResult = { status: "error", message: "No response from backend — request timed out after 15s.", latency: 0 };
          this.isTestingConnection = false;
        }
      }, 15000);
    },
    registerRemoteCatalog() {
      const payload = JSON.parse(JSON.stringify(this.remoteCatalogForm));
      this.registerRemoteCatalogError = "";
      this.isRegisteringRemoteCatalog = true;
      this.pendingRemoteCatalog = payload;
      uibuilderService.send({
        type: "registerRemoteCatalog",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: payload,
      });
    },
    saveRemoteCatalog() {
      const current = JSON.parse(JSON.stringify(this.remoteCatalogForm));
      if (this.isEditingRemoteCatalog && this.editingRemoteCatalogId != null) {
        const old = this.originalRemoteCatalogForm || {};
        const patch = getChangedFields(old, current);
        if (Object.keys(patch).length === 0) { this.closeRegisterRemoteCatalogModal(); return; }
        this.isUpdatingRemoteCatalog = true;
        this.updateRemoteCatalogError = "";
        this.pendingUpdateRemoteCatalogId = this.editingRemoteCatalogId;
        uibuilderService.send({
          type: "updateRemoteCatalog",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { uniqueId: this.editingRemoteCatalogId, patch },
        });
        return;
      }
      this.registerRemoteCatalog();
    },

    // ── JSON File Upload for Catalogue Registration ──────────
    handleJsonDrop(e) {
      this.isDraggingJson = false;
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type === "application/json") {
        this.processJsonFile(file);
      } else {
        this.jsonUploadError = "Please upload a valid .json file.";
      }
    },
    handleJsonFileSelect(e) {
      const file = e.target?.files?.[0];
      if (file) this.processJsonFile(file);
    },
    processJsonFile(file) {
      this.jsonUploadError = "";
      this.uploadedJsonFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target.result);
          // Support both single object and array of catalogues
          if (Array.isArray(json)) {
            // Batch upload via uploadCatalogJson
            uibuilderService.send({
              type: "uploadCatalogJson",
              auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
              data: { catalogs: json }
            });
          } else if (typeof json === "object") {
            // Pre-fill the form from JSON fields
            const f = this.remoteCatalogForm;
            if (json.catalogId) f.catalogId = json.catalogId;
            if (json.catalogName) f.catalogName = json.catalogName;
            if (json.owner) f.owner = json.owner;
            if (json.protocol) f.protocol = json.protocol;
            if (json.baseEndpoint) f.baseEndpoint = json.baseEndpoint;
            if (json.queryEndpoint) f.queryEndpoint = json.queryEndpoint;
            if (json.queryLanguages) f.queryLanguages = json.queryLanguages;
            if (json.mimeType) f.mimeType = json.mimeType;
            if (json.strategy) f.strategy = json.strategy;
            if (json.dcatCatalogUri) f.dcatCatalogUri = json.dcatCatalogUri;
            if (json.linkedDataEndpoint) f.linkedDataEndpoint = json.linkedDataEndpoint;
            if (json.metadataPrefix) f.metadataPrefix = json.metadataPrefix;
            if (json.auth) f.auth = json.auth;
            if (json.trustAnchor) f.trustAnchor = json.trustAnchor;
            if (json.enabled !== undefined) f.enabled = json.enabled;
            // Persist the full JSON content as the catalogue source data
            f.sourceData = json;
            f.sourceFileName = file.name;
            this.addToast("success", "Form pre-filled from JSON file.");
          }
        } catch (err) {
          this.jsonUploadError = "Invalid JSON file: " + err.message;
        }
      };
      reader.readAsText(file);
    },
    clearUploadedJson() {
      this.uploadedJsonFile = null;
      this.jsonUploadError = "";
      this.remoteCatalogForm.sourceData = null;
      this.remoteCatalogForm.sourceFileName = "";
    },

    // ── Admin Tools ────────────────────────────────────────────
    openManageMenu(e, user) {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      this.manageMenu = {
        open: true, stage: "root", userId: user.uniqueId,
        anchorEl: el, x: r.left, y: r.bottom + 8
      };
      this.$nextTick(() => this.fixMenuOverflow());
    },
    closeManageMenu() {
      this.manageMenu = { open: false, x: 0, y: 0, stage: "root", userId: null, anchorEl: null };
    },
    fixMenuOverflow() {
      const menu = document.querySelector(".manage-menu");
      if (!menu) return;
      const mr = menu.getBoundingClientRect();
      if (mr.right > window.innerWidth - 12) this.manageMenu.x -= (mr.right - (window.innerWidth - 12));
      if (mr.bottom > window.innerHeight - 12) this.manageMenu.y -= (mr.bottom - (window.innerHeight - 12));
    },
    updateMenuPosition() {
      if (!this.manageMenu.open || !this.manageMenu.anchorEl) return;
      const r = this.manageMenu.anchorEl.getBoundingClientRect();
      this.manageMenu.x = r.left;
      this.manageMenu.y = r.bottom + 8;
      this.fixMenuOverflow();
    },
    deleteUser(userId) {
      const user = this.users.find(u => String(u.uniqueId) === String(userId));
      const name = user?.username || user?.name || "this user";
      // Prevent self-delete
      if (this.currentUser && (String(this.currentUser.id) === String(userId) || this.currentUser.username === user?.username)) {
        this.addToast("error", "You cannot delete your own account.");
        this.closeManageMenu();
        return;
      }
      this.closeManageMenu();
      this.showConfirm("Delete User", `Are you sure you want to delete "${name}"? This action cannot be undone.`, "Delete", () => {
        // Send delete to backend — do NOT remove locally until server confirms
        const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
        uibuilderService.send({
          type: "deleteUser",
          auth: auth,
          data: { userId: userId, uniqueId: userId, username: user?.username }
        });
      });
    },
    openManageUserModal() {
      const userId = this.manageMenu.userId;
      const user = this.users.find(u => String(u.uniqueId) === String(userId));
      if (!user) return;
      // Convert camelCase accessAreas from backend to form values
      const accessAreas = Array.isArray(user.accessAreas) ? [...user.accessAreas] : [];
      if (!accessAreas.includes('localCatalogue')) accessAreas.unshift('localCatalogue');
      // Format expiresAt for datetime-local input
      let expiresAtLocal = null;
      if (user.expiresAt) {
        try { expiresAtLocal = new Date(user.expiresAt).toISOString().slice(0, 16); } catch(e) {}
      }
      this.editUserForm = {
        userId: user.uniqueId || user._id || '',
        username: user.username || '',
        email: user.email || '',
        status: user.status || 'active',
        accessAreas: accessAreas,
        expiresAt: expiresAtLocal,
        validationError: null,
      };
      // Capture baseline for dirty-tracking AFTER setting form
      // Baseline for dirty-tracking (same shape as canSaveEditUser normalization)
      this.editUserBaseline = JSON.stringify({
        email: ((this.editUserForm.email || "").trim().toLowerCase()) || "",
        status: this.editUserForm.status || "active",
        accessAreas: (this.editUserForm.accessAreas || []).slice().sort(),
        expiresAt: this.editUserForm.expiresAt ? String(this.editUserForm.expiresAt) : null
      });
      this.isEditUserModal = true;
      this.manageMenu.open = false;
    },
    closeEditUserModal() {
      this.isEditUserModal = false;
      this.isSavingUser = false;
    },
    submitEditUser() {
      // Idempotent guard: prevent double-submit
      if (this.isSavingUser) return;
      this.editUserForm.validationError = null;
      this.isSavingUser = true;
      const raw = toRaw(this.editUserForm);
      // Backend rebuilds permissions from accessAreas — frontend does NOT send permissions
      const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
      uibuilderService.send({
        type: "updateUser",
        auth: auth,
        data: {
          userId: raw.userId,
          username: raw.username,
          email: raw.email || null,
          status: raw.status,
          accessAreas: raw.accessAreas || [],
          expiresAt: raw.expiresAt ? new Date(raw.expiresAt).toISOString() : null,
        },
      });
    },
    submitUpdateUserPassword(payload) {
      if (this.userEditPasswordSaving) return;
      const password = (payload && payload.password) || "";
      const raw = toRaw(this.editUserForm) || {};
      if (!raw.userId && !raw.username) {
        this.userEditPasswordError = "No user selected.";
        return;
      }
      this.userEditPasswordError = "";
      this.userEditPasswordSaving = true;
      const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
      uibuilderService.send({
        type: "updateUserPassword",
        auth: auth,
        data: {
          userId: raw.userId,
          username: raw.username,
          password: password,
        },
      });
    },

    // ── Create User ──────────────────────────────────────────
    closeCreateUserModal() {
      this.isCreateUserModal = false;
      this.resetCreateUserForm();
    },
    submitCreateUser() {
      this.createUserForm.validationError = null;
      this.isCreatingUser = true;
      const raw = toRaw(this.createUserForm);
      // Backend rebuilds permissions from accessAreas — frontend does NOT send permissions
      const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
      uibuilderService.send({
        type: "createUser",
        auth: auth,
        data: {
          email: raw.email || "",
          username: raw.username,
          password: raw.password,
          accessAreas: raw.accessAreas || [],
          expiresInDays: raw.expiresInDays,
        },
      });
    },
    resetCreateUserForm() {
      this.createUserForm = {
        username: "",
        email: "",
        password: "",
        showPassword: false,
        accessAreas: ["localCatalogue"],
        expiresInDays: null,
        validationError: null,
      };
    },
    openCreateUserModal() {
      this.resetCreateUserForm();
      this.isCreateUserModal = true;
    },

    // ── Schema Modals ──────────────────────────────────────────
    openRegisterSchemaEditModal() { this.isRegisterSchemaEditModal = true; },
    openEditRemoteSchema(row) {
      this.registerSchemaForm = {
        name: row.name || "",
        format: row.format || "json-schema",
        body: row.body || "",
        namespaces: row.namespaces || [],
        namespacesStr: (row.namespaces || []).join(", "),
        version: row.version || "",
        status: row.status || "draft",
        trustLevel: row.trustLevel || "Federated",
        catalogueIds: row.catalogueIds || [],
        description: row.description || "",
        author: row.author || "",
        editId: row.id,
      };
      this.isRegisterSchemaEditModal = true;
    },
    openRegisterSchemaNewModal() {
      this.registerSchemaForm = {
        name: "", format: "json-schema", body: "",
        namespaces: [], namespacesStr: "", version: "", status: "draft",
        trustLevel: "Federated", catalogueIds: [],
        description: "", author: "",
      };
      this.isRegisterSchemaNewModal = true;
    },
    closeRegisterSchemaNewModal() { this.isRegisterSchemaNewModal = false; },
    closeRegisterSchemaEditModal() { this.isRegisterSchemaEditModal = false; },
    removeRemoteCatalog(name) {
      this.registerSchemaForm.remoteCatalogs = this.registerSchemaForm.remoteCatalogs.filter(x => x !== name);
    },
    addFirstCatalogFromSearch() {
      const q = (this.registerSchemaForm.catalogSearch || "").trim();
      if (!q) return;
      const exists = this.registerSchemaForm.remoteCatalogs.some(x => x.toLowerCase() === q.toLowerCase());
      if (!exists) this.registerSchemaForm.remoteCatalogs.push(q);
      this.registerSchemaForm.catalogSearch = "";
    },
    saveRegisterSchemaNew() {
      const f = this.registerSchemaForm;
      if (!f.name || !f.format || !f.version) {
        this.addToast("error", "Name, format, and version are required.");
        return;
      }
      const data = {
        name: f.name,
        format: f.format,
        body: f.body || "",
        namespaces: f.namespaces || [],
        version: f.version,
        status: f.status || "draft",
        trustLevel: f.trustLevel || "Federated",
        catalogueIds: f.catalogueIds || [],
        description: f.description || "",
        author: f.author || "",
      };
      if (f.editId) data.id = f.editId;
      uibuilderService.send({
        type: "saveRemoteSchema",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data
      });
      this.closeRegisterSchemaNewModal();
      this.closeRegisterSchemaEditModal();
    },
    saveRegisterSchemaEdit() {
      this.saveRegisterSchemaNew();
    },

    // ── Asset Type Registry ──────────────────────────────────────
    openAssetTypeForm() {
      this.isEditingAssetType = false;
      this.assetTypeForm = { id: null, uniqueId: null, name: "", description: "", icon: "dataset" };
      this.showAssetTypeForm = true;
    },
    editAssetType(at) {
      this.isEditingAssetType = true;
      this.assetTypeForm = {
        id: at.id || at.uniqueId,
        uniqueId: at.uniqueId || at.id,
        name: at.name,
        description: at.description,
        icon: at.icon
      };
      this.showAssetTypeForm = true;
    },
    cancelAssetTypeForm() {
      this.showAssetTypeForm = false;
      this.assetTypeForm = { id: null, uniqueId: null, name: "", description: "", icon: "dataset" };
      this.isEditingAssetType = false;
      this.assetTypeError = "";
    },
    saveAssetType() {
      if (!this.assetTypeForm.name || !this.assetTypeForm.name.trim()) {
        this.assetTypeError = "Name is required";
        return;
      }
      this.isSavingAssetType = true;
      this.assetTypeError = "";
      const payload = {
        name: this.assetTypeForm.name.trim(),
        description: this.assetTypeForm.description || "",
        icon: this.assetTypeForm.icon || "dataset"
      };
      if (this.isEditingAssetType && this.assetTypeForm.uniqueId) {
        uibuilderService.send({
          type: "updateAssetType",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { uniqueId: this.assetTypeForm.uniqueId, patch: payload }
        });
      } else {
        uibuilderService.send({
          type: "saveAssetType",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: payload
        });
      }
    },
    deleteAssetType(id) {
      const at = this.assetTypes.find(t => t.uniqueId === id || t.id === id);
      if (!at) return;
      this.showConfirm("Delete Asset Type", `Are you sure you want to delete "${at.name}"?`, "Delete", () => {
        uibuilderService.send({
          type: "deleteAssetType",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { uniqueId: at.uniqueId || at.id }
        });
      });
    },
    loadAssetTypes() {
      this.isLoadingAssetTypes = true;
      uibuilderService.send({
        type: "listAssetTypes",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {}
      });
    },
    addTypeMappingRow() {
      if (!this.remoteCatalogForm.typeMapping) this.remoteCatalogForm.typeMapping = [];
      this.remoteCatalogForm.typeMapping.push({ remoteType: "", localTypeId: "" });
    },

    // ── FR-CR-03: Catalogue API Mappings ─────────────────────────
    assetTypeIdToName(id) {
      const at = (this.assetTypes || []).find(t => (t.uniqueId === id || t.id === id));
      return at ? at.name : id;
    },
    loadApiMappings() {
      const auth = { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") };
      uibuilderService.send({ type: "listApiMappings", auth, data: {} });
      uibuilderService.send({ type: "listPrompts", auth, data: { kind: "api-mapping" } });
    },
    openApiMappingForm(mapping) {
      this.apiMappingError = "";
      if (mapping) {
        this.apiMappingForm = {
          uniqueId: mapping.uniqueId,
          catalogueId: mapping.catalogueId || "",
          localTypeId: mapping.localTypeId || "",
          remoteType: mapping.remoteType || "",
          promptId: mapping.promptId || "",
          apiRequest: Object.assign(
            { method: "GET", pathTemplate: "", queryParams: {}, headers: {}, bodyTemplate: null, notes: "" },
            mapping.apiRequest || {}
          ),
          queryParamsRaw: JSON.stringify((mapping.apiRequest && mapping.apiRequest.queryParams) || {}, null, 2),
          headersRaw: JSON.stringify((mapping.apiRequest && mapping.apiRequest.headers) || {}, null, 2),
        };
      } else {
        this.apiMappingForm = {
          uniqueId: null,
          catalogueId: "",
          localTypeId: "",
          remoteType: "",
          promptId: "",
          apiRequest: { method: "GET", pathTemplate: "", queryParams: {}, headers: {}, bodyTemplate: null, notes: "" },
          queryParamsRaw: "{}",
          headersRaw: "{}",
        };
      }
      this.showApiMappingModal = true;
    },
    closeApiMappingForm() {
      this.showApiMappingModal = false;
      this.apiMappingError = "";
      this.isGeneratingApiMapping = false;
      this.isSavingApiMapping = false;
    },
    generateApiMappingWithAi() {
      if (!this.apiMappingForm.catalogueId || !this.apiMappingForm.localTypeId || !this.apiMappingForm.promptId) return;
      this.apiMappingError = "";
      this.isGeneratingApiMapping = true;
      uibuilderService.send({
        type: "generateApiMappingWithAi",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {
          catalogueId: this.apiMappingForm.catalogueId,
          localTypeId: this.apiMappingForm.localTypeId,
          promptId: this.apiMappingForm.promptId,
          remoteType: this.apiMappingForm.remoteType,
        }
      });
    },
    saveApiMapping() {
      let queryParams = {}, headers = {};
      try { queryParams = JSON.parse(this.apiMappingForm.queryParamsRaw || "{}"); }
      catch (e) { this.apiMappingError = "Query Params is not valid JSON"; return; }
      try { headers = JSON.parse(this.apiMappingForm.headersRaw || "{}"); }
      catch (e) { this.apiMappingError = "Headers is not valid JSON"; return; }
      const notes = this.apiMappingForm.apiRequest.notes || "";
      const payload = {
        uniqueId: this.apiMappingForm.uniqueId,
        catalogueId: this.apiMappingForm.catalogueId,
        localTypeId: this.apiMappingForm.localTypeId,
        remoteType: this.apiMappingForm.remoteType,
        promptId: this.apiMappingForm.promptId,
        apiRequest: Object.assign({}, this.apiMappingForm.apiRequest, { queryParams, headers }),
        generatedBy: notes.indexOf("AI-generated") === 0 ? "ai" : "manual",
        status: "active",
      };
      this.isSavingApiMapping = true;
      this.apiMappingError = "";
      uibuilderService.send({
        type: "saveApiMapping",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: payload
      });
    },
    confirmDeleteApiMapping(mapping) {
      this.showConfirm("Delete API Mapping", "Delete this API mapping?", "Delete", () => {
        uibuilderService.send({
          type: "deleteApiMapping",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { uniqueId: mapping.uniqueId }
        });
      });
    },
    removeTypeMappingRow(index) {
      if (!this.remoteCatalogForm.typeMapping) return;
      this.remoteCatalogForm.typeMapping.splice(index, 1);
    },

    // ── Prompt Management (FR-SR-03, FR-SR-04) ─────────────────
    openPromptModal() {
      this.isEditingPrompt = false;
      this.promptFormError = "";
      this.isEnhancingPrompt = false;
      this.promptForm = {
        id: null, name: "", version: "1.0", status: "draft",
        sourceSchema: "", targetSchema: "",
        template: "", examples: "", constraints: "",
        author: "",
        providerId: "",
      };
      this.showPromptModal = true;
    },
    openEditPrompt(p) {
      this.isEditingPrompt = true;
      this.promptFormError = "";
      this.isEnhancingPrompt = false;
      this.promptForm = { ...p, name: p.name || "", author: p.author || "", providerId: p.providerId || "" };
      this.showPromptModal = true;
    },
    closePromptModal() {
      this.showPromptModal = false;
      this.promptFormError = "";
      this.isEnhancingPrompt = false;
    },
    enhancePromptWithAI() {
      if (!this.promptForm.template || !this.promptForm.sourceSchema || !this.promptForm.targetSchema) {
        this.promptFormError = "Please fill in source schema, target schema, and prompt template before enhancing.";
        return;
      }
      this.isEnhancingPrompt = true;
      this.promptFormError = "";
      uibuilderService.send({
        type: "enhancePrompt",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {
          rawPrompt: this.promptForm.template,
          sourceSchema: this.promptForm.sourceSchema,
          targetSchema: this.promptForm.targetSchema,
          schemaContext: this.schemaSummaries?.SHACL || "",
          providerId: this.promptForm.providerId || ""
        }
      });
    },
    // Code generation is now handled by the backend as part of createPrompt flow.
    // The backend sends a "codeGenerated" response asynchronously after the prompt is created.
    savePrompt() {
      if (!this.promptForm.sourceSchema || !this.promptForm.targetSchema || !this.promptForm.template) return;

      // Generate a unique name if user left it empty
      let promptName = (this.promptForm.name || "").trim();
      if (!promptName) {
        let num;
        do {
          num = Math.floor(100 + Math.random() * 900);
        } while (this.prompts.some(p => p.name === `prompt-${num}`));
        promptName = `prompt-${num}`;
      }

      if (this.isEditingPrompt && this.promptForm.id) {
        uibuilderService.send({
          type: "updatePrompt",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: {
            promptId: this.promptForm.id,
            name: promptName,
            version: this.promptForm.version || "1.0",
            sourceSchema: this.promptForm.sourceSchema,
            targetSchema: this.promptForm.targetSchema,
            template: this.promptForm.template,
            examples: this.promptForm.examples || "",
            constraints: this.promptForm.constraints || "",
            status: this.promptForm.status || "active",
            code: this.promptForm.generatedCode || "",
            author: this.promptForm.author || "",
            providerId: this.promptForm.providerId || ""
          }
        });
        this.closePromptModal();
      } else {
        uibuilderService.send({
          type: "createPrompt",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: {
            name: promptName,
            version: this.promptForm.version || "1.0",
            sourceSchema: this.promptForm.sourceSchema,
            targetSchema: this.promptForm.targetSchema,
            template: this.promptForm.template,
            examples: this.promptForm.examples || "",
            constraints: this.promptForm.constraints || "",
            author: this.promptForm.author || "",
            providerId: this.promptForm.providerId || "",
          }
        });
        this.closePromptModal();
        // The prompt will be added to the list when the backend responds
      }
    },
    deletePrompt(id) {
      this.showConfirm("Delete Prompt", `Are you sure you want to delete prompt "${id}"?`, "Delete", () => {
        // Send delete to backend — UI updates when response arrives
        uibuilderService.send({
          type: "deletePrompt",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { promptId: id }
        });
      });
    },
    changePromptStatus(prompt, newStatus) {
      // Send status change to backend — backend enforces active-prompt-per-source-target rule
      uibuilderService.send({
        type: "updatePromptStatus",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { promptId: prompt.id, status: newStatus, sourceSchema: prompt.sourceSchema, targetSchema: prompt.targetSchema }
      });
    },
    insertVariable(variable) {
      const ta = this.$refs.promptTemplateArea;
      if (!ta) {
        this.promptForm.template += variable;
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = this.promptForm.template;
      this.promptForm.template = val.slice(0, start) + variable + val.slice(end);
      this.$nextTick(() => {
        ta.selectionStart = ta.selectionEnd = start + variable.length;
        ta.focus();
      });
    },
    // ── Edit Code Modal ─────────────────────────────────────
    openEditCode(prompt) {
      this.editCodePromptId = prompt.id;
      this.editCodeValue = prompt.generatedCode || "// No code generated yet";
      this.showEditCodeModal = true;
      this.$nextTick(() => this.initCodeEditor());
    },
    initCodeEditor() {
      const container = document.getElementById("codemirror-container");
      if (!container) return;
      container.innerHTML = "";
      if (this._cmEditor) {
        this._cmEditor.destroy();
        this._cmEditor = null;
      }
      this._cmEditor = new EditorView({
        state: EditorState.create({
          doc: this.editCodeValue,
          extensions: [
            basicSetup,
            javascript(),
            EditorView.lineWrapping,
            EditorView.theme({
              "&": { height: "100%", fontSize: "13px" },
              "&.cm-editor": { backgroundColor: "#FFFFFF" },
              ".cm-scroller": { overflow: "auto" },
              ".cm-content": { fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace", color: "#1F2937" },
              ".cm-gutters": { fontFamily: "'SF Mono', 'Fira Code', monospace", backgroundColor: "#F9FAFB", color: "#9CA3AF", borderRight: "1px solid #E5E7EB" },
              ".cm-activeLineGutter": { backgroundColor: "#F3F4F6" },
              ".cm-activeLine": { backgroundColor: "#F9FAFB" },
              "&.cm-focused .cm-cursor": { borderLeftColor: "#2563EB" },
              "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "#DBEAFE" },
              ".cm-selectionMatch": { backgroundColor: "#E0E7FF" },
            }),
          ],
        }),
        parent: container,
      });
    },
    closeEditCodeModal() {
      if (this._cmEditor) {
        this._cmEditor.destroy();
        this._cmEditor = null;
      }
      this.showEditCodeModal = false;
      this.editCodePromptId = null;
      this.editCodeValue = "";
    },
    saveEditCode() {
      if (this._cmEditor) {
        this.editCodeValue = this._cmEditor.state.doc.toString();
      }
      // Send code update to backend — UI updates when response arrives
      uibuilderService.send({
        type: "updatePromptCode",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { promptId: this.editCodePromptId, code: this.editCodeValue }
      });
      this.closeEditCodeModal();
    },

    promptStatusClass(status) {
      switch (status) {
        case "active": return "green";
        case "draft": return "blue";
        case "deprecated": return "yellow";
        case "archived": return "gray";
        case "writing code": return "orange";
        default: return "gray";
      }
    },

    // ── LLM Configuration (FR-SR-11) ─────────────────────────
    openLlmConfigModal() {
      this.isEditingLlmConfig = false;
      this.llmConfigError = "";
      this.llmConfigForm = {
        id: null, name: "", provider: "OpenAI", model: "",
        temperature: 0.3, maxTokens: 4096, timeout: 30, status: "active",
      };
      this.showLlmConfigModal = true;
    },
    openEditLlmConfig(cfg) {
      this.isEditingLlmConfig = true;
      this.llmConfigError = "";
      this.llmConfigForm = { ...cfg };
      this.showLlmConfigModal = true;
    },
    closeLlmConfigModal() {
      this.showLlmConfigModal = false;
      this.llmConfigError = "";
    },
    saveLlmConfig() {
      if (!this.llmConfigForm.name || !this.llmConfigForm.model) return;
      // Send to backend — backend handles ID generation, timestamps, DB persistence
      uibuilderService.send({
        type: "saveLlmConfig",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { ...this.llmConfigForm }
      });
      this.closeLlmConfigModal();
    },
    deleteLlmConfig(id) {
      const cfg = this.llmConfigs.find(c => c.id === id);
      this.showConfirm("Delete LLM Configuration", `Are you sure you want to delete "${cfg?.name || id}"?`, "Delete", () => {
        uibuilderService.send({
          type: "deleteLlmConfig",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { configId: id }
        });
      });
    },
    llmProviderClass(provider) {
      switch (provider) {
        case "OpenAI": return "green";
        case "Anthropic": return "blue";
        case "Mistral": return "yellow";
        case "Google": return "blue";
        case "Azure OpenAI": return "green";
        default: return "gray";
      }
    },

    // ── Prompt Testing (FR-SR-10) ─────────────────────────────
    runPromptTest() {
      if (!this.promptTestSelectedPrompt || !this.promptTestSelectedLlm || !this.promptTestSampleInput) return;
      this.promptTestRunning = true;
      this.promptTestResult = "";
      this.promptTestError = "";
      // Send dry run request to backend — backend looks up prompt code from DB and executes it
      uibuilderService.send({
        type: "dryRunPrompt",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {
          promptId: this.promptTestSelectedPrompt,
          llmConfigId: this.promptTestSelectedLlm,
          sampleInput: this.promptTestSampleInput
        }
      });
    },
    openSaveTestCaseModal() {
      this.isEditingTestCase = false;
      this.testCaseForm = {
        id: null,
        name: "",
        promptId: this.promptTestSelectedPrompt || "",
        llmConfigId: this.promptTestSelectedLlm || "",
        sampleInput: this.promptTestSampleInput || "",
        expectedOutput: "",
      };
      this.showTestCaseModal = true;
    },
    openEditTestCase(tc) {
      this.isEditingTestCase = true;
      this.testCaseForm = { ...tc };
      this.showTestCaseModal = true;
    },
    closeTestCaseModal() {
      this.showTestCaseModal = false;
    },
    saveTestCase() {
      if (!this.testCaseForm.name) return;
      // Send to backend — UI updates when response arrives with backend-generated ID
      uibuilderService.send({
        type: "saveTestCase",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { ...this.testCaseForm }
      });
      this.closeTestCaseModal();
    },
    deleteTestCase(id) {
      this.showConfirm("Delete Test Case", "Are you sure you want to delete this test case?", "Delete", () => {
        // Send delete to backend — UI updates when response arrives
        uibuilderService.send({
          type: "deleteTestCase",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { testCaseId: id }
        });
      });
    },
    loadTestCase(tc) {
      this.promptTestSelectedPrompt = tc.promptId;
      this.promptTestSelectedLlm = tc.llmConfigId;
      this.promptTestSampleInput = tc.sampleInput;
      this.promptTestResult = tc.lastResult || "";
      this.promptTestError = "";
    },

    // ── Batch Re-transformation (FR-SR-13) ─────────────────
    openBatchRetransformModal() {
      this.batchRetransform = {
        trigger: "prompt_change", scope: "all", catalogueFilter: "", queryFilter: "",
        dryRun: true, status: "idle", progress: 0, totalAssets: 0, processedAssets: 0,
        successCount: 0, errorCount: 0, skippedCount: 0, startedAt: "", completedAt: "", errors: [],
      };
      this.showBatchRetransformModal = true;
    },
    closeBatchRetransformModal() {
      if (this.batchRetransform.status === "running") return;
      this.showBatchRetransformModal = false;
    },
    startBatchRetransform() {
      const b = this.batchRetransform;
      b.status = "running";
      b.progress = 0;
      b.processedAssets = 0;
      b.successCount = 0;
      b.errorCount = 0;
      b.skippedCount = 0;
      b.errors = [];
      b.completedAt = "";
      // Send to backend — backend handles the processing and sends progress updates
      uibuilderService.send({
        type: "startBatchRetransform",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {
          trigger: b.trigger,
          scope: b.scope,
          catalogueFilter: b.catalogueFilter,
          queryFilter: b.queryFilter,
          dryRun: b.dryRun
        }
      });
    },
    cancelBatchRetransform() {
      // Send cancel to backend — UI updates when response arrives
      uibuilderService.send({
        type: "cancelBatchRetransform",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {}
      });
    },
    batchTriggerLabel(t) {
      return { prompt_change: "Prompt Change", strategy_change: "Strategy Change", llm_change: "LLM Config Change", manual: "Manual" }[t] || t;
    },

    // ── Transformation Audit Trail (Section B) ────────────────
    fetchAuditTrail() {
      this.auditTrail.loading = true;
      this.auditTrail.error = "";
      if (this._auditTimeout) clearTimeout(this._auditTimeout);
      this._auditTimeout = setTimeout(() => {
        if (this.auditTrail.loading) {
          this.auditTrail.loading = false;
          this.auditTrail.error = "No response from backend — request timed out.";
        }
      }, 10000);
      const filters = { ...this.auditTrail.filters };
      uibuilderService.send({
        type: "listTransformationAudit",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { filters, page: this.auditTrail.pagination.page, perPage: this.auditTrail.pagination.perPage }
      });
    },
    applyAuditFilters() {
      this.auditTrail.pagination.page = 1;
      this.fetchAuditTrail();
    },
    exportAudit(format) {
      uibuilderService.send({
        type: "exportTransformationAudit",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { format, filters: { ...this.auditTrail.filters } }
      });
    },

    // ── Multi-Model Provider (FR-SR-12) ──────────────────────
    openProviderModal() {
      this.isEditingProvider = false;
      this.providerFormError = "";
      this.showProviderApiKey = false;
      this.providerForm = { id: null, name: "", type: "openai", apiEndpoint: "", apiKey: "", models: "", rateLimits: "", timeout: 30, isDefault: false, precedence: this.llmProviders.length + 1, status: "active", hasKey: false };
      this.showProviderModal = true;
    },
    openEditProvider(p) {
      this.isEditingProvider = true;
      this.providerFormError = "";
      this.showProviderApiKey = false;
      // Backend strips the real key from listProviders responses and only exposes `hasKey: boolean`.
      // Start the API Key input empty; if left blank on save, the existing encrypted key is preserved.
      this.providerForm = {
        ...p,
        models: Array.isArray(p.models) ? p.models.join(", ") : p.models,
        apiKey: "",
        hasKey: !!p.hasKey
      };
      this.showProviderModal = true;
    },
    closeProviderModal() {
      this.showProviderModal = false;
      this.providerFormError = "";
    },
    saveProvider() {
      if (!this.providerForm.name || !this.providerForm.apiEndpoint) {
        this.providerFormError = "Name and API endpoint are required.";
        return;
      }
      if (!this.isEditingProvider && !this.providerForm.apiKey) {
        this.providerFormError = "API key is required when creating a new provider.";
        return;
      }
      if (!this.providerForm.models || (Array.isArray(this.providerForm.models) && this.providerForm.models.length === 0) ||
          (typeof this.providerForm.models === 'string' && this.providerForm.models.trim().length === 0)) {
        this.providerFormError = "At least one model is required (e.g. gpt-4o, gpt-4, gpt-3.5-turbo).";
        return;
      }
      const models = typeof this.providerForm.models === "string"
        ? this.providerForm.models.split(",").map(m => m.trim()).filter(Boolean)
        : this.providerForm.models;
      // Strip UI-only fields before sending
      const data = {
        ...this.providerForm,
        models,
        precedence: this.providerForm.precedence || this.llmProviders.length + 1
      };
      delete data.hasKey;
      // On edit, if the user left the API Key blank we must NOT overwrite the existing encrypted key.
      if (this.isEditingProvider && (!data.apiKey || data.apiKey.length === 0)) {
        delete data.apiKey;
      }
      this.providerFormError = "";
      this.isSavingProvider  = true;
      uibuilderService.send({
        type: "saveProvider",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data
      });
      // Do NOT close the modal here — wait for the response handler (success ⇒ close, error ⇒ show message).
    },
    deleteProvider(id) {
      const prov = this.llmProviders.find(p => p.id === id);
      this.showConfirm("Delete Provider", `Are you sure you want to delete "${prov?.name || id}"?`, "Delete", () => {
        uibuilderService.send({
          type: "deleteProvider",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { providerId: id }
        });
      });
    },
    moveProviderUp(id) {
      const idx = this.llmProviders.findIndex(p => p.id === id);
      if (idx <= 0) return;
      // Swap locally first for immediate feedback
      const tmp = this.llmProviders[idx];
      this.llmProviders.splice(idx, 1);
      this.llmProviders.splice(idx - 1, 0, tmp);
      this.llmProviders.forEach((p, i) => { p.precedence = i + 1; });
      // Persist to backend
      uibuilderService.send({
        type: "reorderProvider",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { providerId: id, direction: "up" }
      });
    },
    moveProviderDown(id) {
      const idx = this.llmProviders.findIndex(p => p.id === id);
      if (idx < 0 || idx >= this.llmProviders.length - 1) return;
      // Swap locally first for immediate feedback
      const tmp = this.llmProviders[idx];
      this.llmProviders.splice(idx, 1);
      this.llmProviders.splice(idx + 1, 0, tmp);
      this.llmProviders.forEach((p, i) => { p.precedence = i + 1; });
      // Persist to backend
      uibuilderService.send({
        type: "reorderProvider",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { providerId: id, direction: "down" }
      });
    },
    providerTypeClass(type) {
      switch (type) {
        case "openai": return "green";
        case "anthropic": return "blue";
        case "ollama": return "yellow";
        case "azure": return "green";
        case "google": return "blue";
        default: return "gray";
      }
    },

    // ── Audit Trail Export & Filters (FR-SR-09) ──────────────
    exportAuditTrail(format) {
      const rows = this.auditRows;
      let content, filename, mimeType;
      if (format === "csv") {
        const headers = ["ID", "Rule", "Level", "Step", "Asset ID", "Catalogue", "Prompt Version", "Status", "Timestamp"];
        const csvRows = rows.map(r => [r.id, r.rule, r.level, r.step, r.assetId || "", r.catalogueId || "", r.promptVersion || "", r.status || "", r.timestamp].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
        content = [headers.join(","), ...csvRows].join("\n");
        filename = "audit-trail.csv";
        mimeType = "text/csv";
      } else {
        content = JSON.stringify(rows, null, 2);
        filename = "audit-trail.json";
        mimeType = "application/json";
      }
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    clearAuditFilters() {
      this.auditFilters = { assetId: "", catalogueId: "", promptVersion: "", status: "", dateFrom: "", dateTo: "" };
    },

    // ── Local Schema CRUD (Milestone 2) ──────────────────────
    openCreateLocalSchemaModal() {
      this.isEditingLocalSchema = false;
      this.editingLocalSchemaId = null;
      this.localSchemaForm = { schema: "", format: "shacl", body: "", namespaces: "", status: "draft", catalogs: 1, localMapping: "", versioning: "1.0.0", trustLevel: "Federated", author: "", description: "" };
      this.validateSampleForm = { assetBody: "", result: null, loading: false };
      this.showCreateLocalSchemaModal = true;
    },
    openEditLocalSchema(row) {
      this.isEditingLocalSchema = true;
      this.editingLocalSchemaId = row.id;
      this.localSchemaForm = {
        schema: row.schema, format: row.format || "shacl", body: row.body || "",
        namespaces: Array.isArray(row.namespaces) ? row.namespaces.join(", ") : (row.namespaces || ""),
        status: row.status || "draft", catalogs: row.catalogs, localMapping: row.localMapping || "",
        versioning: row.versioning, trustLevel: row.trustLevel,
        author: row.author || "", description: row.description || ""
      };
      this.validateSampleForm = { assetBody: "", result: null, loading: false };
      this.showCreateLocalSchemaModal = true;
    },
    closeCreateLocalSchemaModal() {
      this.showCreateLocalSchemaModal = false;
    },
    confirmCloseLocalSchemaModal() {
      if (this.localSchemaForm.schema || this.localSchemaForm.body) {
        this.showConfirm("Discard changes?", "You have unsaved changes. Are you sure you want to close?", "Discard", () => {
          this.closeCreateLocalSchemaModal();
        });
      } else {
        this.closeCreateLocalSchemaModal();
      }
    },
    saveLocalSchema() {
      if (!this.localSchemaForm.schema) return;
      const nsStr = this.localSchemaForm.namespaces || "";
      const namespaces = nsStr.split(",").map(s => s.trim()).filter(Boolean);
      const data = {
        schema: this.localSchemaForm.schema,
        format: this.localSchemaForm.format || "shacl",
        body: this.localSchemaForm.body || "",
        namespaces,
        status: this.localSchemaForm.status || "draft",
        catalogs: this.localSchemaForm.catalogs,
        localMapping: this.localSchemaForm.localMapping || null,
        versioning: this.localSchemaForm.versioning,
        trustLevel: this.localSchemaForm.trustLevel,
        author: this.localSchemaForm.author || "",
        description: this.localSchemaForm.description || "",
      };
      if (this.isEditingLocalSchema && this.editingLocalSchemaId != null) {
        data.id = this.editingLocalSchemaId;
      }
      uibuilderService.send({
        type: "saveLocalSchema",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data
      });
      this.showCreateLocalSchemaModal = false;
    },
    confirmDeleteSchema(id) {
      const schema = this.schemaRegistry.find(s => s.id === id);
      this.showConfirm("Delete Schema", `Are you sure you want to delete "${schema?.schema || 'this schema'}"? This action cannot be undone.`, "Delete", () => {
        uibuilderService.send({
          type: "deleteLocalSchema",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { schemaId: id }
        });
      });
    },

    // ── Local Schema Versions (Section C) ─────────────────────
    fetchSchemaVersions(schemaName) {
      uibuilderService.send({
        type: "listLocalSchemaVersions",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { schemaName }
      });
    },
    openSchemaVersionPanel(schemaName) {
      this.schemaVersionPanelName = schemaName;
      this.schemaVersionPanelLoading = true;
      this.showSchemaVersionPanel = true;
      this.fetchSchemaVersions(schemaName);
    },
    activateSchemaVersion(schemaName, version) {
      uibuilderService.send({
        type: "activateLocalSchemaVersion",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { schemaName, version }
      });
    },
    validateSampleAsset() {
      if (!this.validateSampleForm.assetBody) return;
      this.validateSampleForm.loading = true;
      this.validateSampleForm.result = null;
      uibuilderService.send({
        type: "validateSampleAsset",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {
          schemaBody: this.localSchemaForm.body,
          assetBody: this.validateSampleForm.assetBody,
          format: this.localSchemaForm.format
        }
      });
    },

    // ── Prompt Versions (D3) ──────────────────────────────
    openPromptVersionPanel(p) {
      this.promptVersionPanelName = p.sourceSchema + " → " + p.targetSchema;
      this.promptVersionPanelLoading = true;
      this.showPromptVersionPanel = true;
      this.promptVersions = [];
      uibuilderService.send({
        type: "listPromptVersions",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { sourceSchemaId: p.sourceSchema, targetSchemaId: p.targetSchema }
      });
    },
    activatePromptVersion(v) {
      uibuilderService.send({
        type: "updatePromptStatus",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { promptId: v.id, status: "active", sourceSchema: v.sourceSchema, targetSchema: v.targetSchema }
      });
    },

    // ── System Settings (E4) ────────────────────────────────
    fetchSystemSettings() {
      uibuilderService.send({
        type: "getSystemSettings",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {}
      });
    },
    setDefaultProvider(providerId) {
      uibuilderService.send({
        type: "setSystemSetting",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { key: "defaultLlmProviderId", value: providerId }
      });
    },

    confirmDeleteRemoteSchema(id) {
      const schema = this.remoteSchemas.find(s => s.id === id);
      this.showConfirm("Delete Remote Schema", `Are you sure you want to delete "${schema?.name || 'this schema'}"?`, "Delete", () => {
        uibuilderService.send({
          type: "deleteRemoteSchema",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { schemaId: id }
        });
      });
    },

    // ── Schema Version Diff (Milestone 2) ─────────────────────
    openSchemaDiff(row) {
      this.schemaDiffRow = { ...row };
      this.schemaDiffVersionA = row.versionOptions?.[0] || "v1.0";
      this.schemaDiffVersionB = row.versioning || row.versionOptions?.[1] || "v1.1";
      this.showSchemaDiffPanel = true;
    },
    closeSchemaDiff() {
      this.showSchemaDiffPanel = false;
      this.schemaDiffRow = null;
    },
    getSchemaDiffContent(version) {
      // Mock diff content per version
      const base = this.schemaDiffRow?.schema || "Schema";
      const diffs = {
        "v1.0": `@prefix dcat: <http://www.w3.org/ns/dcat#> .\n@prefix dct:  <http://purl.org/dc/terms/> .\n\n:DatasetShape a sh:NodeShape ;\n  sh:targetClass dcat:Dataset ;\n  sh:property [\n    sh:path dct:title ;\n    sh:minCount 1 ;\n  ] ;\n  sh:property [\n    sh:path dct:identifier ;\n    sh:minCount 1 ;\n  ] .`,
        "v1.1": `@prefix dcat: <http://www.w3.org/ns/dcat#> .\n@prefix dct:  <http://purl.org/dc/terms/> .\n@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .\n\n:DatasetShape a sh:NodeShape ;\n  sh:targetClass dcat:Dataset ;\n  sh:property [\n    sh:path dct:title ;\n    sh:datatype xsd:string ;\n    sh:minCount 1 ;\n  ] ;\n  sh:property [\n    sh:path dct:identifier ;\n    sh:datatype xsd:string ;\n    sh:minCount 1 ;\n  ] ;\n  sh:property [\n    sh:path dcat:distribution ;\n    sh:node :DistributionShape ;\n  ] .`,
        "v2.0": `@prefix dcat: <http://www.w3.org/ns/dcat#> .\n@prefix dct:  <http://purl.org/dc/terms/> .\n@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .\n@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n\n:DatasetShape a sh:NodeShape ;\n  sh:targetClass dcat:Dataset ;\n  sh:property [\n    sh:path dct:title ;\n    sh:datatype xsd:string ;\n    sh:minCount 1 ;\n    sh:maxCount 1 ;\n  ] ;\n  sh:property [\n    sh:path dct:identifier ;\n    sh:datatype xsd:string ;\n    sh:minCount 1 ;\n  ] ;\n  sh:property [\n    sh:path dcat:distribution ;\n    sh:node :DistributionShape ;\n    sh:minCount 0 ;\n  ] ;\n  sh:property [\n    sh:path dct:publisher ;\n    sh:node :AgentShape ;\n    sh:minCount 1 ;\n  ] .`,
      };
      return diffs[version] || `# ${base} — ${version}\n# No content available for this version.`;
    },

    // ── Add Mapping Modal (Milestone 2) ───────────────────────
    openAddMappingModal() {
      console.log("[facis] openAddMappingModal() fired");
      this.isEditingMapping = false;
      this.editingMappingId = null;
      this.addMappingForm = {
        remoteCatalogueId: "", remoteSchemaId: "",
        remoteCatalogue: "", remoteSchema: "",
        localSchemaId: "",
        remoteSchemaMeta: "", transformationStrategy: "Deterministic RDF",
        promptsCount: 0, shaclCount: 0,
        fieldMappings: [], targetClass: "", jsonLdContext: "",
        promptId: ""
      };
      this.showAddMappingModal = true;
    },
    closeAddMappingModal() {
      this.showAddMappingModal = false;
    },
    saveAddMapping() {
      if (!this.addMappingForm.remoteCatalogueId || !this.addMappingForm.remoteSchemaId || !this.addMappingForm.localSchemaId) return;
      // Resolve display names from IDs for table rendering
      const cat = this.catalogsTable.find(c => c.id === this.addMappingForm.remoteCatalogueId);
      const rs = this.remoteSchemas.find(s => s.id === this.addMappingForm.remoteSchemaId);
      const data = {
        ...this.addMappingForm,
        remoteCatalogue: cat?.catalogName || this.addMappingForm.remoteCatalogueId,
        remoteSchema: rs ? (rs.name + " " + rs.version) : this.addMappingForm.remoteSchemaId,
        localSchema: this.addMappingForm.localSchemaId,
        fieldMappings: Array.isArray(this.addMappingForm.fieldMappings) ? this.addMappingForm.fieldMappings : [],
        targetClass:   this.addMappingForm.targetClass   || "",
        jsonLdContext: this.addMappingForm.jsonLdContext || "",
        promptId:      this.addMappingForm.promptId      || ""
      };
      if (this.isEditingMapping && this.editingMappingId != null) {
        data.id = this.editingMappingId;
      }
      uibuilderService.send({
        type: "saveMapping",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data
      });
      this.showAddMappingModal = false;
    },

    // ── Mapping View/Edit Detail (Milestone 2) ────────────────
    openMappingViewEdit(row) {
      this.mappingDetailRow = {
        ...row,
        fieldMappings: Array.isArray(row.fieldMappings) ? row.fieldMappings : [],
        targetClass:   row.targetClass   || "",
        jsonLdContext: row.jsonLdContext || "",
        promptId:      row.promptId      || ""
      };
      this.isEditingMappingDetail = false;
      this.showMappingDetailPanel = true;
    },
    addFieldMappingRow() {
      if (!this.mappingDetailRow) return;
      if (!Array.isArray(this.mappingDetailRow.fieldMappings)) {
        this.mappingDetailRow.fieldMappings = [];
      }
      this.mappingDetailRow.fieldMappings.push({ from: "", to: "", transform: "" });
    },
    removeFieldMappingRow(i) {
      if (!this.mappingDetailRow || !Array.isArray(this.mappingDetailRow.fieldMappings)) return;
      this.mappingDetailRow.fieldMappings.splice(i, 1);
    },
    closeMappingDetail() {
      this.showMappingDetailPanel = false;
      this.mappingDetailRow = null;
      this.isEditingMappingDetail = false;
    },
    startEditMappingDetail() {
      if (!this.mappingDetailRow) return;
      const r = this.mappingDetailRow;
      this.mappingDetailEditForm = {
        remoteCatalogueId:      r.remoteCatalogueId      || "",
        remoteSchemaId:         r.remoteSchemaId         || "",
        remoteCatalogue:        r.remoteCatalogue        || "",
        remoteSchema:           r.remoteSchema           || "",
        localSchema:            r.localSchema            || "",
        remoteSchemaMeta:       r.remoteSchemaMeta       || "",
        transformationStrategy: r.transformationStrategy || "Deterministic RDF",
        promptsCount:           r.promptsCount           || 0,
        shaclCount:             r.shaclCount             || 0,
        namespacesToPreserve:   Array.isArray(r.namespacesToPreserve) ? [...r.namespacesToPreserve] : [],
        shaclShapeSchemaId:     r.shaclShapeSchemaId     || "",
        fieldMappings:          Array.isArray(r.fieldMappings) ? r.fieldMappings.map(x => ({ ...x })) : [],
        targetClass:            r.targetClass            || "",
        jsonLdContext:          r.jsonLdContext          || "",
        promptId:               r.promptId               || ""
      };
      this.isEditingMappingDetail = true;
    },
    cancelEditMappingDetail() {
      this.isEditingMappingDetail = false;
    },
    saveEditMappingDetail() {
      if (!this.mappingDetailRow) return;
      // Merge: detail row is the source of truth for fields not in the edit form
      // (e.g. fieldMappings + targetClass added via inline rows / target-class input).
      const merged = {
        ...this.mappingDetailRow,
        ...this.mappingDetailEditForm,
        fieldMappings: Array.isArray(this.mappingDetailRow.fieldMappings) ? this.mappingDetailRow.fieldMappings : (this.mappingDetailEditForm.fieldMappings || []),
        targetClass:   this.mappingDetailRow.targetClass   || this.mappingDetailEditForm.targetClass   || "",
        jsonLdContext: this.mappingDetailRow.jsonLdContext || this.mappingDetailEditForm.jsonLdContext || "",
        promptId:      this.mappingDetailEditForm.promptId  || this.mappingDetailRow.promptId      || ""
      };
      const data = { id: this.mappingDetailRow.id, ...merged };
      uibuilderService.send({
        type: "saveMapping",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data
      });
      this.isEditingMappingDetail = false;
    },
    openMappingPrompts(row) {
      this.openMappingViewEdit(row);
    },
    openMappingShacl(row) {
      this.openMappingViewEdit(row);
    },

    // ── RDF Mapping Config (FR-SR-06 / FR-SR-07) ────────────
    openRdfMappingConfig(row) {
      this.rdfConfigMapping = row;
      this.rdfConfigForm = {
        namespacesToPreserve: Array.isArray(row.namespacesToPreserve) ? [...row.namespacesToPreserve] : [],
        shaclShapeSchemaId: row.shaclShapeSchemaId || "",
      };
      this.rdfConfigNewNamespace = "";
      this.rdfTestInput = "";
      this.rdfTestResult = null;
      this.showRdfConfigPanel = true;
    },
    addRdfNamespace() {
      const ns = (this.rdfConfigNewNamespace || "").trim();
      if (ns && !this.rdfConfigForm.namespacesToPreserve.includes(ns)) {
        this.rdfConfigForm.namespacesToPreserve.push(ns);
      }
      this.rdfConfigNewNamespace = "";
    },
    addPresetNamespace(ns) {
      if (!this.rdfConfigForm.namespacesToPreserve.includes(ns)) {
        this.rdfConfigForm.namespacesToPreserve.push(ns);
      }
    },
    getShaclShapeBody(schemaId) {
      const s = this.schemaRegistry.find(x => x.id === schemaId);
      return s ? (s.body || "(no body)") : "(schema not found)";
    },
    saveRdfConfig() {
      if (!this.rdfConfigMapping) return;
      this.rdfConfigSaving = true;
      uibuilderService.send({
        type: "saveRdfMappingConfig",
        data: {
          mappingId: this.rdfConfigMapping.id,
          namespacesToPreserve: this.rdfConfigForm.namespacesToPreserve,
          shaclShapeSchemaId: this.rdfConfigForm.shaclShapeSchemaId,
        }
      });
    },
    testRdfMapping() {
      this.rdfTestRunning = true;
      this.rdfTestResult = null;
      uibuilderService.send({
        type: "testRdfMapping",
        data: {
          rdfInput: this.rdfTestInput,
          rdfFormat: this.rdfTestFormat,
          namespacesToPreserve: this.rdfConfigForm.namespacesToPreserve,
          shaclShapeSchemaId: this.rdfConfigForm.shaclShapeSchemaId,
        }
      });
    },

    // FR-SR-08: Hybrid Fallback transform execution
    executeHybridTransform(mapping) {
      if (!mapping || !mapping.id) return;
      const inputData = this.rdfTestInput || '';
      if (!inputData.trim()) {
        this.addToast && this.addToast('warning', 'Please enter test input data in the RDF Test Input field first');
        return;
      }
      this.hybridTransformLoading = true;
      this.hybridTransformResult = null;
      uibuilderService.send({
        type: "executeHybridTransform",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {
          mappingId: mapping.id,
          inputData: inputData
        }
      });
    },

    // ── Mapping ────────────────────────────────────────────────
    toggleAllMappingRows(e) {
      this.selectedMappingRows = e.target.checked ? this.mappingPagination.rows.map(r => r.id) : [];
    },
    removeMappingRow(id) {
      const row = this.mappingRows.find(r => r.id === id);
      this.showConfirm("Delete Mapping", `Are you sure you want to delete the mapping for "${row?.remoteCatalogue || 'this mapping'}"?`, "Delete", () => {
        uibuilderService.send({
          type: "deleteMapping",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
          data: { mappingId: id }
        });
      });
    },

    // ── Harvest Wizard ─────────────────────────────────────────
    openHarvestWizard() {
      this.showHarvestWizard = true;
      this.harvestWizardStep = 1;
      this.harvestWizardSearch = "";
      this.harvestWizardSelectedRows = [];
      this.harvestScope = {
        selected: [], typeValue: "", queryValue: "",
        fromDate: "", toDate: "",
        includeNewAssets: false, schemaMappingEnabled: false, resolveReferences: false,
      };
      this.lifecycleMapping = {
        performSchemaMapping: true, updateHandling: "version",
        deletionHandling: "remove", resolveReferences: true,
      };
      this.pagination.harvestWizard.page = 1;
      this.isLoadingHarvestCatalogues = true;
      this.harvestWizardRows = [];
      this.harvestWizardRowsBase = [];
      // Ensure catalogsTable is fresh (needed for sourceData in startHarvest)
      uibuilderService.send({
        type: "getCatalogRegistry",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
      });
      // Load harvest-specific catalogue list
      uibuilderService.send({
        type: "getHarvestCatalogues",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
      });
    },
    closeHarvestWizard() { this.showHarvestWizard = false; this.harvestWizardStep = 1; },
    nextHarvestWizardStep() {
      if (this.harvestWizardStep === 1 && this.harvestWizardSelectedRows.length === 0) {
        this.addToast("error", "Please select at least one remote catalogue.");
        return;
      }
      this.harvestWizardStep = Math.min(4, this.harvestWizardStep + 1);
    },
    prevHarvestWizardStep() { this.harvestWizardStep = Math.max(1, this.harvestWizardStep - 1); },
    runHarvestWizardSearch() {
      const q = normalizeText(this.harvestWizardSearch);
      if (!q) {
        this.harvestWizardRows = [...this.harvestWizardRowsBase];
      } else {
        this.harvestWizardRows = this.harvestWizardRowsBase.filter(row =>
          normalizeText(JSON.stringify(row)).includes(q)
        );
      }
      this.pagination.harvestWizard.page = 1;
    },
    toggleWizardSelectAll(e) {
      this.harvestWizardSelectedRows = e.target.checked ? this.harvestWizardRows.map(r => r.id) : [];
    },
    toggleScopeOption(key) {
      const s = this.harvestScope.selected;
      if (key === "all_assets") {
        this.harvestScope.selected = s.includes("all_assets") ? [] : ["all_assets"];
        return;
      }
      if (s.includes("all_assets")) return;
      this.harvestScope.selected = s.includes(key) ? s.filter(x => x !== key) : [...s, key];
      if (!this.showIncludeNewAssetsToggle) this.harvestScope.includeNewAssets = false;
    },
    toggleLifecycleCard(key) {
      if (this.lifecycleMapping && key in this.lifecycleMapping) {
        this.lifecycleMapping[key] = !this.lifecycleMapping[key];
      }
    },
    startHarvest() {
      if (this.harvestWizardSelectedRows.length === 0) {
        this.addToast("error", "Please select at least one catalogue to harvest.");
        return;
      }
      const selectedCatalogues = this.harvestWizardRowsBase
        .filter(r => this.harvestWizardSelectedRows.includes(r.id))
        .map(r => {
          // Find the full catalogue record to include sourceData if present
          const fullCat = this.catalogsTable.find(c => c.id === r.id || c.uniqueId === r.id);
          return {
            uniqueId: r.id,
            catalogName: r.catalog,
            strategy: r.strategy || "none",
            baseEndpoint: r.endpoint || fullCat?.baseEndpoint || fullCat?.queryEndpoint || "",
            sourceData: fullCat?.sourceData || null,
            responseRootPath: fullCat?.responseRootPath || "",
            responseAssetIdField: fullCat?.responseAssetIdField || "",
            responseAssetNameField: fullCat?.responseAssetNameField || "",
            responseAssetTypeField: fullCat?.responseAssetTypeField || "",
            // Pass auth config so the harvest handler can make authenticated API calls
            auth: fullCat?.auth || "none",
            authLoginEndpoint: fullCat?.authLoginEndpoint || "",
            authUsername: fullCat?.authUsername || "",
            authPassword: fullCat?.authPassword || "",
            authPayloadTemplate: fullCat?.authPayloadTemplate || "",
            authTokenPath: fullCat?.authTokenPath || "token",
            authTokenPrefix: fullCat?.authTokenPrefix || "",
            authStaticToken: fullCat?.authStaticToken || "",
            authApiKey: fullCat?.authApiKey || "",
            authApiKeyHeader: fullCat?.authApiKeyHeader || "X-API-Key",
          };
        });

      // FR-ACM-05: if resolveReferences is enabled, also attach sourceData for every OTHER
      // registered catalogue (tagged _crawlOnly:true) so the backend can follow references
      // into catalogues that weren't explicitly selected for this harvest.
      if (this.harvestScope && this.harvestScope.resolveReferences) {
        const selectedIds = new Set(selectedCatalogues.map(c => c.uniqueId || c.catalogId));
        const allRegistered = Array.isArray(this.catalogsTable) ? this.catalogsTable : [];
        for (const reg of allRegistered) {
          const regId = reg.uniqueId || reg.id || reg.catalogId;
          if (!regId || selectedIds.has(regId)) continue;
          selectedCatalogues.push({
            uniqueId: regId,
            catalogName: reg.catalogName || reg.catalog || reg.name || regId,
            strategy: reg.strategy || "none",
            baseEndpoint: reg.baseEndpoint || reg.queryEndpoint || reg.endpoint || "",
            sourceData: reg.sourceData || reg._cachedSourceData || null,
            responseRootPath: reg.responseRootPath || "",
            responseAssetIdField: reg.responseAssetIdField || "",
            responseAssetNameField: reg.responseAssetNameField || "",
            responseAssetTypeField: reg.responseAssetTypeField || "",
            typeMapping: Array.isArray(reg.typeMapping) ? reg.typeMapping : [],
            _crawlOnly: true
          });
        }
      }

      this.isSubmittingHarvest = true;
      this.harvestSubmitError = "";
      // Set a timeout to detect silent backend failure
      if (this._harvestTimeout) clearTimeout(this._harvestTimeout);
      this._harvestTimeout = setTimeout(() => {
        if (this.isSubmittingHarvest) {
          this.isSubmittingHarvest = false;
          this.addToast("error", "Harvest request timed out — no response from backend. Check Node-RED logs.");
        }
      }, 30000);
      uibuilderService.send({
        type: "startHarvest",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {
          catalogues: selectedCatalogues,
          scope: { ...this.harvestScope },
          lifecycle: { ...this.lifecycleMapping },
        }
      });
      this.closeHarvestWizard();
    },

    // ── Harvest Run Detail (Milestone 3) ──────────────────────
    openHarvestRunDetail(run) {
      uibuilderService.send({
        type: "getHarvestRunDetail",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { runId: run.id }
      });
      this.harvestRunDetailData = { ...run, assets: [], logs: [], provenance: [] };
      this.harvestDetailTab = "assets";
      this.showHarvestRunDetail = true;
    },
    closeHarvestRunDetail() {
      this.showHarvestRunDetail = false;
      this.harvestRunDetailData = null;
    },

    // ── Live Harvest Progress (Milestone 3) ───────────────────
    applyHarvestProgress(data) {
      const h = this.activeHarvest;
      h.status = data.status || h.status;
      h.catalogueName = data.catalogueName || h.catalogueName;
      h.progress = data.progress ?? h.progress;
      h.totalAssets = data.totalAssets ?? h.totalAssets;
      h.processedAssets = data.processedAssets ?? h.processedAssets;
      h.successCount = data.successCount ?? h.successCount;
      h.errorCount = data.errorCount ?? h.errorCount;
      h.startedAt = data.startedAt || h.startedAt;
      h.running = h.status === "running";
      h._runId = data.runId || h._runId;
      if (data.errors) h.errors = data.errors;
    },
    pauseHarvest() {
      uibuilderService.send({
        type: "pauseHarvest",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { runId: this.activeHarvest._runId }
      });
      this.activeHarvest.status = "paused";
      this.activeHarvest.running = false;
    },
    resumeHarvest() {
      uibuilderService.send({
        type: "resumeHarvest",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { runId: this.activeHarvest._runId }
      });
      this.activeHarvest.status = "running";
      this.activeHarvest.running = true;
    },
    cancelHarvest() {
      uibuilderService.send({
        type: "cancelHarvest",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { runId: this.activeHarvest._runId }
      });
      this.activeHarvest.status = "cancelled";
      this.activeHarvest.running = false;
    },
    loadHarvestData() {
      uibuilderService.send({ type: "listHarvestRuns", auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") } });
      uibuilderService.send({ type: "listHarvestLogs", auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") } });
      uibuilderService.send({ type: "listHarvestProvenance", auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") } });
    },
    openClearHarvestHistoryModal() {
      this.showClearHarvestHistoryModal = true;
    },
    closeClearHarvestHistoryModal() {
      if (this.clearHarvestHistoryRunning) return;
      this.showClearHarvestHistoryModal = false;
    },
    confirmClearHarvestHistory() {
      this.clearHarvestHistoryRunning = true;
      uibuilderService.send({
        type: "clearHarvestHistory",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: {}
      });
    },

    // ── Utility ─────────────────────────────────────────────────
    formatRelativeDate(isoStr) {
      if (!isoStr) return "never";
      const d = new Date(isoStr);
      const now = new Date();
      const diffMs = d - now;
      const absDays = Math.abs(Math.round(diffMs / 86400000));
      if (diffMs < 0) return "Expired " + absDays + " day" + (absDays !== 1 ? "s" : "") + " ago";
      if (absDays === 0) return "today";
      return "in " + absDays + " day" + (absDays !== 1 ? "s" : "");
    },

    // ── Toast Notifications (Milestone 5) ──────────────────────
    addToast(type, message, duration = 4000) {
      const id = ++this._toastCounter;
      this.toasts.push({ id, type, message });
      setTimeout(() => this.dismissToast(id), duration);
    },
    dismissToast(id) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    },

    // ── Confirmation Dialog (Milestone 5) ────────────────────
    showConfirm(title, message, confirmLabel, onConfirm) {
      this.confirmDialog = { visible: true, title, message, confirmLabel: confirmLabel || "Delete", onConfirm };
    },
    cancelConfirm() {
      this.confirmDialog = { visible: false, title: "", message: "", confirmLabel: "Delete", onConfirm: null };
    },
    executeConfirm() {
      if (typeof this.confirmDialog.onConfirm === "function") {
        this.confirmDialog.onConfirm();
      }
      this.cancelConfirm();
    },

    // ── Delete Blocked Modal ────────────────────────────────
    closeDeleteBlockedModal() {
      this.deleteBlockedModal = { visible: false, title: "", message: "", mappings: [] };
    },
    goToMappingRow(mappingId) {
      this.closeDeleteBlockedModal();
      this.currentSchemaTab = "mapping";
      this.$nextTick(() => {
        const row = this.$refs.mappingTableBody?.querySelector(`tr[data-id="${mappingId}"]`);
        if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },

    // ── Delete Remote Catalogue (Milestone 5) ────────────────
    confirmDeleteRemoteCatalog(id) {
      const cat = this.catalogsTable.find(c => String(c.id) === String(id) || String(c.uniqueId) === String(id));
      const name = cat?.catalogName || cat?.catalogId || "this catalogue";
      this.showConfirm(
        "Delete Remote Catalogue",
        `Are you sure you want to delete "${name}"? This action cannot be undone.`,
        "Delete",
        () => this.deleteRemoteCatalog(id)
      );
    },
    deleteRemoteCatalog(id) {
      uibuilderService.send({
        type: "deleteRemoteCatalog",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { uniqueId: id }
      });
      // Optimistically remove from table
      this.catalogsTable = this.catalogsTable.filter(c => String(c.id) !== String(id) && String(c.uniqueId) !== String(id));
      this.addToast("success", "Remote catalogue deleted successfully.");
    },

    // ── Monitoring ─────────────────────────────────────────────
    fetchMonitoring() {
      const auth = { userToken: localStorage.getItem("authToken") || getCookie("userToken"), clientId: getCookie("uibuilder-client-id") };
      uibuilderService.send({ type: "getMonitoringOverview", auth: auth, _silent: true });
    },
    startMonitoringPolling() {
      this.fetchMonitoring();
      this._monitoringTimer = setInterval(() => this.fetchMonitoring(), 10000);
    },
    stopMonitoringPolling() {
      if (this._monitoringTimer) { clearInterval(this._monitoringTimer); this._monitoringTimer = null; }
    },
    formatMonitoringTime(iso) {
      if (!iso) return "—";
      try {
        const d = new Date(iso);
        return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      } catch (e) { return iso; }
    },
    exportMonitoringLog(format) {
      const rows = this.filteredMonitoringEvents;
      let content, filename, mimeType;
      if (format === "csv") {
        const headers = ["Timestamp", "Action", "Actor", "Target", "Meta"];
        const csvRows = rows.map(r => [r.at, r.action, r.actor, r.target, r.meta].map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","));
        content = [headers.join(","), ...csvRows].join("\n");
        filename = "monitoring-events.csv";
        mimeType = "text/csv";
      } else {
        content = JSON.stringify(rows, null, 2);
        filename = "monitoring-events.json";
        mimeType = "application/json";
      }
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.addToast("success", `Event log exported as ${format.toUpperCase()}.`);
    },

    // ── Password Change (Milestone 4) ─────────────────────────
    changePassword() {
      this.passwordFormError = "";
      this.passwordFormSuccess = "";
      if (this.passwordForm.newPassword.length < 8) {
        this.passwordFormError = "New password must be at least 8 characters.";
        return;
      }
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        this.passwordFormError = "Passwords do not match.";
        return;
      }
      // Simulate password change
      setTimeout(() => {
        this.passwordFormSuccess = "Password updated successfully.";
        this.passwordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };
        this.addToast("success", "Password changed successfully.");
      }, 600);
    },

    // ── Access Info ─────────────────────────────────────────────
    openAccessInformation() { this.showAccessInformation = true; },
    closeAccessInformation() { this.showAccessInformation = false; },

    // ── Role Management ───────────────────────────────────────────
    confirmDeleteRole(roleKey) {
      this.confirmDialog = {
        visible: true,
        title: "Delete Role",
        message: "Are you sure you want to delete the role '" + roleKey + "'? This cannot be undone.",
        confirmLabel: "Delete",
        onConfirm: () => {
          const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
          uibuilderService.send({ type: "deleteRole", data: { key: roleKey }, auth: auth });
          this.confirmDialog.visible = false;
        }
      };
    },

    // ── Authentication ──────────────────────────────────────────
    loginSubmit() {
      this.loginError = "";
      this.loginErrorCode = "";
      if (!this.loginForm.username || !this.loginForm.password) {
        this.loginError = "Username and password are required.";
        return;
      }
      this.isLoggingIn = true;
      uibuilderService.send({
        type: "login",
        data: { username: this.loginForm.username, password: this.loginForm.password }
      });
    },
    handleSignOut() {
      this.showUserProfile = false;
      const token = localStorage.getItem("authToken") || "";
      uibuilderService.send({
        type: "logOut",
        data: { token: token },
        auth: { userToken: token, clientId: getCookie("uibuilder-client-id") }
      });
      localStorage.removeItem("authToken");
      document.cookie = "userToken=; path=/; max-age=0";
      this.isLoggedIn = false;
      this.authToken = "";
      this.currentUser = { id: "", email: "", username: "", roles: [], permissions: [], isAuthenticated: false, status: "" };
      this.loginForm = { username: "", password: "" };
      this.loginError = "";
      this.loginErrorCode = "";
    },
    logout() {
      this.handleSignOut();
    },
    initDashboardData() {
      const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
      // Hydrate session to get full permissions
      uibuilderService.send({ type: "hydrateSession", data: { token: auth.userToken }, auth: auth });
      // Load all data after successful login
      uibuilderService.send({ type: "listPrompts", data: {} });
      uibuilderService.send({ type: "listTestCases", data: {} });
      uibuilderService.send({ type: "listLlmConfigs", data: {} });
      uibuilderService.send({ type: "listProviders", data: {} });
      uibuilderService.send({ type: "listLocalSchemas", data: {} });
      uibuilderService.send({ type: "listMappings", data: {} });
      uibuilderService.send({ type: "listRemoteSchemas", data: {} });
      uibuilderService.send({ type: "getCatalogRegistry", auth: auth });
      uibuilderService.send({ type: "listAssetTypes", auth: auth, data: {} });
      // Only load admin data if user has adminTools access
      const aa = this.currentUser.accessAreas || [];
      if (aa.includes('adminTools') || this.userAccess.includes('admin_tools')) {
        uibuilderService.send({ type: "listUsers", auth: auth });
        uibuilderService.send({ type: "listRoles", auth: auth });
      }
      this.loadHarvestData();
    },
  },

  mounted() {
    uibuilderService.start();

    // Check for existing session token
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      this.isCheckingAuth = true;
      uibuilderService.send({ type: "checkAuth", data: { token: storedToken } });
    } else {
      this.isCheckingAuth = false;
      this.isLoggedIn = false;
    }

    uibuilderService.onMessage((msg) => {
      console.log(msg);
      const payload = msg?.payload ?? msg;
      const resp = payload?.response ?? msg?.response;

      // ── FR-CR-03: Catalogue API Mappings ────────────────────
      if (resp?.action === "listApiMappings") {
        this.apiMappings = Array.isArray(resp.mappings) ? resp.mappings : [];
      }
      if (resp?.action === "listPrompts" && resp.kind === "api-mapping") {
        this.apiMappingPrompts = Array.isArray(resp.prompts) ? resp.prompts : [];
      }
      if (resp?.action === "saveApiMapping") {
        this.isSavingApiMapping = false;
        if (resp.status === "success") {
          this.showApiMappingModal = false;
          this.loadApiMappings();
          this.addToast("success", "API mapping saved.");
        } else {
          this.apiMappingError = resp.message || "Save failed";
          this.addToast("error", this.apiMappingError);
        }
      }
      if (resp?.action === "deleteApiMapping" && resp.status === "success") {
        this.apiMappings = (this.apiMappings || []).filter(m => m.uniqueId !== resp.uniqueId);
        this.addToast("success", "API mapping deleted.");
      }
      if (resp?.action === "generateApiMappingWithAi") {
        this.isGeneratingApiMapping = false;
        if (resp.status === "success" && resp.apiRequest) {
          this.apiMappingForm.apiRequest = Object.assign({}, resp.apiRequest);
          this.apiMappingForm.queryParamsRaw = JSON.stringify(resp.apiRequest.queryParams || {}, null, 2);
          this.apiMappingForm.headersRaw = JSON.stringify(resp.apiRequest.headers || {}, null, 2);
          this.addToast("success", "AI generated API mapping.");
        } else {
          this.apiMappingError = resp.message || "AI generation failed";
          this.addToast("error", this.apiMappingError);
        }
      }

      if (resp?.action === "listAssetTypes" && resp.status === "success") {
        this.isLoadingAssetTypes = false;
        this.assetTypes = (resp.items || []).map(it => ({
          id: it.uniqueId,
          uniqueId: it.uniqueId,
          name: it.name,
          description: it.description,
          icon: it.icon
        }));
      }

      if (resp?.action === "saveAssetType") {
        this.isSavingAssetType = false;
        if (resp.status === "success" && resp.item) {
          this.assetTypes.push({
            id: resp.item.uniqueId,
            uniqueId: resp.item.uniqueId,
            name: resp.item.name,
            description: resp.item.description,
            icon: resp.item.icon
          });
          this.cancelAssetTypeForm();
          this.addToast("success", "Asset type created.");
        } else {
          this.assetTypeError = resp.message || "Save failed";
          this.addToast("error", this.assetTypeError);
        }
      }

      if (resp?.action === "updateAssetType") {
        this.isSavingAssetType = false;
        if (resp.status === "success") {
          const idx = this.assetTypes.findIndex(t => t.uniqueId === resp.uniqueId);
          if (idx !== -1) {
            this.assetTypes.splice(idx, 1, { ...this.assetTypes[idx], ...(resp.patch || {}) });
          }
          this.cancelAssetTypeForm();
          this.addToast("success", "Asset type updated.");
        } else {
          this.assetTypeError = resp.message || "Update failed";
          this.addToast("error", this.assetTypeError);
        }
      }

      if (resp?.action === "deleteAssetType") {
        if (resp.status === "success") {
          this.assetTypes = this.assetTypes.filter(t => t.uniqueId !== resp.uniqueId && t.id !== resp.uniqueId);
          this.addToast("success", "Asset type deleted.");
        } else {
          this.addToast("error", resp.message || "Delete failed");
        }
      }

      if (resp?.action === "testRemoteCatalogConnection") {
        if (this._testConnTimeout) { clearTimeout(this._testConnTimeout); this._testConnTimeout = null; }
        this.testConnectionResult = {
          status: resp.status || "error",
          message: resp.message || "",
          latency: Number(resp.latency) || 0,
          httpCode: resp.httpCode
        };
        this.isTestingConnection = false;
        return;
      }

      if (resp?.action === "registerRemoteCatalog") {
        this.isRegisteringRemoteCatalog = false;
        if (resp.status === "success") {
          const newItem = this.pendingRemoteCatalog;
          this.pendingRemoteCatalog = null;
          const remoteCatalogId = resp.uniqueId || msg?.response?.uniqueId;
          const row = { ...newItem, uniqueId: remoteCatalogId, id: remoteCatalogId };
          const idx = this.catalogsTable.findIndex(x => String(x.id) === String(remoteCatalogId));
          if (idx !== -1) this.catalogsTable.splice(idx, 1, row);
          else this.catalogsTable.unshift(row);
          this.pagination.catalogsRegister.page = 1;
          this.closeRegisterRemoteCatalogModal();
          this.addToast("success", "Remote catalogue registered successfully.");
        } else {
          this.registerRemoteCatalogError = resp?.message || "Register remote catalog failed";
          this.addToast("error", this.registerRemoteCatalogError);
        }
      }

      if (payload.state === "notLoggedIn") {
        console.log("[facis] No login flow connected — continuing in standalone mode.");
      }

      if (payload?.type === "getDashboard") {
        this.userAccess = payload?.response?.userAccess || this.userAccess;
        if (payload?.response?.userPermissions) {
          this.userPermissions = payload.response.userPermissions;
        }
      }

      if (resp?.action === "getCatalogRegistry" && resp.status === "success") {
        const catalogs = Array.isArray(resp.catalogs) ? resp.catalogs : [];
        this.catalogsTable = catalogs.map(item => ({
          uniqueId: item.uniqueId, id: item.uniqueId, ...(item.catalog || {})
        }));
        this.pagination.catalogsRegister.page = 1;
      }

      if (resp?.action === "updateRemoteCatalog") {
        this.isUpdatingRemoteCatalog = false;
        if (resp?.status === "success") {
          const id = msg?.data?.uniqueId;
          const patch = msg?.data?.patch || {};
          const idx = this.catalogsTable.findIndex(c => String(c.uniqueId) === String(id));
          if (idx !== -1) this.catalogsTable.splice(idx, 1, { ...this.catalogsTable[idx], ...patch });
          this.closeRegisterRemoteCatalogModal();
          this.addToast("success", "Remote catalogue updated successfully.");
        } else {
          this.updateRemoteCatalogError = resp?.message || "Update failed";
        }
      }

      if (resp?.action === "deleteRemoteCatalog" && resp?.status === "success") {
        const id = resp?.uniqueId || msg?.data?.uniqueId;
        if (id) {
          this.catalogsTable = this.catalogsTable.filter(c => String(c.id) !== String(id) && String(c.uniqueId) !== String(id));
        }
      }

      if (resp?.action === "uploadCatalogJson") {
        this.isRegisteringRemoteCatalog = false;
        if (resp?.status === "success") {
          const items = Array.isArray(resp.catalogs) ? resp.catalogs : [];
          for (const item of items) {
            const row = { uniqueId: item.uniqueId, id: item.uniqueId, ...(item.catalog || {}) };
            const idx = this.catalogsTable.findIndex(x => String(x.id) === String(item.uniqueId));
            if (idx !== -1) this.catalogsTable.splice(idx, 1, row);
            else this.catalogsTable.unshift(row);
          }
          this.pagination.catalogsRegister.page = 1;
          this.closeRegisterRemoteCatalogModal();
          this.addToast("success", `Imported ${items.length} catalogue(s) from JSON file.`);
        } else {
          this.registerRemoteCatalogError = resp?.message || "JSON upload failed";
          this.addToast("error", this.registerRemoteCatalogError);
        }
      }

      // ── Harvest Response Handlers ──────────────────────────────
      if (resp?.action === "getHarvestCatalogues") {
        this.isLoadingHarvestCatalogues = false;
        if (resp?.status === "success") {
          const catalogs = Array.isArray(resp.catalogs) ? resp.catalogs : [];
          this.harvestWizardRowsBase = catalogs.map(item => ({
            id: item.uniqueId || item.catalogId,
            catalog: item.catalogName || item.catalogId || "-",
            strategy: item.strategy || "none",
            endpoint: item.baseEndpoint || "",
            type: item.protocol || "-",
            name: item.owner || "-",
            domain: item.baseEndpoint || "-",
            updated: item.updatedAt || "-",
            integrationStatus: item.enabled !== false ? "Active" : "Inactive",
          }));
          this.harvestWizardRows = [...this.harvestWizardRowsBase];
        }
      }

      if (resp?.action === "startHarvest") {
        if (this._harvestTimeout) { clearTimeout(this._harvestTimeout); this._harvestTimeout = null; }
        this.isSubmittingHarvest = false;
        if (resp?.status === "success") {
          const run = resp.run || {};
          const runStatus = run.status || "completed";
          const assetCount = run.assetsAdded || run.totalAssets || 0;
          if (assetCount > 0) {
            this.addToast("success", `Harvest ${runStatus}: ${assetCount} assets imported from ${run.catalogueName || "catalogue"}.`);
          } else {
            this.addToast("warning", `Harvest ${runStatus} but 0 assets were found. If harvesting an API source, the endpoint may be unreachable from this environment (CORS). Try uploading the API response as a JSON file when registering the catalogue.`);
          }
          // Show progress bar with actual run state
          if (run.uniqueId) {
            this.applyHarvestProgress({
              runId: run.uniqueId,
              status: runStatus,
              catalogueName: run.catalogueName || "Harvest",
              progress: runStatus === "completed" ? 100 : 0,
              totalAssets: run.totalAssets || 0,
              processedAssets: run.totalAssets || 0,
              successCount: run.successCount || 0,
              errorCount: run.errorCount || 0,
              startedAt: run.startedAt || "",
            });
          }
          // Directly populate local catalogue from the harvest response
          // This ensures data appears immediately without depending on a separate request
          if (Array.isArray(resp.allAssets) && resp.allAssets.length > 0) {
            const normalized = resp.allAssets.map(a => {
              // Same normalization as getLocalCatalogue
              if (a.title && typeof a.title === 'string' && a.title.trim()) {
                a.assets = a.title;
              } else if (!a.assets && a.name && typeof a.name === 'string') {
                a.assets = a.name;
              }
              if (!a.title && a.assets) a.title = a.assets;
              return a;
            });
            console.log("[facis] startHarvest: populating local catalogue with", normalized.length, "assets");
            this.allCatalogsRaw.splice(0, this.allCatalogsRaw.length, ...normalized);
            this.tableRows.splice(0, this.tableRows.length, ...normalized);
            this.localCatalogueStats = {
              totalAssets: resp.totalAssets || resp.allAssets.length,
              totalRuns: resp.totalRuns || 0
            };
            this.pagination.catalog.page = 1;
          }
          if (Array.isArray(resp.allProvenance) && resp.allProvenance.length > 0) {
            this.harvestProvenance = resp.allProvenance;
            this.provenanceRows = resp.allProvenance;
            this.pagination.provenance.page = 1;
          }
          // Also reload via standard channels as backup
          this.loadHarvestData();
          this.loadLocalCatalogs();
          this.loadLocalProvenance();
        } else {
          this.harvestSubmitError = resp?.message || "Harvest failed to start";
          this.addToast("error", this.harvestSubmitError);
        }
      }

      if (resp?.action === "harvestProgress") {
        this.applyHarvestProgress(resp);
        // If completed, reload all harvest data
        if (resp.status === "completed" || resp.status === "error") {
          this.loadHarvestData();
        }
      }

      if (resp?.action === "clearHarvestHistory" && resp?.status === "success") {
        this.clearHarvestHistoryRunning = false;
        this.showClearHarvestHistoryModal = false;
        this.harvestRecords = [];
        this.harvestProgress = null;
        uibuilderService.send({
          type: "listHarvestRuns",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
        });
        this.addToast && this.addToast("success",
          "Harvest history cleared (" + (resp.runsDeleted || 0) + " runs, " +
          (resp.auditDeleted || 0) + " audit rows).");
      }

      if (resp?.action === "listHarvestRuns" && resp?.status === "success") {
        const runs = Array.isArray(resp.runs) ? resp.runs : [];
        this.harvestRecords = runs.map(r => ({
          id: r.uniqueId || r._id,
          sourceCatalogue: r.catalogueName || r.catalogues?.[0]?.catalogName || "-",
          tool: r.tool || "Harvester",
          harvestDate: r.startedAt || "-",
          assetsAdded: r.assetsAdded != null ? `+${r.assetsAdded}` : "-",
          duration: r.duration || "-",
          result: r.result || r.status || "-",
          _run: r,
        }));
        this.pagination.harvest.page = 1;
      }

      if (resp?.action === "getHarvestRunDetail" && resp?.status === "success") {
        if (resp.run) {
          this.harvestRunDetailData = {
            ...this.harvestRunDetailData,
            ...resp.run,
            id: resp.run.uniqueId || resp.run._id,
            catalogue: resp.run.catalogueName || "-",
            started: resp.run.startedAt || "-",
            duration: resp.run.duration || "-",
            imported: resp.run.assetsAdded || resp.run.imported || "-",
            status: resp.run.status || "-",
            successCount: resp.run.successCount || 0,
            errorCount: resp.run.errorCount || 0,
            assets: Array.isArray(resp.run.assets) ? resp.run.assets : [],
            logs: Array.isArray(resp.logs) ? resp.logs : [],
            provenance: Array.isArray(resp.provenance) ? resp.provenance : [],
          };
        }
      }

      if (resp?.action === "listHarvestLogs" && resp?.status === "success") {
        this.harvestLog = Array.isArray(resp.logs) ? resp.logs : [];
      }

      if (resp?.action === "listHarvestProvenance" && resp?.status === "success") {
        this.harvestProvenance = Array.isArray(resp.provenance) ? resp.provenance : [];
        this.provenanceRows = this.harvestProvenance;
        this.pagination.provenance.page = 1;
      }

      if (resp?.action === "getLocalProvenance" && resp?.status === "success") {
        this.harvestProvenance = Array.isArray(resp.provenance) ? resp.provenance : [];
        this.provenanceRows = this.harvestProvenance;
        this.pagination.provenance.page = 1;
      }

      // ── Local Catalogue responses ──
      if (resp?.action === "getLocalAssetDetail") {
        this._applyLocalAssetDetailResponse(resp);
        return;
      }

      if (resp?.action === "getLocalCatalogue" && resp?.status === "success") {
        const assets = (Array.isArray(resp.assets) ? resp.assets : []).map(a => {
          // Normalize: ensure 'assets' field (display name) uses the best available identity
          // Prefer title (canonical stored name) > assets > name as display value
          if (a.title && typeof a.title === 'string' && a.title.trim()) {
            a.assets = a.title;
          } else if (!a.assets && a.name && typeof a.name === 'string') {
            a.assets = a.name;
          }
          // Ensure title is always set for search consistency
          if (!a.title && a.assets) a.title = a.assets;
          return a;
        });
        console.log("[facis] getLocalCatalogue received", assets.length, "assets");
        this.allCatalogsRaw.splice(0, this.allCatalogsRaw.length, ...assets);
        this.tableRows.splice(0, this.tableRows.length, ...assets);
        this.localCatalogueStats = {
          totalAssets: resp.totalAssets || assets.length,
          totalRuns: resp.totalRuns || 0
        };
        this.pagination.catalog.page = 1;
      }

      if (resp?.action === "deleteLocalAsset" && resp?.status === "success") {
        this.loadLocalCatalogs();
      }

      if (resp?.action === "updateLocalAsset" && resp?.status === "success") {
        // Reload from backend to reflect persisted state
        this.loadLocalCatalogs();
      }

      if (resp?.action === "createUser" && (resp?.status === "success" || resp?.ok)) {
        this.isCreatingUser = false;
        this.isCreateUserModal = false;
        this.resetCreateUserForm();
        const username = resp.user?.username || "";
        this.addToast("success", "User " + username + " created");
        // Reload users list from database
        const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
        uibuilderService.send({ type: "listUsers", auth: auth });
        this.pagination.users.page = 1;
      }
      if (resp?.action === "createUser" && resp?.error) {
        this.isCreatingUser = false;
        if (resp.error === "validation" && resp.field) {
          // Inline validation error — keep dialog open, highlight field
          this.createUserForm.validationError = { field: resp.field, reason: resp.reason || "Invalid value" };
        } else {
          // Backend error — show destructive toast
          this.addToast("error", resp.message || resp.reason || "Failed to create user: " + resp.error);
        }
      }

      if (msg?.type === "getAdminTools" && msg?.response?.status === "success") {
        const list = msg.response.users || [];
        this.users = list.map((u, i) => {
          const uid = u.uniqueId ?? u.id ?? u._id ?? String(i);
          return {
            ...u, uniqueId: uid,
            name: (`${u.profile?.firstName ?? ""} ${u.profile?.lastName ?? ""}`).trim() || u.name || u.username || u.email || "\u2014",
            avatar: u.avatar || "./img/avatar-16.jpg",
            email: u.email || "\u2014",
            status: u.status || (u.invited ? "Invited" : "Active"),
          };
        });
      }

      // ── New listUsers response (from permission-gated M4) ─────
      if (resp?.action === "listUsers" && resp?.status === "success") {
        const list = resp.users || [];
        this.users = list.map((u, i) => {
          const uid = u.uniqueId ?? u.id ?? u._id ?? String(i);
          return {
            ...u, uniqueId: uid,
            name: u.name || u.username || u.email || "\u2014",
            avatar: u.avatar || "./img/avatar-16.jpg",
            email: u.email || "\u2014",
            status: u.status || "active",
            access: u.roles || u.access || [],
          };
        });
        this.pagination.users.page = 1;
      }

      // ── listRoles response ────────────────────────────────────
      if (resp?.action === "listRoles" && resp?.status === "success") {
        this.dcmRoles = resp.roles || [];
      }

      // ── deleteUser response ───────────────────────────────────
      if (resp?.action === "deleteUser" && (resp?.ok || resp?.status === "success")) {
        const delId = resp.uniqueId || msg?.data?.uniqueId;
        if (delId) {
          this.users = this.users.filter(u => String(u.uniqueId) !== String(delId));
        }
        this.addToast("success", "User deleted.");
        // Reload users from server to reconcile
        const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
        uibuilderService.send({ type: "listUsers", auth: auth });
      }
      if (resp?.action === "deleteUser" && resp?.error) {
        this.addToast("error", resp.message || "Failed to delete user: " + resp.error);
      }

      // ── updateUser response ───────────────────────────────────
      if (resp?.action === "updateUser" && (resp?.ok || resp?.status === "success")) {
        // Close modal FIRST, then upsert into store ONCE
        this.isEditUserModal = false;
        this.isSavingUser = false;
        this.addToast("success", "User updated.");
        // Upsert returned user into list by _id (no API call)
        if (resp.user) {
          const uid = resp.user._id || resp.user.uniqueId;
          const idx = this.users.findIndex(u => (u._id || u.uniqueId) === uid);
          if (idx >= 0) { this.users.splice(idx, 1, { ...this.users[idx], ...resp.user }); }
          else { this.users.push(resp.user); }
        }
      }
      if (resp?.action === "updateUser" && resp?.error) {
        this.isSavingUser = false;
        if (resp.error === "validation" && resp.field) {
          this.editUserForm.validationError = { field: resp.field, reason: resp.reason || "Invalid value" };
        } else {
          this.addToast("error", resp.message || resp.reason || "Failed to update user: " + resp.error);
        }
      }

      // ── updateUserPassword response ───────────────────────────
      if (resp?.action === "updateUserPassword") {
        this.userEditPasswordSaving = false;
        if (resp.ok || resp.status === "success") {
          this.userEditPasswordError = "";
          this.addToast && this.addToast(
            "success",
            "Password updated. " + (resp.sessionsRevoked || 0) + " active session(s) revoked."
          );
        } else {
          const m =
            resp.error === "validation"     ? (resp.reason || "Validation failed.") :
            resp.error === "user_not_found" ? "User not found." :
            resp.error === "missing_userId" ? "Missing user identifier." :
                                              (resp.message || "Password update failed.");
          this.userEditPasswordError = m;
          this.addToast && this.addToast("error", m);
        }
      }

      // ── Monitoring overview response ─────────────────────────
      if (resp?.action === "getMonitoringOverview") {
        if (resp?.ok && resp?.data) {
          this.monitoring = resp.data;
          this.monitoringError = false;
        } else {
          this.monitoringError = true;
        }
      }

      // ── Role CRUD responses ───────────────────────────────────
      if (resp?.action === "createRole" && (resp?.ok || resp?.status === "success")) {
        this.addToast("success", "Role created.");
        const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
        uibuilderService.send({ type: "listRoles", auth: auth });
      }
      if (resp?.action === "updateRole" && (resp?.ok || resp?.status === "success")) {
        this.addToast("success", "Role updated.");
        const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
        uibuilderService.send({ type: "listRoles", auth: auth });
      }
      if (resp?.action === "deleteRole" && (resp?.ok || resp?.status === "success")) {
        this.addToast("success", "Role deleted.");
        const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
        uibuilderService.send({ type: "listRoles", auth: auth });
      }
      if ((resp?.action === "updateRole" || resp?.action === "deleteRole") && resp?.error === "forbidden") {
        this.addToast("error", resp.message || "Cannot modify system roles.");
      }

      // ── Invitation responses ──────────────────────────────────
      if (resp?.action === "resendInvitation" && (resp?.ok || resp?.status === "success")) {
        this.addToast("success", "Invitation resent.");
      }
      if (resp?.action === "revokeInvitation" && (resp?.ok || resp?.status === "success")) {
        this.addToast("success", "Invitation revoked.");
        const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
        uibuilderService.send({ type: "listUsers", auth: auth });
      }

      // ── Auth Response Handlers ─────────────────────────────────
      if (resp?.action === "login") {
        this.isLoggingIn = false;
        if (resp.status === "success" && resp.token) {
          this.authToken = resp.token;
          localStorage.setItem("authToken", resp.token);
          document.cookie = "userToken=" + resp.token + "; path=/; max-age=86400";
          if (resp.user) {
            const perms = resp.user.permissions || [];
            const rawAccess = Array.isArray(resp.user.access) && resp.user.access.length > 0
              ? resp.user.access
              : ['local_catalogue'];
            this.userAccess = rawAccess;
            this.userProfile.name = resp.user.username || this.userProfile.name;
            this.userProfile.email = resp.user.email || this.userProfile.email;
            this.userProfile.role = resp.user.role || this.userProfile.role;
            // Populate currentUser with RBAC data + accessAreas as source of truth
            this.currentUser = {
              id: resp.user.id || '',
              email: resp.user.email || '',
              username: resp.user.username || '',
              roles: resp.user.roles || [],
              permissions: perms,
              accessAreas: resp.user.accessAreas || [],
              isAuthenticated: true,
              status: resp.user.status || 'active'
            };
          }
          this.isLoggedIn = true;
          this.isCheckingAuth = false;
          this.loginForm = { username: "", password: "" };
          this.loginError = "";
          this.loginErrorCode = "";
          this.currentPage = "localCatalogue";
          this.initDashboardData();
          this.fetchSystemSettings();
        } else if (resp.error === "account_disabled") {
          this.loginErrorCode = "account_disabled";
          this.loginError = "";
        } else if (resp.error === "account_expired") {
          this.loginErrorCode = "account_expired";
          this.loginError = "Your account has expired. Contact an administrator.";
        } else {
          this.loginErrorCode = resp.error || "";
          this.loginError = resp.message || "Login failed.";
        }
      }

      if (resp?.action === "checkAuth") {
        this.isCheckingAuth = false;
        if (resp.status === "success" && resp.user) {
          this.authToken = localStorage.getItem("authToken") || "";
          const perms = resp.user.permissions || [];
          const rawAccess = Array.isArray(resp.user.access) && resp.user.access.length > 0
            ? resp.user.access
            : ['local_catalogue'];
          this.userAccess = rawAccess;
          this.userProfile.name = resp.user.username || this.userProfile.name;
          this.userProfile.email = resp.user.email || this.userProfile.email;
          this.userProfile.role = resp.user.role || this.userProfile.role;
          // Populate currentUser from session + accessAreas
          this.currentUser = {
            id: resp.user.id || '',
            email: resp.user.email || '',
            username: resp.user.username || '',
            roles: resp.user.roles || [],
            permissions: perms,
            accessAreas: resp.user.accessAreas || [],
            isAuthenticated: true,
            status: resp.user.status || 'active'
          };
          this.isLoggedIn = true;
          this.currentPage = "localCatalogue";
          this.initDashboardData();
          this.fetchSystemSettings();
        } else {
          localStorage.removeItem("authToken");
          this.isLoggedIn = false;
        }
      }

      // ── Hydrate Session (full permissions) ─────────────────────
      if (resp?.action === "hydrateSession") {
        if (resp.error === "account_disabled") {
          // User was disabled mid-session — force logout and show banner
          localStorage.removeItem("authToken");
          document.cookie = "userToken=; path=/; max-age=0";
          this.isLoggedIn = false;
          this.authToken = "";
          this.currentUser = { id: "", email: "", username: "", roles: [], permissions: [], isAuthenticated: false, status: "" };
          this.loginErrorCode = "account_disabled";
          this.loginError = "";
        } else if (resp.status === "success" && resp.user) {
          const perms = resp.user.permissions || [];
          const rawAccess = Array.isArray(resp.user.access) && resp.user.access.length > 0
            ? resp.user.access
            : ['local_catalogue'];
          this.currentUser = {
            id: resp.user.id || '',
            email: resp.user.email || '',
            username: resp.user.username || '',
            roles: resp.user.roles || [],
            permissions: perms,
            accessAreas: resp.user.accessAreas || [],
            isAuthenticated: true,
            status: resp.user.status || 'active'
          };
          this.userAccess = rawAccess;
          // Now that we know accessAreas, load admin data if needed
          const aa = resp.user.accessAreas || [];
          if (aa.includes('adminTools')) {
            const auth = { userToken: localStorage.getItem("authToken") || "", clientId: getCookie("uibuilder-client-id") };
            uibuilderService.send({ type: "listUsers", auth: auth });
            uibuilderService.send({ type: "listRoles", auth: auth });
          }
        }
      }

      // ── Permission denied handler ──────────────────────────────
      // Only toast permission_denied for user-initiated actions, not silent background calls
      if (resp?.error === "permission_denied" && !msg?._silent) {
        this.addToast("error", resp.message || "Permission denied for " + (resp.action || "this operation"));
      }
      if (resp?.error === "not_authenticated" || resp?.error === "account_disabled") {
        // Force re-login
        localStorage.removeItem("authToken");
        document.cookie = "userToken=; path=/; max-age=0";
        this.isLoggedIn = false;
        this.authToken = "";
        this.currentUser = { id: "", email: "", username: "", roles: [], permissions: [], isAuthenticated: false, status: "" };
        if (resp?.error === "account_disabled") {
          this.loginErrorCode = "account_disabled";
          this.loginError = "";
        }
      }

      if (resp?.action === "logOut" && resp?.status === "success") {
        localStorage.removeItem("authToken");
        document.cookie = "userToken=; path=/; max-age=0";
        this.isLoggedIn = false;
        this.authToken = "";
      }

      // ── Schema Prompts Backend Response Handlers ────────────────

      if (resp?.action === "enhancePrompt") {
        this.isEnhancingPrompt = false;
        if (resp.status === "success") {
          this.promptForm.template = resp.enhancedPrompt;
          this.addToast("success", "Prompt enhanced successfully.");
        } else {
          this.promptFormError = "Enhancement failed: " + (resp.message || "Unknown error");
        }
      }

      if (resp?.action === "createPrompt" && resp?.status === "success") {
        const prompt = resp.prompt;
        if (prompt) {
          // Check if already exists (avoid duplicates)
          const existing = this.prompts.findIndex(p => p.id === prompt.id);
          if (existing === -1) {
            this.prompts.push(prompt);
          }
          this.addToast("success", "Prompt created \u2014 generating code...");
        }
      }

      if (resp?.action === "codeGenerated" && resp?.status === "success") {
        const idx = this.prompts.findIndex(p => p.id === resp.promptId);
        if (idx !== -1) {
          this.prompts.splice(idx, 1, {
            ...this.prompts[idx],
            generatedCode: resp.generatedCode,
            codeGenerationStatus: "completed",
            status: "active",
            lastGeneratedAt: resp.lastGeneratedAt,
            updatedAt: resp.updatedAt,
          });
        }
        this.addToast("success", "Code generated \u2014 prompt is now active.");
      }

      if (resp?.action === "listPrompts" && resp?.status === "success") {
        if (Array.isArray(resp.prompts)) {
          this.prompts = resp.prompts;
        }
      }

      if (resp?.action === "updatePromptCode" && resp?.status === "success") {
        const cIdx = this.prompts.findIndex(p => p.id === resp.promptId);
        if (cIdx !== -1) {
          this.prompts.splice(cIdx, 1, {
            ...this.prompts[cIdx],
            generatedCode: resp.code !== undefined ? resp.code : this.prompts[cIdx].generatedCode,
            updatedAt: resp.updatedAt
          });
        }
        this.addToast("success", "Code saved.");
      }

      if (resp?.action === "updatePrompt" && resp?.status === "error") {
        this.promptFormError = resp.message || "Update failed.";
        this.addToast("error", resp.message || "Prompt update failed.");
      }

      if (resp?.action === "updatePrompt" && resp?.status === "success") {
        const uIdx = this.prompts.findIndex(p => p.id === resp.promptId);
        if (uIdx !== -1) {
          const updates = { updatedAt: resp.updatedAt };
          if (resp.version !== undefined) updates.version = resp.version;
          if (resp.sourceSchema !== undefined) updates.sourceSchema = resp.sourceSchema;
          if (resp.targetSchema !== undefined) updates.targetSchema = resp.targetSchema;
          if (resp.template !== undefined) updates.template = resp.template;
          if (resp.examples !== undefined) updates.examples = resp.examples;
          if (resp.constraints !== undefined) updates.constraints = resp.constraints;
          if (resp.promptStatus !== undefined) updates.status = resp.promptStatus;
          if (resp.code !== undefined) updates.generatedCode = resp.code;
          this.prompts.splice(uIdx, 1, { ...this.prompts[uIdx], ...updates });
        }
        this.addToast("success", "Prompt updated.");
      }

      if (resp?.action === "updatePromptStatus" && resp?.status === "error") {
        this.addToast("error", resp.message || "Status update failed.");
      }

      if (resp?.action === "updatePromptStatus" && resp?.status === "success") {
        const sIdx = this.prompts.findIndex(p => p.id === resp.promptId);
        if (sIdx !== -1) {
          this.prompts.splice(sIdx, 1, { ...this.prompts[sIdx], status: resp.newStatus, updatedAt: resp.updatedAt });
        }
      }

      if (resp?.action === "deletePrompt" && resp?.status === "success") {
        this.prompts = this.prompts.filter(p => p.id !== resp.promptId);
        this.addToast("success", "Prompt deleted.");
      }

      if (resp?.action === "dryRunPrompt") {
        if (resp.status === "success") {
          this.promptTestResult = resp.result || "";
        } else {
          this.promptTestError = resp.message || "Dry run failed.";
        }
        this.promptTestResolvedFromBackend = resp.resolvedPrompt || "";
        this.promptTestRunning = false;
      }

      if (resp?.action === "saveTestCase" && resp?.status === "success") {
        if (resp.testCase) {
          if (resp.isNew) {
            const existing = this.promptTestCases.findIndex(t => t.id === resp.testCase.id);
            if (existing === -1) this.promptTestCases.push(resp.testCase);
          } else {
            const tcIdx = this.promptTestCases.findIndex(t => t.id === resp.testCase.id);
            if (tcIdx !== -1) this.promptTestCases.splice(tcIdx, 1, resp.testCase);
          }
        }
        this.addToast("success", resp.isNew ? "Test case created." : "Test case updated.");
      }

      if (resp?.action === "listTestCases" && resp?.status === "success") {
        if (Array.isArray(resp.testCases)) {
          this.promptTestCases = resp.testCases;
        }
      }

      if (resp?.action === "listLlmConfigs" && resp?.status === "success") {
        if (Array.isArray(resp.configs)) {
          this.llmConfigs = resp.configs;
        }
      }

      if (resp?.action === "listProviders" && resp?.status === "success") {
        if (Array.isArray(resp.providers)) {
          this.llmProviders = resp.providers;
        }
      }

      if (resp?.action === "deleteTestCase" && resp?.status === "success") {
        this.promptTestCases = this.promptTestCases.filter(t => t.id !== resp.testCaseId);
        this.addToast("success", "Test case deleted.");
      }

      // ── LLM Config Backend Response Handlers ────────────────────

      if (resp?.action === "saveLlmConfig" && resp?.status === "success") {
        if (resp.config) {
          const idx = this.llmConfigs.findIndex(c => c.id === resp.config.id);
          if (idx !== -1) {
            this.llmConfigs.splice(idx, 1, resp.config);
          } else {
            this.llmConfigs.push(resp.config);
          }
        }
        this.addToast("success", resp.isNew ? "LLM config created." : "LLM config updated.");
      }

      if (resp?.action === "deleteLlmConfig" && resp?.status === "success") {
        this.llmConfigs = this.llmConfigs.filter(c => c.id !== resp.configId);
        this.addToast("success", "LLM configuration deleted.");
      }

      // ── Provider Backend Response Handlers ──────────────────────

      if (resp?.action === "saveProvider" && resp?.ok === false) {
        this.isSavingProvider  = false;
        const errMsg = resp.error || resp.code || "Failed to save provider.";
        this.providerFormError = errMsg;
        this.addToast("error", errMsg);
        // keep modal open so the user sees the error and can re-enter the key
        return;
      }
      if (resp?.action === "saveProvider" && resp?.status === "success") {
        if (resp.provider) {
          const idx = this.llmProviders.findIndex(p => p.id === resp.provider.id);
          if (idx !== -1) {
            this.llmProviders.splice(idx, 1, resp.provider);
          } else {
            this.llmProviders.push(resp.provider);
          }
          if (resp.provider.isDefault) {
            this.llmProviders.forEach(p => { if (p.id !== resp.provider.id) p.isDefault = false; });
          }
        }
        this.isSavingProvider = false;
        this.closeProviderModal();
        this.addToast("success", resp.isNew ? "Provider created." : "Provider updated.");
        // Refresh list so any subsequent Edit sees the authoritative hasKey flag from DB.
        try {
          uibuilderService.send({
            type: "listProviders",
            auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
            data: {}
          });
        } catch (e) { /* non-fatal */ }
      }

      if (resp?.action === "deleteProvider" && resp?.status === "success") {
        this.llmProviders = this.llmProviders.filter(p => p.id !== resp.providerId);
        this.addToast("success", "Provider deleted.");
      }

      if (resp?.action === "reorderProvider" && resp?.status === "success") {
        if (Array.isArray(resp.providers) && resp.providers.length > 0) {
          this.llmProviders = resp.providers;
        }
      }

      // ── Local Schema Backend Response Handlers ─────────────────

      if (resp?.action === "listLocalSchemas" && resp?.status === "success") {
        if (Array.isArray(resp.schemas)) {
          this.schemaRegistry = resp.schemas;
        }
        // Lazy-load versions for each unique schemaName
        const names = new Set((this.schemaRegistry || []).map(s => s.schema).filter(Boolean));
        names.forEach(n => { if (!this.localSchemaVersionsCache[n]) this.fetchSchemaVersions(n); });
      }

      if (resp?.action === "saveLocalSchema" && resp?.status === "success") {
        if (resp.schema) {
          // Backend returns the version string — reflect it into the row
          if (resp.newVersion) resp.schema.versioning = resp.newVersion;
          const idx = this.schemaRegistry.findIndex(s => s.id === resp.schema.id);
          if (idx !== -1) {
            this.schemaRegistry.splice(idx, 1, resp.schema);
          } else {
            this.schemaRegistry.push(resp.schema);
          }
          // Invalidate the version cache for this schema so the next view reloads
          if (resp.schema.schema) {
            delete this.localSchemaVersionsCache[resp.schema.schema];
            this.fetchSchemaVersions(resp.schema.schema);
          }
        }
        this.addToast("success", resp.isNew ? "Schema created." : "Schema updated.");
      }

      if (resp?.action === "deleteLocalSchema" && (resp?.status === "success" || resp?.ok === true)) {
        this.schemaRegistry = this.schemaRegistry.filter(s => s.id !== resp.schemaId);
        this.addToast("success", "Schema deleted.");
      }
      if (resp?.action === "deleteLocalSchema" && resp?.ok === false) {
        if (resp.code === "referenced") {
          const prompts = (resp.by?.prompts || []).map(p => ({ id: p.id, remoteSchema: p.name || p.id, remoteCatalogue: "prompt" }));
          const mappings = (resp.by?.mappings || []).map(m => ({ id: m.id, remoteSchema: "mapping " + m.id, remoteCatalogue: m.remoteCatalogue || "" }));
          const all = [...prompts, ...mappings];
          this.deleteBlockedModal = {
            visible: true,
            title: "Cannot delete Local Schema",
            message: `This schema is referenced by ${all.length} object(s). Remove those references first.`,
            mappings: all
          };
        } else {
          this.addToast("error", resp.error || "Failed to delete schema.");
        }
      }

      if (resp?.action === "listLocalSchemaVersions" && resp?.ok) {
        this.localSchemaVersionsCache[resp.schemaName] = Array.isArray(resp.versions) ? resp.versions : [];
        if (this.schemaVersionPanelName === resp.schemaName) {
          this.schemaVersionPanelLoading = false;
        }
      }
      if (resp?.action === "listLocalSchemaVersions" && resp?.ok === false) {
        this.schemaVersionPanelLoading = false;
        this.addToast("error", resp.error || "Failed to load schema versions.");
      }

      if (resp?.action === "activateLocalSchemaVersion" && resp?.ok) {
        // Update cache: flip all to deprecated for this schema, set target to active
        const cache = this.localSchemaVersionsCache[resp.schemaName];
        if (Array.isArray(cache)) {
          cache.forEach(v => {
            if (v.status === "active") v.status = "deprecated";
            if (v.version === resp.version) v.status = "active";
          });
        }
        // Update the row's current version display
        const row = this.schemaRegistry.find(s => s.schema === resp.schemaName);
        if (row) row.versioning = resp.version;
        this.addToast("success", "Version " + resp.version + " activated.");
      }
      if (resp?.action === "activateLocalSchemaVersion" && resp?.ok === false) {
        this.addToast("error", resp.error || "Failed to activate version.");
      }

      if (resp?.action === "validateSampleAsset") {
        this.validateSampleForm.loading = false;
        this.validateSampleForm.result = resp;
      }

      // ── Prompt Version Response (D3) ──────────────────────────
      if (resp?.action === "listPromptVersions" && resp?.ok) {
        this.promptVersions = Array.isArray(resp.versions) ? resp.versions : [];
        this.promptVersionPanelLoading = false;
      }

      // ── System Settings Response (E4) ─────────────────────────
      if (resp?.action === "getSystemSettings" && resp?.ok) {
        this.systemSettings = resp.settings || {};
      }
      if (resp?.action === "setSystemSetting" && resp?.ok) {
        this.systemSettings[resp.key] = resp.value;
        this.showToast("System setting updated", "success");
      }

      // ── Remote Schema Backend Response Handlers ─────────────────

      if (resp?.action === "listRemoteSchemas" && resp?.status === "success") {
        this.remoteSchemas = Array.isArray(resp.schemas) ? resp.schemas : [];
        if (resp.catalogueIdToName) this.catalogueIdToName = resp.catalogueIdToName;
        this.remoteSchemaLoading = false;
      }

      if (resp?.action === "saveRemoteSchema" && resp?.ok) {
        if (resp.schema) {
          const idx = this.remoteSchemas.findIndex(s => s.id === resp.schema.id);
          if (idx !== -1) {
            this.remoteSchemas.splice(idx, 1, resp.schema);
          } else {
            this.remoteSchemas.push(resp.schema);
          }
        }
        this.addToast("success", resp.isNew ? "Remote schema registered." : "Remote schema updated.");
      }
      if (resp?.action === "saveRemoteSchema" && resp?.ok === false) {
        let msg;
        if (resp.code === "duplicate_version") {
          msg = "A schema with that name and version already exists.";
        } else if (resp.code === "validation_error") {
          msg = resp.error || "Validation failed.";
        } else {
          msg = resp.error || "Failed to save remote schema.";
        }
        this.addToast("error", msg);
      }

      if (resp?.action === "deleteRemoteSchema" && resp?.ok) {
        this.remoteSchemas = this.remoteSchemas.filter(s => s.id !== resp.schemaId);
        this.addToast("success", "Remote schema deleted.");
      }
      if (resp?.action === "deleteRemoteSchema" && resp?.ok === false) {
        console.log("[deleteRemoteSchema] raw server response:", JSON.stringify(resp));
        if (resp.code === "referenced_by_mapping") {
          this.deleteBlockedModal = {
            visible: true,
            title: "Cannot delete Remote Schema",
            message: `This schema is referenced by ${resp.count || resp.mappings?.length || 0} mapping(s). Remove those mappings first.`,
            mappings: resp.mappings || [],
          };
        } else {
          this.addToast("error", resp.error || "Failed to delete remote schema.");
        }
      }

      // ── Mapping Backend Response Handlers ───────────────────────

      if (resp?.action === "listMappings" && resp?.status === "success") {
        if (Array.isArray(resp.mappings) && resp.mappings.length > 0) {
          this.mappingRows = resp.mappings;
        }
      }

      if (resp?.action === "saveMapping" && resp?.status === "success") {
        if (resp.mapping) {
          const idx = this.mappingRows.findIndex(r => r.id === resp.mapping.id);
          if (idx !== -1) {
            this.mappingRows.splice(idx, 1, resp.mapping);
          } else {
            this.mappingRows.push(resp.mapping);
          }
          // Update detail panel if open for this mapping
          if (this.mappingDetailRow && this.mappingDetailRow.id === resp.mapping.id) {
            this.mappingDetailRow = { ...resp.mapping };
          }
        }
        this.addToast("success", resp.isNew ? "Mapping created." : "Mapping updated.");
      }

      if (resp?.action === "deleteMapping" && resp?.status === "success") {
        this.mappingRows = this.mappingRows.filter(r => r.id !== resp.mappingId);
        this.selectedMappingRows = this.selectedMappingRows.filter(x => x !== resp.mappingId);
        if (this.mappingDetailRow && this.mappingDetailRow.id === resp.mappingId) {
          this.closeMappingDetail();
        }
        this.addToast("success", "Mapping deleted.");
      }

      // ── RDF Mapping Config (FR-SR-06 / FR-SR-07) ──
      if (resp?.action === "saveRdfMappingConfig") {
        this.rdfConfigSaving = false;
        if (resp.success) {
          const idx = this.mappingRows.findIndex(r => r.id === resp.mappingId);
          if (idx > -1) {
            this.mappingRows[idx].namespacesToPreserve = resp.namespacesToPreserve;
            this.mappingRows[idx].shaclShapeSchemaId = resp.shaclShapeSchemaId;
          }
          this.addToast("success", "RDF mapping rules saved.");
        } else {
          this.addToast("error", resp.error || "Failed to save RDF rules.");
        }
      }

      if (resp?.action === "testRdfMapping") {
        this.rdfTestRunning = false;
        if (resp.success) {
          this.rdfTestResult = resp.result;
        } else {
          this.rdfTestResult = { output: "", retainedCount: 0, discardedCount: 0, error: resp.error || "Test failed" };
        }
      }

      // FR-SR-08: Hybrid Fallback response
      if (resp?.action === "executeHybridTransform") {
        this.hybridTransformLoading = false;
        this.hybridTransformResult = resp;
        if (resp.ok) {
          this.addToast && this.addToast(
            resp.fallbackTriggered ? 'warning' : 'success',
            resp.fallbackTriggered
              ? 'Hybrid transform completed (AI fallback was triggered)'
              : 'Hybrid transform completed (deterministic only)'
          );
        } else {
          this.addToast && this.addToast('error', 'Hybrid transform failed: ' + (resp.error || 'Unknown error'));
        }
      }

      // ── Transformation Audit Trail Response Handlers ────────────

      if (resp?.action === "listTransformationAudit") {
        if (this._auditTimeout) { clearTimeout(this._auditTimeout); this._auditTimeout = null; }
        this.auditTrail.loading = false;
        this.auditTrail.loaded = true;
        if (resp.ok !== false) {
          this.auditTrail.rows = Array.isArray(resp.rows) ? resp.rows : [];
          this.auditTrail.pagination.total = resp.total ?? this.auditTrail.rows.length;
          this.auditTrail.pagination.page = resp.page ?? 1;
        } else {
          this.auditTrail.error = resp.error || resp.code || "Failed to load audit trail.";
        }
      }

      if (resp?.action === "exportTransformationAudit") {
        if (resp.ok !== false && resp.base64Payload) {
          try {
            const bin = atob(resp.base64Payload);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const mime = resp.format === "json" ? "application/json" : "text/csv";
            const blob = new Blob([bytes], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = resp.filename || ("audit_export." + (resp.format || "csv"));
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (e) {
            this.addToast("error", "Failed to download export file.");
          }
        } else if (resp.ok === false) {
          this.addToast("error", resp.error || "Export failed.");
        } else {
          this.addToast("info", "No data to export.");
        }
      }

      // ── Batch Retransform Backend Response Handlers ─────────────

      if (resp?.action === "startBatchRetransform" && resp?.status === "success") {
        const b = this.batchRetransform;
        b.startedAt = resp.startedAt || new Date().toISOString().replace("T", " ").slice(0, 16);
        b.totalAssets = resp.totalAssets || 0;
      }

      if (resp?.action === "batchRetransformProgress") {
        const b = this.batchRetransform;
        if (resp.status === "cancelled") {
          b.status = "cancelled";
          b.completedAt = resp.completedAt || "";
        } else {
          b.status = resp.status || b.status;
          b.progress = resp.progress ?? b.progress;
          b.processedAssets = resp.processedAssets ?? b.processedAssets;
          b.totalAssets = resp.totalAssets ?? b.totalAssets;
          b.successCount = resp.successCount ?? b.successCount;
          b.errorCount = resp.errorCount ?? b.errorCount;
          b.skippedCount = resp.skippedCount ?? b.skippedCount;
          if (Array.isArray(resp.errors)) b.errors = resp.errors;
          if (resp.completedAt) b.completedAt = resp.completedAt;
          if (resp.startedAt) b.startedAt = resp.startedAt;
          // When completed, add to history
          if (resp.status === "completed" && resp.historyEntry) {
            this.batchRetransformHistory.unshift(resp.historyEntry);
          }
        }
      }
    });

    this.setPerPageByViewport();
    window.addEventListener("resize", this.onResize);
    this.loadLocalCatalogs();
    this.loadLocalProvenance();
    window.addEventListener("scroll", this.updateMenuPosition, true);
    window.addEventListener("resize", this.updateMenuPosition);
  },

  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("scroll", this.updateMenuPosition, true);
    window.removeEventListener("resize", this.updateMenuPosition);
  },
});

// ─── Component definitions are available for future use ──────────
// When migrating HTML to use component tags (e.g. <app-sidebar>),
// uncomment the relevant app.component() call below.
//
// app.component("app-sidebar", AppSidebar);
// app.component("app-topbar", AppTopbar);
// app.component("stat-card", StatCard);
// app.component("table-statusbar", TableStatusbar);
// app.component("dashboard-layout", DashboardLayout);
// app.component("local-catalogue-view", LocalCatalogueView);
// app.component("catalogue-registry-view", CatalogueRegistryView);
// app.component("schema-registry-view", SchemaRegistryView);
// app.component("admin-tools-view", AdminToolsView);
// app.component("harvester-view", HarvesterView);
app.component("view-modal", ViewModal);
app.component("create-user-modal", CreateUserModal);
app.component("manage-user-modal", ManageUserModal);
app.component("register-catalog-modal", RegisterCatalogModal);
app.component("schema-modal", SchemaModal);
app.component("harvest-wizard-modal", HarvestWizardModal);
app.component("access-info-modal", AccessInfoModal);
app.component("manage-menu", ManageMenu);

// ─── Global error handler — swallow Vue emit-on-unmounted cascade ──
// Vue 3 throws "Cannot read properties of null (reading 'emitsOptions')" when
// $emit is invoked on a component whose internal instance has been nulled
// (e.g. emit fires after unmount). The error then poisons subsequent renders
// with "Unhandled error during execution of component update". We log it once
// per type and prevent the cascade so the rest of the app stays responsive.
app.config.errorHandler = (err, instance, info) => {
  const msg = err && err.message ? String(err.message) : String(err);
  if (msg.includes("emitsOptions") ||
      msg.includes("Cannot read properties of null") ||
      msg.includes("Cannot read properties of undefined (reading 'filter')")) {
    // Known transient lifecycle error — suppress to prevent render cascade
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[suppressed Vue emit/lifecycle error]", info, msg);
    }
    return;
  }
  // Unknown error — log normally
  if (typeof console !== "undefined" && console.error) {
    console.error("[Vue errorHandler]", info, err);
  }
};

app.config.warnHandler = (msg, instance, trace) => {
  if (msg && (msg.includes("emitsOptions") || msg.includes("Unhandled error during execution"))) {
    return; // suppress cascade noise
  }
  if (typeof console !== "undefined" && console.warn) {
    console.warn("[Vue warn]", msg, trace);
  }
};

// ─── Mount ───────────────────────────────────────────────────────
app.mount("#app");
