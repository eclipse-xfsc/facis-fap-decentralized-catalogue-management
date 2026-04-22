export default {
  name: "SchemaModal",
  template: "#tpl-schema-modal",
  props: {
    visible: { type: Boolean, default: false },
    modalTitle: { type: String, default: "Register Remote Schema" },
    registerSchemaForm: { type: Object, required: true },
    availableCatalogues: { type: Array, default: () => [] },
  },
  emits: ["close", "save"],
  computed: {
    showCatalogueError() {
      // Show error only after user has interacted (form has been touched)
      // We consider it "touched" if name is filled but catalogueIds is empty
      return this.registerSchemaForm.name &&
        (!this.registerSchemaForm.catalogueIds || this.registerSchemaForm.catalogueIds.length === 0);
    },
  },
};
