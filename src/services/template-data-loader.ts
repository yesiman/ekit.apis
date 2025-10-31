// src/rendering/data-loader.ts
import Handlebars from "handlebars";
import type { Collection, Db, Document, SortDirection } from "mongodb";
import { mongo } from "./mongo";

/* =========================
   Types JSON sûrs & Template
   ========================= */

type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export interface JSONObject { [key: string]: JSONValue | undefined }
export interface JSONArray extends Array<JSONValue> {}

export type TemplateCtx = { params?: Record<string, unknown>; [k: string]: unknown };

export type SortSpec = Record<string, 1 | -1>;
export type FilterSpec = JSONObject; // filtrage "safe" (opérateurs whitelistés ci-dessous)

/** Whitelist de collections accessibles aux templates */
const ALLOWED_COLLECTIONS = new Set<string>(["projects","prototypes"]);
/** Whitelist (très restrictive) d'opérateurs Mongo acceptés dans les filtres */
const ALLOWED_FILTER_OPS = new Set<string>([
  "$eq", "$ne", "$in", "$nin", "$gt", "$gte", "$lt", "$lte"
]);

/** Taille max pour limit (hard cap) */
const MAX_LIMIT = 200;

/* =========================
   Spécification Data du FM
   ========================= */

export interface DataItemSpec extends JSONObject {
  collection: string;           // doit être dans ALLOWED_COLLECTIONS
  filter?: FilterSpec;          // objet JSON "safe"
  sort?: SortSpec;              // { field: 1 | -1 }
  limit?: number;               // borne par MAX_LIMIT
  single?: boolean;             // findOne() si true
}

export interface TemplateAttributes {
  data?: Record<string, DataItemSpec>;
  layout?: string;
  cache?: { ttlSeconds?: number };
}

/* =========================
   Utilitaires typés & sûrs
   ========================= */

function isJSONObject(v: unknown): v is JSONObject {
  return typeof v === "object" && v !== null && Array.isArray(v) === false;
}

function isJSONArray(v: unknown): v is JSONArray {
  return Array.isArray(v);
}

/**
 * Remplace les chaînes contenant des placeholders Handlebars (ex: "{{params.username}}")
 * par leur valeur rendue avec le contexte fourni.
 * Renvoie le même "shape" que l'entrée (T).
 */
export function hydrateTemplateStrings<T extends JSONValue>(obj: T, ctx: TemplateCtx): T {
  if (typeof obj === "string") {
    const t = Handlebars.compile<TemplateCtx>(obj, { noEscape: true });
    return t(ctx) as unknown as T;
    }
  if (isJSONArray(obj)) {
    const arr = (obj as JSONArray).map(x => hydrateTemplateStrings(x, ctx)) as JSONArray;
    return arr as unknown as T;
  }
  if (isJSONObject(obj)) {
    const out: JSONObject = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) {
            continue; // on ignore les clés à valeur undefined
        }
        out[k] = hydrateTemplateStrings(v, ctx);
    }
    return out as unknown as T;
  }
  return obj;
}
/**
 * Sanitize d'un filtre JSON pour prévenir les opérateurs Mongo non autorisés.
 * - Retire toute clé commençant par "$" qui n'est pas whitelisted.
 * - Applique récursivement sur les objets.
 */
export function sanitizeFilter(input: JSONValue): FilterSpec {
  if (!isJSONObject(input)) return {};
  const out: JSONObject = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) {
      continue; // on ignore les clés à valeur undefined
    }
    if (k.startsWith("$")) {
      if (!ALLOWED_FILTER_OPS.has(k)) {
        // opérateur refusé → skip
        continue;
      }
      // opérateur accepté → recurse
      out[k] = isJSONObject(v) || isJSONArray(v) ? sanitizeFilter(v) : (v as JSONValue);
      continue;
    }
    // clé "normale"
    if (isJSONObject(v) || isJSONArray(v)) {
      out[k] = sanitizeFilter(v);
    } else {
      out[k] = v as JSONValue;
    }
  }
  return out;
}

