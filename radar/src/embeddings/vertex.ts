// Vertex AI text embeddings (design §6.5 — the decided provider). Calls the
// Vertex predict endpoint with an ADC access token, so on GCP it uses Workload
// Identity and locally it uses `gcloud auth application-default login`.
import { GoogleAuth } from "google-auth-library";
import type { Vector } from "../types.ts";
import type { Embedder } from "./embedder.ts";

export interface VertexConfig {
  /** GCP project id. Defaults to $VERTEX_PROJECT, then $GOOGLE_CLOUD_PROJECT. */
  project?: string;
  /** Region, e.g. "us-central1". Defaults to $VERTEX_LOCATION, then us-central1. */
  location?: string;
  /** Embedding model. Defaults to $EMBEDDING_MODEL, then text-embedding-005. */
  model?: string;
}

const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

export function vertexEmbedder(cfg: VertexConfig = {}): Embedder {
  const project = cfg.project ?? Deno.env.get("VERTEX_PROJECT") ??
    Deno.env.get("GOOGLE_CLOUD_PROJECT");
  const location = cfg.location ?? Deno.env.get("VERTEX_LOCATION") ?? "us-central1";
  const model = cfg.model ?? Deno.env.get("EMBEDDING_MODEL") ?? "text-embedding-005";

  const endpoint =
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`;

  return {
    id: `vertex:${model}`,
    async embed(texts: string[]): Promise<Vector[]> {
      if (!project) {
        throw new Error("Vertex project not set (VERTEX_PROJECT / GOOGLE_CLOUD_PROJECT)");
      }
      const client = await auth.getClient();
      const { token } = await client.getAccessToken();
      if (!token) {
        throw new Error(
          "no Application Default Credentials — run `gcloud auth application-default login`",
        );
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          instances: texts.map((content) => ({ content, task_type: "RETRIEVAL_DOCUMENT" })),
        }),
      });
      if (!res.ok) {
        throw new Error(`vertex embeddings -> ${res.status}: ${await res.text()}`);
      }
      const json = await res.json() as {
        predictions: { embeddings: { values: number[] } }[];
      };
      return json.predictions.map((p) => new Float32Array(p.embeddings.values));
    },
  };
}
