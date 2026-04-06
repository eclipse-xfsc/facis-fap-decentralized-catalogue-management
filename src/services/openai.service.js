/**
 * OpenAI Service
 *
 * Two operations:
 *   A. enhancePrompt  – improve user's raw prompt in-place
 *   B. generateCode   – produce a JavaScript transform function
 *
 * Both read from the centralised OPENAI_CONFIG.
 * If no real API key is present, believable mock responses are returned.
 */

import { OPENAI_CONFIG, hasRealApiKey } from "../config/openai.js";

// ── Helpers ─────────────────────────────────────────────────

async function callOpenAI(messages) {
  const res = await fetch(OPENAI_CONFIG.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_CONFIG.model,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

function stripCodeFences(text) {
  return text
    .replace(/^```(?:javascript|js)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

// ── A. Prompt Enhancement ───────────────────────────────────

function mockEnhance(rawPrompt, sourceSchema, targetSchema) {
  return `Transform the following ${sourceSchema} record into a fully valid ${targetSchema} record.

Requirements:
- Map all source fields to their closest semantic equivalents in the target schema.
- Preserve original identifiers and timestamps.
- Ensure all mandatory target fields are populated.
- If a source field has no direct mapping, derive the value from context or omit it.
- Output must be valid JSON conforming to ${targetSchema}.

Original intent: ${rawPrompt}

Source schema: ${sourceSchema}
Target schema: ${targetSchema}

Provide only the transformed record as output.`;
}

export async function enhancePrompt(rawPrompt, sourceSchema, targetSchema, schemaContext) {
  if (!hasRealApiKey()) {
    await new Promise((r) => setTimeout(r, 1200));
    return mockEnhance(rawPrompt, sourceSchema, targetSchema);
  }

  const messages = [
    {
      role: "system",
      content:
        "You are an expert at writing LLM transformation prompts for schema-to-schema data conversion. " +
        "Given a user's rough prompt, improve it to be clearer, more specific, and more effective. " +
        "Keep the user's original intent. Return ONLY the improved prompt text, nothing else.",
    },
    {
      role: "user",
      content: `Source schema: ${sourceSchema}
Target schema: ${targetSchema}

Schema context:
${schemaContext || "(none)"}

User's raw prompt:
${rawPrompt}

Return the improved prompt only.`,
    },
  ];

  return await callOpenAI(messages);
}

// ── B. Code Generation ──────────────────────────────────────

function mockGenerateCode(sourceSchema, targetSchema, prompt) {
  return `function transform(input) {
  // ${sourceSchema} -> ${targetSchema} transformation
  const output = {};

  // Map identifiers
  output["@type"] = "${targetSchema.includes("DCAT") ? "dcat:Dataset" : targetSchema}";
  output["dct:identifier"] = input.identifier || input.id || "";
  output["dct:title"] = input.name || input.title || "";
  output["dct:description"] = input.description || "";

  // Map temporal fields
  if (input.updatedAt || input.updated_at || input.dateModified) {
    output["dct:modified"] = input.updatedAt || input.updated_at || input.dateModified;
  }

  // Map publisher / owner
  if (input.owner || input.publisher) {
    const pub = input.owner || input.publisher;
    output["dct:publisher"] = typeof pub === "object" ? pub.name || JSON.stringify(pub) : pub;
  }

  // Map spatial coverage
  if (input.location || input.spatial) {
    output["dct:spatial"] = input.location || input.spatial;
  }

  // Map distribution / access
  if (input.distribution || input.accessURL || input.downloadURL) {
    output["dcat:distribution"] = input.distribution || [{
      "dcat:accessURL": input.accessURL || input.downloadURL || ""
    }];
  }

  // Carry over remaining fields
  const mapped = new Set(["identifier","id","name","title","description",
    "updatedAt","updated_at","dateModified","owner","publisher",
    "location","spatial","distribution","accessURL","downloadURL","@type"]);
  for (const [k, v] of Object.entries(input)) {
    if (!mapped.has(k)) output[k] = v;
  }

  return output;
}`;
}

export async function generateTransformCode(sourceSchema, targetSchema, prompt, schemaContext) {
  if (!hasRealApiKey()) {
    await new Promise((r) => setTimeout(r, 2000));
    return mockGenerateCode(sourceSchema, targetSchema, prompt);
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a code generator. Output ONLY a single JavaScript function named `transform` " +
        "that takes one argument `input` (a plain object) and returns the transformed object. " +
        "No markdown fences, no explanation, no imports. " +
        "The function must be deterministic, handle missing fields gracefully, and produce valid JSON-serialisable output.",
    },
    {
      role: "user",
      content: `Source schema: ${sourceSchema}
Target schema: ${targetSchema}

Prompt / mapping instructions:
${prompt}

Schema context:
${schemaContext || "(none)"}

Generate the JavaScript transform function now.`,
    },
  ];

  const raw = await callOpenAI(messages);
  return stripCodeFences(raw);
}
