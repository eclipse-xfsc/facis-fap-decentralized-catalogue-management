import { logPillClass } from "../utils/formatters.js";
import { parseJsonLine } from "../utils/helpers.js";

export default {
  name: "ViewModal",
  template: "#tpl-view-modal",
  props: {
    visible: { type: Boolean, default: false },
    assetDetailRow: { type: Object, default: null },
    mappingRows: { type: Array, default: () => [] },
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
  data() {
    return {
      referenceSearch: ''
    };
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
    },
    // ── v42: asset detail computeds ──
    assetDetailMappingLabel() {
      const r = this.assetDetailRow || {};
      const id = r.transformedByMappingId;
      if (id && Array.isArray(this.mappingRows)) {
        const m = this.mappingRows.find(x => x && x.id === id);
        if (m && m.transformationStrategy) return m.transformationStrategy;
      }
      return r.transformationStrategy || (r.transformedForm ? 'Applied' : '\u2014');
    },
    assetDetailMappingStatus() {
      const r = this.assetDetailRow || {};
      if (r.transformedForm) return 'Success';
      if (r.transformError) return 'Error';
      return 'Pending';
    },
    assetDetailDescription() {
      const r = this.assetDetailRow || {};
      const tf = r.transformedForm || {};
      return tf.description || tf['dct:description'] || r.description || 'No description available';
    },
    assetDetailProvider() {
      const r = this.assetDetailRow || {};
      const tf = r.transformedForm || {};
      return tf.legalName || tf.provider || tf.publisher || r.provider || r.sourceCatalogue || '\u2014';
    },
    assetDetailTags() {
      const r = this.assetDetailRow || {};
      if (Array.isArray(r.tags) && r.tags.length) return r.tags;
      if (Array.isArray(r.keywords) && r.keywords.length) return r.keywords;
      if (r.domain) return [String(r.domain).toLowerCase().replace(/\s+/g, '-')];
      return [];
    },
    assetDetailHarvestScope() {
      const r = this.assetDetailRow || {};
      const parts = [];
      if (r.type) parts.push('type=' + r.type);
      if (r.domain) parts.push('domain=' + r.domain);
      return parts.length ? parts.join(' AND ') : '\u2014';
    },
    assetDetailHarvestTrigger() {
      const r = this.assetDetailRow || {};
      return r.harvestTrigger || (r.harvestRunId ? 'Manual' : '\u2014');
    },
    assetDetailHarvestType() {
      const r = this.assetDetailRow || {};
      return r.harvestType || (r.crawledFrom ? 'Crawl-resolved' : 'Full');
    },
    assetDetailErrorRows() {
      const r = this.assetDetailRow || {};
      if (Array.isArray(r.errors)) return r.errors;
      if (Array.isArray(r.logs)) return r.logs.filter(l => l && (l.level === 'error' || l.level === 'warn'));
      return [];
    },
    assetDetailReferences() {
      const r = this.assetDetailRow || {};
      if (Array.isArray(r.references)) return r.references;
      if (Array.isArray(r.crawlReferences)) return r.crawlReferences;
      return [];
    },
    filteredAssetReferences() {
      const q = (this.referenceSearch || '').trim().toLowerCase();
      const list = this.assetDetailReferences || [];
      if (!q) return list;
      return list.filter(ref =>
        Object.values(ref || {}).some(v => v && String(v).toLowerCase().includes(q))
      );
    },
    assetDetailRefStats() {
      const list = this.assetDetailReferences || [];
      const resolved = list.filter(r => r && r.resolved === true).length;
      const unresolved = list.filter(r => r && r.resolved !== true).length;
      return { resolved, unresolved };
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
    },
    // ── v42: asset detail methods ──
    openHarvestRunAudit(runId) {
      if (!runId) return;
      this.$emit('open-harvest-run-audit', runId);
    },
    openErrorLog(err) {
      try {
        navigator.clipboard.writeText(JSON.stringify(err || {}, null, 2));
      } catch (_) {}
      this.$emit('open-error-log', err);
    },
    exportReferences() {
      const rows = this.assetDetailReferences || [];
      const csv = ['Type,URI,Resolved,SourceCatalogue,TargetCatalogue'].concat(
        rows.map(r => [r.type, r.uri || r.url, r.resolved, r.sourceCatalogue, r.targetCatalogue]
          .map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(','))
      ).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'references.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
};
