export default {
  name: "CreateUserModal",
  template: "#tpl-create-user-modal",
  props: {
    visible: { type: Boolean, default: false },
    createUserForm: { type: Object, required: true },
    loading: { type: Boolean, default: false },
  },
  emits: ["close", "create-user", "update:createUserForm"],
  computed: {
    canCreateUser() {
      const f = this.createUserForm;
      const emailOk = !(f.email || "").trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((f.email || "").trim());
      return (f.username || "").trim()
        && (f.password || "").length >= 8
        && emailOk
        && (f.accessAreas || []).length > 0;
    }
  }
};