/**
 * Sanitize du tri : garde uniquement 1 | -1, et coupe aux quelques premiers champs si besoin.
 */
export function sanitizeSort(input: unknown, maxFields = 5): SortSpec {
  const out: SortSpec = {};
  if (!input || typeof input !== "object") return out;
  let count = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (count >= maxFields) break;
    if (v === 1 || v === -1) {
      out[k] = v;
      count++;
    }
  }
  return out;
}

/**
 * Vérifie la collection contre la whitelist.
 */
function assertAllowedCollection(name: string): void {
  if (!ALLOWED_COLLECTIONS.has(name)) {
    throw new Error(`Collection non autorisée: "${name}"`);
  }
}

/* =========================
   Build du ViewModel (Mongo)
   ========================= */

export interface BuildViewModelOptions {
  /** Paramètres exposés au front-matter, ex: params.username */
  params?: Record<string, unknown>;
  /** Limite par défaut si non fournie */
  defaultLimit?: number;
}

/**
 * Construit le viewModel en exécutant les "data:" déclarés dans le front-matter.
 * - Hydrate les placeholders avec `params`
 * - Sanitize `filter` et `sort`
 * - Applique `limit` borné
 * - Exécute find()/findOne()
 */
export async function buildViewModel(
  db: Db,
  spec: TemplateAttributes | undefined,
  options: BuildViewModelOptions = {}
): Promise<Record<string, unknown>> {
  const model: Record<string, unknown> = {};
  const dataSpec = spec?.data ?? {};
  const params = options.params ?? {};
  const defaultLimit = Math.min(Math.max((options.defaultLimit ?? 50), 1), MAX_LIMIT);

  for (const [key, rawItem] of Object.entries(dataSpec)) {
    // 1) Hydrate placeholders (ex: "{{params.username}}")
    const hydrated = hydrateTemplateStrings<DataItemSpec>(rawItem as unknown as JSONValue as DataItemSpec, { params });

    // 2) Validation collection
    if (!hydrated?.collection || typeof hydrated.collection !== "string") {
      throw new Error(`DataSpec "${key}" : "collection" requis`);
    }
    assertAllowedCollection(hydrated.collection);

    // 3) Sanitize filter & sort
    const safeFilter = sanitizeFilter((hydrated.filter ?? {}) as unknown as JSONValue);
    const safeSort = sanitizeSort(hydrated.sort);

    // 4) Limit bornée
    const limit =
      Math.min(
        Math.max(typeof hydrated.limit === "number" ? hydrated.limit : defaultLimit, 1),
        MAX_LIMIT
      );

    // 5) Exécution Mongo
    const coll = db.collection<Document>(hydrated.collection);
    if (hydrated.single) {
      model[key] = await coll.findOne(safeFilter as Record<string, unknown>, { sort: safeSort as Record<string, SortDirection> });
    } else {
      console.log(hydrated.collection);
        let mongoCollection:Collection;
        switch (hydrated.collection) {
          case "projects":
            //console.log(key,await mongo.generic.getAll(safeFilter,mongo.projects.collection,"fr");
            
            model[key] = await mongo.generic.getAll(safeFilter,mongo.projects.collection,"fr")
            break;
          case "prototypes":
            //console.log(key,await mongo.generic.getAll(safeFilter,mongo.tables.collection,"fr");
            model[key] = await mongo.generic.getAll(safeFilter,mongo.tables.collection,"fr")
            break;
          case "objects":
            model[key] = await mongo.generic.getAll(safeFilter,mongo.objects.collection,"fr")
            break;
        }
        
        
      //model[key] = await coll.find(safeFilter as Record<string, unknown>)
      //  .sort(safeSort as Record<string, SortDirection>)
      //  .limit(limit)
      //  .toArray();
    }
  }

  // Métadonnées utiles (libre)
  model.meta = {
    params,
    generatedAt: new Date().toISOString(),
  };

  console.log("model",model);

  return model;
}