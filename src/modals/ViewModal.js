import { logPillClass } from "../utils/formatters.js";
import { parseJsonLine } from "../utils/helpers.js";

export default {
  name: "ViewModal",
  template: "#tpl-view-modal",
  props: {
    visible: { type: Boolean, default: false },
    currentViewTab: { type: String, default: "Overview" },
    transformationSummary: { type: Array, default: () => [] },
    validation: { type: Object, default: () => ({}) },
    auditMini: { type: Array, default: () => [] },
    auditRows: { type: Array, default: () => [] },
    auditSearch: { type: String, default: "" },
    auditFilters: { type: Object, default: () => ({}) },
    originalJsonLines: { type: Array, default: () => [] },
    localJsonLines: { type: Array, default: () => [] },
    viewingForm: { type: String, default: 'both' },
    linkedAssets: { type: Object, default: null },
  },
  emits: [
    "close", "update:currentViewTab", "update:auditSearch",
    "update:auditFilters", "export-audit", "clear-audit-filters",
    "set-viewing-form"
  ],
  computed: {
    filteredAuditMini() {
      const q = (this.auditSearch || "").trim().toLowerCase();
      const rows = Array.isArray(this.auditMini) ? this.auditMini : [];
      if (!q) return rows;
      return rows.filter(r =>
        (r.level || "").toLowerCase().includes(q) ||
        (r.step || "").toLowerCase().includes(q) ||
        (r.timestamp || "").toLowerCase().includes(q)
      );
    },
    filteredAuditRows() {
      const f = this.auditFilters || {};
      const rows = Array.isArray(this.auditRows) ? this.auditRows : [];
      return rows.filter(row => {
        if (f.assetId && !(row.assetId || "").toLowerCase().includes(f.assetId.toLowerCase())) return false;
        if (f.catalogueId && (row.catalogueId || "") !== f.catalogueId) return false;
        if (f.promptVersion && (row.promptVersion || "") !== f.promptVersion) return false;
        if (f.status && (row.status || "") !== f.status) return false;
        if (f.dateFrom) {
          const rowDate = (row.timestamp || "").slice(0, 10);
          if (rowDate < f.dateFrom) return false;
        }
        if (f.dateTo) {
          const rowDate = (row.timestamp || "").slice(0, 10);
          if (rowDate > f.dateTo) return false;
        }
        return true;
      });
    },
    auditCatalogueOptions() {
      const set = new Set();
      const rows = Array.isArray(this.auditRows) ? this.auditRows : [];
      rows.forEach(r => { if (r && r.catalogueId) set.add(r.catalogueId); });
      return Array.from(set).sort();
    },
    auditPromptVersionOptions() {
      const set = new Set();
      const rows = Array.isArray(this.auditRows) ? this.auditRows : [];
      rows.forEach(r => { if (r && r.promptVersion) set.add(r.promptVersion); });
      return Array.from(set).sort();
    },
    auditStatusOptions() {
      const set = new Set();
      const rows = Array.isArray(this.auditRows) ? this.auditRows : [];
      rows.forEach(r => { if (r && r.status) set.add(r.status); });
      return Array.from(set).sort();
    },
    hasActiveFilters() {
      const f = this.auditFilters || {};
      return !!(f.assetId || f.catalogueId || f.promptVersion || f.status || f.dateFrom || f.dateTo);
    }
  },
  methods: {
    logPillClass,
    parseJsonLine,
    updateFilter(key, value) {
      this.$emit("update:auditFilters", { ...this.auditFilters, [key]: value });
    },
    exportAudit(format) {
      this.$emit("export-audit", format);
    }
  }
};
