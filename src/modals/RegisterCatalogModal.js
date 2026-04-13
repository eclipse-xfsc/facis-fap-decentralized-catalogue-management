export default {
  name: "RegisterCatalogModal",
  template: "#tpl-register-catalog-modal",
  props: {
    visible: { type: Boolean, default: false },
    remoteCatalogForm: { type: Object, required: true },
    isEditingRemoteCatalog: { type: Boolean, default: false },
    isSavingRemoteCatalog: { type: Boolean, default: false },
    registerRemoteCatalogError: { type: String, default: "" },
    updateRemoteCatalogError: { type: String, default: "" },
    isTestingConnection: { type: Boolean, default: false },
    testConnectionResult: { type: Object, default: () => ({ status: "", message: "", latency: 0 }) },
  },
  emits: ["close", "save", "test-connection"],
  data() {
    return {
      uploadedJsonFile: null,
      jsonUploadError: "",
      isDraggingJson: false,
    };
  },
  watch: {
    visible(v) {
      if (!v) {
        this.uploadedJsonFile = null;
        this.jsonUploadError = "";
        this.isDraggingJson = false;
      }
    }
  },
  methods: {
    handleJsonDrop(e) {
      this.isDraggingJson = false;
      const file = e.dataTransfer?.files?.[0];
      if (file) this.processJsonFile(file);
    },
    handleJsonFileSelect(e) {
      const file = e.target?.files?.[0];
      if (file) this.processJsonFile(file);
      e.target.value = "";
    },
    processJsonFile(file) {
      this.jsonUploadError = "";
      if (!file.name.endsWith(".json") && file.type !== "application/json") {
        this.jsonUploadError = "Please select a valid .json file.";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.jsonUploadError = "File is too large (max 5 MB).";
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this.uploadedJsonFile = { name: file.name, data };
          this.applyJsonToForm(data);
          // Persist the full JSON as source data so harvest can extract real assets
          this.remoteCatalogForm.sourceData = data;
          this.remoteCatalogForm.sourceFileName = file.name;
        } catch {
          this.jsonUploadError = "Invalid JSON — could not parse the file.";
          this.uploadedJsonFile = null;
        }
      };
      reader.onerror = () => {
        this.jsonUploadError = "Failed to read the file.";
      };
      reader.readAsText(file);
    },
    applyJsonToForm(data) {
      const map = {
        catalogId: ["catalogId", "id", "identifier"],
        catalogName: ["catalogName", "name", "title"],
        owner: ["owner", "contact", "publisher"],
        protocol: ["protocol", "type"],
        baseEndpoint: ["baseEndpoint", "accessUrl", "endpointUrl", "endpoint", "url"],
        mimeType: ["mimeType", "mediaType", "contentType"],
        queryEndpoint: ["queryEndpoint"],
        queryLanguages: ["queryLanguages"],
        metadataPrefix: ["metadataPrefix"],
        setSpec: ["setSpec"],
        resumptionToken: ["resumptionToken"],
        dcatCatalogUri: ["dcatCatalogUri", "catalogUri"],
        linkedDataEndpoint: ["linkedDataEndpoint", "sparqlEndpoint"],
        contentNegotiation: ["contentNegotiation"],
        strategy: ["strategy", "transformationStrategy"],
        promptId: ["promptId"],
        llmConfigId: ["llmConfigId"],
        namespacesToPreserve: ["namespacesToPreserve", "namespaces"],
        shaclShapeId: ["shaclShapeId", "shapeId"],
        auth: ["auth", "authentication", "authType"],
        authLoginEndpoint: ["authLoginEndpoint", "loginEndpoint", "loginUrl"],
        authUsername: ["authUsername", "username", "email"],
        authPassword: ["authPassword", "password"],
        authPayloadTemplate: ["authPayloadTemplate", "loginPayload"],
        authTokenPath: ["authTokenPath", "tokenPath"],
        authTokenInjection: ["authTokenInjection", "tokenInjection"],
        authTokenFieldName: ["authTokenFieldName", "tokenField"],
        authTokenPrefix: ["authTokenPrefix", "tokenPrefix"],
        authStaticToken: ["authStaticToken", "bearerToken", "staticToken"],
        authApiKey: ["authApiKey", "apiKey"],
        authApiKeyHeader: ["authApiKeyHeader", "apiKeyHeader"],
        responseRootPath: ["responseRootPath", "rootPath", "dataPath"],
        responseAssetIdField: ["responseAssetIdField", "assetIdField", "idField"],
        responseAssetNameField: ["responseAssetNameField", "assetNameField", "nameField"],
        responseAssetTypeField: ["responseAssetTypeField", "assetTypeField", "typeField"],
        trustAnchor: ["trustAnchor"],
        enabled: ["enabled", "active"],
      };
      for (const [formKey, aliases] of Object.entries(map)) {
        for (const alias of aliases) {
          if (data[alias] !== undefined && data[alias] !== null) {
            this.remoteCatalogForm[formKey] = data[alias];
            break;
          }
        }
      }
    },
    clearUploadedJson() {
      this.uploadedJsonFile = null;
      this.jsonUploadError = "";
      this.remoteCatalogForm.sourceData = null;
      this.remoteCatalogForm.sourceFileName = "";
    },
  },
};
