export default {
  name: "ManageUserModal",
  template: "#tpl-manage-user-modal",
  props: {
    visible: { type: Boolean, default: false },
    editUserForm: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    canSave: { type: Boolean, default: false },
  },
  emits: ["close", "save-user"],
  computed: {
    accessLabel() {
      const areas = this.editUserForm.accessAreas || [];
      const allFive = ['localCatalogue','catalogueRegistry','schemaRegistry','adminTools','harvest'];
      if (allFive.every(a => areas.includes(a))) return 'Full Access';
      const labelMap = { localCatalogue: 'Local Catalogue', catalogueRegistry: 'Catalogue Registry', schemaRegistry: 'Schema Registry', adminTools: 'Admin Tools', harvest: 'Harvest' };
      const order = ['localCatalogue','catalogueRegistry','schemaRegistry','adminTools','harvest'];
      return order.filter(a => areas.includes(a)).map(a => labelMap[a]).join(' + ') || 'No Access';
    }
  }
};
