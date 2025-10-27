import { NextFunction, Request, Response } from "express";
import { readDirectoryTree } from "../../services/template-tree-loader";
import { env } from "process";
import crypto from "crypto";
import fs from "fs/promises"; import path from "path";


export const templateFileManager = {
    getTree:async (req: Request, res: Response) => {    
        const tree = await readDirectoryTree(env.TEMPLATES_LOCATION+"/2/")
        res.json({ tree:tree });
    },
    getFile:async (req: Request, res: Response) => {    
        //const relPath = (req.query.path || "").toString();
        try {
            //if (!relPath) return res.status(400).json({ error: "Missing path" });
            //if (!isAllowedFile(relPath)) return res.status(403).json({ error: "Extension not allowed" });

            //const fullPath = safeJoin(BASE_DIR, relPath);
            // Vérif existence + type
            let fullPath = env.TEMPLATES_LOCATION + "/2/"+req.body.path;
            const stat = await fs.stat(fullPath);
            if (!stat.isFile()) return res.status(400).json({ error: "Not a file" });

            // Lecture texte UTF-8 (important pour le code)
            const content = await fs.readFile(fullPath, "utf8");

            // Headers sécurisés + type texte
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.setHeader("X-Content-Type-Options", "nosniff");

            // Option: ETag simple
            // res.setHeader("ETag", `"${stat.size}-${stat.mtimeMs}"`);
            res.json({ content:content });
        } catch (err) {
            res.status(400).json({ error: "Cannot read file" });
        }
        
        
        console.log(req.body.path);
        
    },
    updateFile:async (req: Request, res: Response) => {    
        console.log("kmlkmlk",req.body);
        try {
            const { path, content, version } = req.body ?? {};
            if (!path || typeof content !== "string") {
            return res.status(400).json({ error: "path_and_content_required" });
            }

            console.log("path",path);
            console.log("path",content);

            let fullPath = env.TEMPLATES_LOCATION + "/2/"+path;
            //const abs = safeJoin(BASE_DIR, rel);
            console.log("fullPath",fullPath);
            //const ext = path.extname(fullPath).toLowerCase();
            //if (!ALLOWED_EXT.has(ext)) return res.status(400).json({ error: "extension_not_allowed" });
            //console.log("ext",ext);
            const buf = Buffer.from(content, "utf8");
            //if (buf.byteLength > MAX_SIZE) return res.status(413).json({ error: "too_large" });

            // Concurrency: If-Match header ou version dans body
            const ifMatch = (req.headers["if-match"] as string | undefined) ?? version;
            const exists = await statOrNull(fullPath);
            console.log("exists",exists);
            if (exists && exists.isFile()) {
            const current = await fs.readFile(fullPath);
            const currentEtag = `"${sha256(current)}"`;
            if (ifMatch && ifMatch !== currentEtag) {
                return res.status(409).json({ error: "version_conflict", currentVersion: currentEtag });
            }
            } else {
            // Crée le dossier si besoin
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            }

            // Écriture atomique: write temp → rename
            const tmp = fullPath + ".tmp-" + Date.now();
            console.log("tmp",tmp);
            await fs.writeFile(tmp, buf, { encoding: "utf8" });
            await fs.rename(tmp, fullPath);
            console.log(tmp,fullPath);
            const st = await fs.stat(fullPath);
            const etag = `"${sha256(buf)}"`;

            res.setHeader("ETag", etag);
            res.status(200).json({
                path: fullPath,
                size: st.size,
                mtimeMs: st.mtimeMs,
                version: etag,
            });
        } catch (e: any) {
            const msg = e?.message === "PATH_OUTSIDE_BASE" ? "invalid_path" : "server_error";
            res.status(msg === "invalid_path" ? 400 : 500).json({ error: msg });
        }


        
    }
}

// Helpers
function safeJoin(base: string, rel: string) {
  const p = path.resolve(base, rel.replace(/^(\.|\/)+/, "")); // strip "./" etc.
  if (!p.startsWith(base + path.sep) && p !== base) throw new Error("PATH_OUTSIDE_BASE");
  return p;
}
function sha256(buf: Buffer | string) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
async function statOrNull(p: string) {
  try { return await fs.stat(p); } catch { return null; }
}
