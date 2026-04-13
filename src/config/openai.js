/**
 * OpenAI Configuration
 *
 * IMPORTANT: OpenAI API calls are now handled by the Node-RED backend.
 * The API key is stored in the DCM-SchemaRegistry flow as an environment
 * variable (OPENAI_API_KEY). Set it in the Node-RED flow editor.
 *
 * This file is kept for reference and mock/fallback detection only.
 * The frontend no longer makes direct OpenAI API calls.
 */
export const OPENAI_CONFIG = {
  apiKey: "",
  model: "gpt-4o",
  baseUrl: "https://api.openai.com/v1/chat/completions",
};

/**
 * Returns true when a real (non-placeholder) API key is configured.
 * In the new backend-driven architecture, this always returns false
 * on the frontend side — the backend handles API key management.
 */
export function hasRealApiKey() {
  const key = (OPENAI_CONFIG.apiKey || "").trim();
  return key.length > 0;
}
