// src/files/fsTree.ts
import { promises as fs } from "fs";
import * as path from "path";

export type NodeKind = "file" | "folder";

export interface FsNodeBase {
  kind: NodeKind;
  name: string;           // ex: "main.hbs"
  path: string;           // chemin relatif depuis root, ex: "partials/card.hbs"
  mtimeMs: number;        // timestamp modif
}

export interface FsFileNode extends FsNodeBase {
  kind: "file";
  size: number;           // en octets
  ext: string;            // ex: ".hbs"
  content?: string;       // si includeContent=true et fichier "texte"
}

export interface FsFolderNode extends FsNodeBase {
  kind: "folder";
  children: Array<FsFolderNode | FsFileNode>;
}

export type FsNode = FsFolderNode | FsFileNode;

export interface ReadTreeOptions {
  /** Inclure le contenu des fichiers (texte) jusqu’à maxFileSizeBytes */
  includeContent?: boolean;
  /** Extensions de texte autorisées (pour le content) */
  textExts?: string[];     // ex: [".hbs", ".html", ".css", ".js", ".json", ".md", ".yml", ".yaml"]
  /** Taille max d’un fichier lu (par sécurité) */
  maxFileSizeBytes?: number; // ex: 256 * 1024
  /** Profondeur max (0 = uniquement le dossier courant) */
  maxDepth?: number;         // ex: 20
  /** Patterns à ignorer (nom dossier/fichier) */
  ignoreNames?: string[];    // ex: [".git", "node_modules", ".DS_Store"]
}

/**
 * Lit un répertoire (rootDir) récursivement et renvoie un arbre FsNode.
 * - Sécurisé contre les traversals: toutes les résolutions restent sous rootDir.
 */
export async function readDirectoryTree(
  rootDir: string,
  options: ReadTreeOptions = {}
): Promise<FsFolderNode> {
  const {
    includeContent = false,
    textExts = [".hbs", ".html", ".css", ".js", ".ts", ".json", ".md", ".yml", ".yaml"],
    maxFileSizeBytes = 256 * 1024,
    maxDepth = 20,
    ignoreNames = [".git", "node_modules", ".DS_Store"],
  } = options;
  const rootAbs = path.resolve(rootDir);

  async function walk(dirAbs: string, rel: string, depth: number): Promise<FsFolderNode> {
    // safety: depth
    if (depth > maxDepth) {
      return {
        kind: "folder",
        name: path.basename(dirAbs),
        path: rel,
        mtimeMs: (await fs.stat(dirAbs)).mtimeMs,
        children: [],
      };
    }

    const dirents = await fs.readdir(dirAbs, { withFileTypes: true });
    const children: FsNode[] = [];

    for (const d of dirents) {
      if (ignoreNames.includes(d.name)) continue;

      const childAbs = path.resolve(dirAbs, d.name);
      // safety: stay under root
      if (!childAbs.startsWith(rootAbs + path.sep) && childAbs !== rootAbs) continue;

      const childRel = rel ? path.posix.join(rel, d.name) : d.name;

      try {
        const st = await fs.stat(childAbs);
        if (d.isDirectory()) {
          const folderNode = await walk(childAbs, childRel, depth + 1);
          // mtime du dossier courant (depuis stat)
          folderNode.mtimeMs = st.mtimeMs;
          children.push(folderNode);
        } else if (d.isFile()) {
          const ext = path.extname(d.name).toLowerCase();
          const fileNode: FsFileNode = {
            kind: "file",
            name: d.name,
            path: childRel.replace(/\\/g, "/"),
            mtimeMs: st.mtimeMs,
            size: st.size,
            ext,
          };

          if (
            includeContent &&
            st.size <= maxFileSizeBytes &&
            textExts.includes(ext)
          ) {
            const buf = await fs.readFile(childAbs);
            // tentative d’interprétation UTF-8 (simple et efficace pour nos types)
            fileNode.content = buf.toString("utf8");
          }

          children.push(fileNode);
        } else {
          // ignore symlinks/others
        }
      } catch {
        // ignore erreurs locales (permissions, fichiers temp)
      }
    }

    return {
      kind: "folder",
      name: path.basename(dirAbs),
      path: rel,
      mtimeMs: (await fs.stat(dirAbs)).mtimeMs,
      children: children.sort(sortNodes),
    };
  }

  function sortNodes(a: FsNode, b: FsNode) {
    // Dossiers d’abord, puis fichiers, alphabétique
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  }

  // point d’entrée
  return walk(rootAbs, "", 0);
}
