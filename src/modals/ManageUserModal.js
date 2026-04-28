export default {
  name: "ManageUserModal",
  template: "#tpl-manage-user-modal",
  props: {
    visible: { type: Boolean, default: false },
    editUserForm: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    canSave: { type: Boolean, default: false },
    passwordSaving: { type: Boolean, default: false },
    passwordError: { type: String, default: "" },
  },
  emits: ["close", "save-user", "save-password"],
  data() {
    return {
      setNewPasswordOpen: false,
      userEditPasswordForm: { password: "", confirm: "" },
      userEditPasswordError: "",
    };
  },
  watch: {
    visible(v) {
      if (!v) {
        this.setNewPasswordOpen = false;
        this.userEditPasswordForm = { password: "", confirm: "" };
        this.userEditPasswordError = "";
      }
    },
    passwordSaving(v, prev) {
      // When the parent finishes a successful save, clear the form.
      if (prev && !v && !this.passwordError) {
        this.setNewPasswordOpen = false;
        this.userEditPasswordForm = { password: "", confirm: "" };
        this.userEditPasswordError = "";
      }
    },
  },
  computed: {
    accessLabel() {
      const areas = this.editUserForm.accessAreas || [];
      const allFive = ['localCatalogue','catalogueRegistry','schemaRegistry','adminTools','harvest'];
      if (allFive.every(a => areas.includes(a))) return 'Full Access';
      const labelMap = { localCatalogue: 'Local Catalogue', catalogueRegistry: 'Catalogue Registry', schemaRegistry: 'Schema Registry', adminTools: 'Admin Tools', harvest: 'Harvest' };
      const order = ['localCatalogue','catalogueRegistry','schemaRegistry','adminTools','harvest'];
      return order.filter(a => areas.includes(a)).map(a => labelMap[a]).join(' + ') || 'No Access';
    }
  },
  methods: {
    toggleSetNewPassword() {
      this.setNewPasswordOpen = !this.setNewPasswordOpen;
      if (!this.setNewPasswordOpen) {
        this.userEditPasswordForm = { password: "", confirm: "" };
        this.userEditPasswordError = "";
      }
    },
    submitUpdateUserPassword() {
      const f = this.userEditPasswordForm || {};
      if (!f.password || f.password.length < 8) {
        this.userEditPasswordError = "Password must be at least 8 characters.";
        return;
      }
      if (f.password !== f.confirm) {
        this.userEditPasswordError = "Passwords do not match.";
        return;
      }
      this.userEditPasswordError = "";
      this.$emit("save-password", { password: f.password });
    },
  },
};
