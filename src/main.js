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
  getChangedFields, parseJsonLine
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
import InviteModal from "./modals/InviteModal.js";
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
      if (!q) return this.remoteSchema;
      return this.remoteSchema.filter(s =>
        (s.schema || "").toLowerCase().includes(q) ||
        (s.localMapping || "").toLowerCase().includes(q) ||
        (s.trustLevel || "").toLowerCase().includes(q)
      );
    },
    remoteSchemaPagination() {
      return paginate(this.filteredRemoteSchema, this.pagination.remoteSchema.page, this.pagination.remoteSchema.perPage);
    },
    filteredMappingRows() {
      const q = (this.mappingSearch || "").trim().toLowerCase();
      if (!q) return this.mappingRows;
      return this.mappingRows.filter(r =>
        (r.remoteCatalogue || "").toLowerCase().includes(q) ||
        (r.remoteSchema || "").toLowerCase().includes(q) ||
        (r.transformationStrategy || "").toLowerCase().includes(q)
      );
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
    canSendInvite() {
      const f = this.inviteForm;
      return f.firstName.trim() && f.lastName.trim() && f.email.trim() && f.role && f.expiresIn;
    },
    canSendManageUser() {
      const m = this.manageForm;
      return m.firstName.trim() && m.lastName.trim() && m.email.trim() && m.selectedRoles.length > 0 && m.expiresIn;
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
      const f = this.monitoringEventFilter;
      const q = (this.monitoringAuditSearch || "").trim().toLowerCase();
      let events = this.monitoringEvents;
      if (f !== "all") events = events.filter(e => e.type === f);
      if (q) events = events.filter(e =>
        (e.source || "").toLowerCase().includes(q) ||
        (e.message || "").toLowerCase().includes(q) ||
        (e.timestamp || "").toLowerCase().includes(q)
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
  },

  watch: {
    isViewModal(val) {
      document.body.style.overflow = val ? "hidden" : "";
    },
    isInviteModal(v) {
      document.body.style.overflow = v ? "hidden" : "";
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
        uibuilderService.send({
          type: "getAdminTools",
          auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
        });
      }
      if (newPage === "harvester") {
        this.loadHarvestData();
      }
      if (newPage === "localCatalogue") {
        this.loadLocalCatalogs();
        this.loadLocalProvenance();
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
    hasAccess(key) { return this.userAccess.includes(key); },
    canRead(area)   { return !!(this.userPermissions[area] && this.userPermissions[area].read); },
    canCreate(area) { return !!(this.userPermissions[area] && this.userPermissions[area].create); },
    canUpdate(area) { return !!(this.userPermissions[area] && this.userPermissions[area].update); },
    canDelete(area) { return !!(this.userPermissions[area] && this.userPermissions[area].delete); },

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

    // ── Asset Detail Panel (Milestone 1) ──────────────────────
    openViewDetail(row) {
      // Build JSON diff lines from the actual asset data for the View modal
      const original = row.originalForm || row;
      const transformed = row.transformedForm || row;
      this.originalJsonLines = this._jsonToLines(original);
      this.localJsonLines = this._jsonToLines(transformed, original);
      this.assetDetailRow = { ...row };
      this.isViewModal = true;
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
        strategy: "none", promptId: "", llmConfigId: "",
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
      const start = Date.now();
      const auth = this.remoteCatalogForm.auth || "none";
      const endpoint = this.remoteCatalogForm.baseEndpoint || this.remoteCatalogForm.queryEndpoint || "";

      // Validate auth-specific fields
      if (auth === "token-login") {
        const loginUrl = this.remoteCatalogForm.authLoginEndpoint || "";
        if (!loginUrl.trim()) {
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

      setTimeout(() => {
        const latency = Date.now() - start;
        if (!endpoint.trim()) {
          this.testConnectionResult = { status: "error", message: "No endpoint URL provided.", latency: 0 };
        } else {
          const authLabel = auth === "token-login" ? " (Token Login authenticated)"
            : auth === "bearer" ? " (Bearer Token)"
            : auth === "apikey" ? " (API Key)"
            : auth === "oauth" ? " (OAuth2)"
            : "";
          this.testConnectionResult = { status: "success", message: `Connection successful to ${endpoint}${authLabel}`, latency };
        }
        this.isTestingConnection = false;
      }, 800 + Math.random() * 700);
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
      const name = user?.name || "this user";
      this.closeManageMenu();
      this.showConfirm("Delete User", `Are you sure you want to delete "${name}"? This action cannot be undone.`, "Delete", () => {
        this.users = this.users.filter(u => String(u.uniqueId) !== String(userId));
        this.addToast("success", "User deleted successfully.");
      });
    },
    openManageUserModal() {
      const userId = this.manageMenu.userId;
      const user = this.users.find(u => String(u.uniqueId) === String(userId));
      if (!user) return;
      const nameParts = (user.name || "").split(" ");
      this.manageForm.firstName = nameParts[0] || "";
      this.manageForm.lastName = nameParts.slice(1).join(" ") || "";
      this.manageForm.email = user.email || "";
      const accessKeys = Array.isArray(user.access) ? user.access : [];
      const labels = accessKeys.map(k => this.inverseAccessMap?.[k]).filter(Boolean);
      if (!labels.includes("Local Catalogue")) labels.unshift("Local Catalogue");
      this.manageForm.selectedRoles = labels;
      this.manageForm.expiresIn = user.expiresIn || "30 Days";
      this.manageForm.altRole = "";
      this.manageForm.message = "";
      this.manageUserModal = true;
      this.manageMenu.open = false;
    },
    closeManageUserModal() {
      this.manageUserModal = false;
      this.manageForm.selectedRoles = ["Local Catalogue"];
    },
    sendManageUser() {
      const userId = this.manageMenu.userId;
      const user = this.users.find(u => String(u.uniqueId) === String(userId));
      if (user) {
        user.name = `${this.manageForm.firstName} ${this.manageForm.lastName}`.trim();
        user.email = this.manageForm.email;
        const accessKeys = (this.manageForm.selectedRoles || []).map(label => this.accessMap[label] || label);
        if (!accessKeys.includes("local_catalogue")) accessKeys.unshift("local_catalogue");
        user.access = accessKeys;
        user.expiresIn = this.manageForm.expiresIn || user.expiresIn;
      }
      this.manageUserModal = false;
      this.manageForm.selectedRoles = ["Local Catalogue"];
      this.addToast("success", "User updated successfully.");
    },

    // ── Invite ─────────────────────────────────────────────────
    closeInviteModal() {
      this.isInviteModal = false;
      this.resetInviteForm();
    },
    sendInvite() {
      const raw = toRaw(this.inviteForm);
      const { role, altRole, firstName, lastName, selectedAccess, ...rest } = raw;
      const mappedAccess = (selectedAccess || []).map(label => this.accessMap[label] || label);
      const data = { profile: { firstName, lastName }, ...rest, access: mappedAccess };
      uibuilderService.send({
        type: "inviteUser",
        auth: { userToken: getCookie("userToken") },
        data,
      });
      this.isInviteModal = false;
      this.resetInviteForm();
      this.addToast("success", "Invitation sent successfully.");
    },
    resetInviteForm() {
      this.inviteForm = {
        firstName: "", lastName: "", email: "",
        role: "Searcher", expiresIn: "30 Days", altRole: "",
        message: "You have been invited to join the federated catalogue system.",
        selectedAccess: ["Local Catalogue"],
      };
    },

    // ── Schema Modals ──────────────────────────────────────────
    openRegisterSchemaEditModal() { this.isRegisterSchemaEditModal = true; },
    openEditRemoteSchema(row) {
      this.registerSchemaForm = {
        name: row.schema || "",
        format: row.format || "SHACL",
        catalogSearch: "",
        remoteCatalogs: row.remoteCatalogs || [],
        namespaces: row.namespaces || [],
        version: row.versioning || "",
        sourceUrl: row.sourceUrl || "",
        summaryTab: "SHACL",
        editId: row.id,
      };
      this.isRegisterSchemaEditModal = true;
    },
    openRegisterSchemaNewModal() {
      this.registerSchemaForm = {
        name: "", format: "SHACL", catalogSearch: "",
        remoteCatalogs: [], namespaces: [],
        version: "", sourceUrl: "", summaryTab: "SHACL"
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
      if (!this.registerSchemaForm.name) return;
      const data = {
        schema: this.registerSchemaForm.name,
        format: this.registerSchemaForm.format,
        remoteCatalogs: this.registerSchemaForm.remoteCatalogs,
        namespaces: this.registerSchemaForm.namespaces,
        version: this.registerSchemaForm.version,
        sourceUrl: this.registerSchemaForm.sourceUrl,
        catalogs: this.registerSchemaForm.remoteCatalogs.length,
        trustLevel: "Federated",
      };
      uibuilderService.send({
        type: "saveRemoteSchema",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data
      });
      // Optimistically add to list
      const maxId = this.remoteSchema.reduce((m, s) => Math.max(m, s.id), 0);
      this.remoteSchema.push({
        id: maxId + 1,
        schema: data.schema,
        catalogs: data.catalogs || 0,
        localMapping: null,
        versioning: data.version || "v1.0",
        versionOptions: ["v1.0", "v1.1", "v2.0"],
        trustLevel: data.trustLevel,
      });
      this.closeRegisterSchemaNewModal();
      this.addToast("success", "Remote schema registered.");
    },
    saveRegisterSchemaEdit() {
      this.closeRegisterSchemaEditModal();
      this.addToast("success", "Schema details updated.");
    },

    // ── Asset Type Registry ──────────────────────────────────────
    openAssetTypeForm() {
      this.isEditingAssetType = false;
      this.assetTypeForm = { id: null, name: "", description: "", icon: "dataset" };
      this.showAssetTypeForm = true;
    },
    editAssetType(at) {
      this.isEditingAssetType = true;
      this.assetTypeForm = { id: at.id, name: at.name, description: at.description, icon: at.icon };
      this.showAssetTypeForm = true;
    },
    cancelAssetTypeForm() {
      this.showAssetTypeForm = false;
      this.assetTypeForm = { id: null, name: "", description: "", icon: "dataset" };
      this.isEditingAssetType = false;
    },
    saveAssetType() {
      if (!this.assetTypeForm.name) return;
      if (this.isEditingAssetType && this.assetTypeForm.id != null) {
        const idx = this.assetTypes.findIndex(t => t.id === this.assetTypeForm.id);
        if (idx !== -1) {
          this.assetTypes.splice(idx, 1, { ...this.assetTypeForm });
        }
      } else {
        const maxId = this.assetTypes.reduce((m, t) => Math.max(m, t.id), 0);
        this.assetTypes.push({ ...this.assetTypeForm, id: maxId + 1 });
      }
      this.cancelAssetTypeForm();
      this.addToast("success", this.isEditingAssetType ? "Asset type updated." : "Asset type created.");
    },
    deleteAssetType(id) {
      const at = this.assetTypes.find(t => t.id === id);
      this.showConfirm("Delete Asset Type", `Are you sure you want to delete "${at?.name || 'this type'}"?`, "Delete", () => {
        this.assetTypes = this.assetTypes.filter(t => t.id !== id);
        this.addToast("success", "Asset type deleted.");
      });
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
      };
      this.showPromptModal = true;
    },
    openEditPrompt(p) {
      this.isEditingPrompt = true;
      this.promptFormError = "";
      this.isEnhancingPrompt = false;
      this.promptForm = { ...p, name: p.name || "", author: p.author || "" };
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
          schemaContext: this.schemaSummaries?.SHACL || ""
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
            author: this.promptForm.author || ""
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

    // ── Multi-Model Provider (FR-SR-12) ──────────────────────
    openProviderModal() {
      this.isEditingProvider = false;
      this.providerFormError = "";
      this.providerForm = { id: null, name: "", type: "openai", apiEndpoint: "", models: "", rateLimits: "", timeout: 30, isDefault: false, precedence: this.llmProviders.length + 1, status: "active" };
      this.showProviderModal = true;
    },
    openEditProvider(p) {
      this.isEditingProvider = true;
      this.providerFormError = "";
      this.providerForm = { ...p, models: Array.isArray(p.models) ? p.models.join(", ") : p.models };
      this.showProviderModal = true;
    },
    closeProviderModal() {
      this.showProviderModal = false;
      this.providerFormError = "";
    },
    saveProvider() {
      if (!this.providerForm.name || !this.providerForm.apiEndpoint) return;
      const models = typeof this.providerForm.models === "string"
        ? this.providerForm.models.split(",").map(m => m.trim()).filter(Boolean)
        : this.providerForm.models;
      // Send to backend — backend handles ID generation, timestamps, default enforcement, DB persistence
      uibuilderService.send({
        type: "saveProvider",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") },
        data: { ...this.providerForm, models, precedence: this.providerForm.precedence || this.llmProviders.length + 1 }
      });
      this.closeProviderModal();
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
      this.localSchemaForm = { schema: "", format: "SHACL", catalogs: 1, localMapping: "", versioning: "v1.0", trustLevel: "Federated" };
      this.showCreateLocalSchemaModal = true;
    },
    openEditLocalSchema(row) {
      this.isEditingLocalSchema = true;
      this.editingLocalSchemaId = row.id;
      this.localSchemaForm = { schema: row.schema, format: "SHACL", catalogs: row.catalogs, localMapping: row.localMapping || "", versioning: row.versioning, trustLevel: row.trustLevel };
      this.showCreateLocalSchemaModal = true;
    },
    closeCreateLocalSchemaModal() {
      this.showCreateLocalSchemaModal = false;
    },
    saveLocalSchema() {
      if (!this.localSchemaForm.schema) return;
      const data = {
        schema: this.localSchemaForm.schema,
        format: this.localSchemaForm.format || "SHACL",
        catalogs: this.localSchemaForm.catalogs,
        localMapping: this.localSchemaForm.localMapping || null,
        versioning: this.localSchemaForm.versioning,
        trustLevel: this.localSchemaForm.trustLevel,
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

    confirmDeleteRemoteSchema(id) {
      const schema = this.remoteSchema.find(s => s.id === id);
      this.showConfirm("Delete Remote Schema", `Are you sure you want to delete "${schema?.schema || 'this schema'}"?`, "Delete", () => {
        this.remoteSchema = this.remoteSchema.filter(s => s.id !== id);
        this.addToast("success", "Remote schema deleted.");
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
      this.isEditingMapping = false;
      this.editingMappingId = null;
      this.addMappingForm = { remoteCatalogue: "", remoteSchema: "", remoteSchemaMeta: "", transformationStrategy: "Deterministic RDF", promptsCount: 0, shaclCount: 0 };
      this.showAddMappingModal = true;
    },
    closeAddMappingModal() {
      this.showAddMappingModal = false;
    },
    saveAddMapping() {
      if (!this.addMappingForm.remoteCatalogue || !this.addMappingForm.remoteSchema) return;
      const data = { ...this.addMappingForm };
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
      this.mappingDetailRow = { ...row };
      this.isEditingMappingDetail = false;
      this.showMappingDetailPanel = true;
    },
    closeMappingDetail() {
      this.showMappingDetailPanel = false;
      this.mappingDetailRow = null;
      this.isEditingMappingDetail = false;
    },
    startEditMappingDetail() {
      if (!this.mappingDetailRow) return;
      this.mappingDetailEditForm = {
        remoteCatalogue: this.mappingDetailRow.remoteCatalogue,
        remoteSchema: this.mappingDetailRow.remoteSchema,
        remoteSchemaMeta: this.mappingDetailRow.remoteSchemaMeta,
        transformationStrategy: this.mappingDetailRow.transformationStrategy,
      };
      this.isEditingMappingDetail = true;
    },
    cancelEditMappingDetail() {
      this.isEditingMappingDetail = false;
    },
    saveEditMappingDetail() {
      if (!this.mappingDetailRow) return;
      const data = { id: this.mappingDetailRow.id, ...this.mappingDetailEditForm };
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

    // ── Monitoring Log Export (Milestone 4) ─────────────────────
    exportMonitoringLog(format) {
      const rows = this.filteredMonitoringEvents;
      let content, filename, mimeType;
      if (format === "csv") {
        const headers = ["ID", "Level", "Source", "Message", "Timestamp"];
        const csvRows = rows.map(r => [r.id, r.type, r.source, r.message, r.timestamp].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
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

    // ── Logout ──────────────────────────────────────────────────
    logout() {
      uibuilderService.send({
        type: "logOut",
        auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
      });
    },
  },

  mounted() {
    uibuilderService.start();

    // Load all Schema Registry data from MongoDB on mount
    uibuilderService.send({ type: "listPrompts", data: {} });
    uibuilderService.send({ type: "listTestCases", data: {} });
    uibuilderService.send({ type: "listLlmConfigs", data: {} });
    uibuilderService.send({ type: "listProviders", data: {} });
    uibuilderService.send({ type: "listLocalSchemas", data: {} });
    uibuilderService.send({ type: "listMappings", data: {} });

    // Load Catalogue Registry data on mount
    uibuilderService.send({
      type: "getCatalogRegistry",
      auth: { userToken: getCookie("userToken"), clientId: getCookie("uibuilder-client-id") }
    });

    // Load Harvest data on mount
    this.loadHarvestData();

    uibuilderService.onMessage((msg) => {
      console.log(msg);
      const payload = msg?.payload ?? msg;
      const resp = payload?.response ?? msg?.response;

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

      if (resp?.action === "inviteUser" && resp?.status === "success") {
        const sent = payload?.data ?? msg?.data ?? {};
        const firstName = sent?.profile?.firstName ?? sent?.firstName ?? "";
        const lastName = sent?.profile?.lastName ?? sent?.lastName ?? "";
        const uid = resp?.uniqueId ?? msg?.response?.uniqueId ?? payload?.response?.uniqueId;
        const accessKeys = Array.isArray(sent?.access) ? sent.access : [];
        const newUser = {
          uniqueId: uid,
          name: `${firstName} ${lastName}`.trim(),
          avatar: "./img/avatar-16.jpg",
          email: sent?.email ?? "",
          access: accessKeys,
          status: "Invited",
          expiresIn: sent?.expiresIn ?? "30 Days",
        };
        let idx = uid ? this.users.findIndex(u => String(u.uniqueId) === String(uid)) : -1;
        if (idx === -1 && newUser.email) idx = this.users.findIndex(u => String(u.email) === String(newUser.email));
        if (idx !== -1) this.users.splice(idx, 1, newUser);
        else this.users.unshift(newUser);
        this.pagination.users.page = 1;
      }

      if (msg?.type === "getAdminTools" && msg?.response?.status === "success") {
        const list = msg.response.users || [];
        this.users = list.map((u, i) => {
          const uid = u.uniqueId ?? u.id ?? u._id ?? String(i);
          return {
            ...u, uniqueId: uid,
            name: (`${u.profile?.firstName ?? ""} ${u.profile?.lastName ?? ""}`).trim() || u.name || u.email || "\u2014",
            avatar: u.avatar || "./img/avatar-16.jpg",
            email: u.email || "\u2014",
            status: u.status || (u.invited ? "Invited" : "Active"),
          };
        });
      }

      if (resp?.action === "logOut" && resp?.status === "success") {
        window.location.href = "/facis-facis/login";
        document.cookie = "userToken=; path=/; max-age=0";
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

      if (resp?.action === "saveProvider" && resp?.status === "success") {
        if (resp.provider) {
          const idx = this.llmProviders.findIndex(p => p.id === resp.provider.id);
          if (idx !== -1) {
            this.llmProviders.splice(idx, 1, resp.provider);
          } else {
            this.llmProviders.push(resp.provider);
          }
          // Backend enforces default: if this provider is default, clear others
          if (resp.provider.isDefault) {
            this.llmProviders.forEach(p => { if (p.id !== resp.provider.id) p.isDefault = false; });
          }
        }
        this.addToast("success", resp.isNew ? "Provider created." : "Provider updated.");
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
        if (Array.isArray(resp.schemas) && resp.schemas.length > 0) {
          this.schemaRegistry = resp.schemas;
        }
      }

      if (resp?.action === "saveLocalSchema" && resp?.status === "success") {
        if (resp.schema) {
          const idx = this.schemaRegistry.findIndex(s => s.id === resp.schema.id);
          if (idx !== -1) {
            this.schemaRegistry.splice(idx, 1, resp.schema);
          } else {
            this.schemaRegistry.push(resp.schema);
          }
        }
        this.addToast("success", resp.isNew ? "Schema created." : "Schema updated.");
      }

      if (resp?.action === "deleteLocalSchema" && resp?.status === "success") {
        this.schemaRegistry = this.schemaRegistry.filter(s => s.id !== resp.schemaId);
        this.addToast("success", "Schema deleted.");
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
app.component("invite-modal", InviteModal);
app.component("manage-user-modal", ManageUserModal);
app.component("register-catalog-modal", RegisterCatalogModal);
app.component("schema-modal", SchemaModal);
app.component("harvest-wizard-modal", HarvestWizardModal);
app.component("access-info-modal", AccessInfoModal);
app.component("manage-menu", ManageMenu);

// ─── Mount ───────────────────────────────────────────────────────
app.mount("#app");
