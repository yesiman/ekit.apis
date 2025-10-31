import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { loadTemplateById } from "./template-loader";
import { buildViewModel } from "../../services/template-data-loader";
import { mongo } from "../../services/mongo";
import Handlebars from "handlebars";
import fs from "fs"; 
import fsp from 'fs/promises';
import path from "path";
import { config } from "dotenv";
import { env } from "../../config/env";
import { templateInitializer } from "../../services/template-initialize";
import { promisify } from "util";
export const templateRenderer = {
    stat:promisify(fs.stat),
    quote: async (tag:string) => 
        { return `"${tag}"`; },
    // Parse If-None-Match avec multiples valeurs et W/
    parseIfNoneMatch:async (header = '') => {
        return header.split(',').map(s => s.trim()).filter(Boolean);
    },
    safeJoin:async (base:string, target:string) => {
        const p = path.normalize(path.join(base, target));
        if (!p.startsWith(base)) throw new Error('Path traversal');
        return p;
    },
    isFingerprinted:async (filename:string) => {
        return /[\.\-_][0-9a-f]{8,}\./i.test(filename);
    },
    create:async (req: Request, res: Response, next:NextFunction) => {
        await templateInitializer.create("xxx");
    },
    readPartialsDir:async (dir:string) => {
        const out = new Map();
        if (!fs.existsSync(dir)) return out;
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.isFile() && e.name.endsWith('.hbs')) {
            const name = e.name.replace(/\.hbs$/, ''); // "header"
            const src = await fsp.readFile(path.join(dir, e.name), 'utf8');
            out.set(name, src);
            }
        }
        return out;
    },
    registerPartials:async (site:string) => {
        // évite de recharger si déjà en cache
        /*if (partialCache.has(site)) {
            const { files } = partialCache.get(site);
            // (Optionnel) tu peux re-register en cas de crash de l'instance
            for (const [name, src] of files) Handlebars.registerPartial(name, src);
            return;
        }*/

        //const sharedDir = path.join(TPL_ROOT, 'shared', 'partials');
        const siteDir   = path.join(env.TEMPLATES_LOCATION, site, 'partials');

        // shared d'abord…
        //const shared = await readPartialsDir(sharedDir);
        // …puis site qui override
        console.log("kmlklmklmklmkmkmlkmklmk");
        const siteParts = await templateRenderer.readPartialsDir(siteDir);
        for (const [k, v] of siteParts) {
            console.log(k,v);
            Handlebars.registerPartial(k,v);
        }

        // register dans Handlebars (un espace de noms global par process)
        /*for (const [name, src] of shared) {
            Handlebars.registerPartial(name, src); // usage: {{> header}} / {{> head}}
        }*/

        //partialCache.set(site, { files: shared, compiledAt: Date.now() });
    },
    render:async (req: Request, res: Response, next:NextFunction) => {    
        try {
            console.log("req.params",req.params);
              let { templateUID } = req.params;
              const preview = req.query.preview === "1"; // contrôle d’accès spécifique
              const params = JSON.parse(String(req.query.params || "{}"));
                
              // TODO: checkAuth(req) + checkTemplatePermission(templateId, preview)
        
              const spec = await loadTemplateById(templateUID);
                
              // Cache key = templateId + params + (preview ? "preview" : "live")
              const cacheKey = crypto.createHash("sha1")
                .update(templateUID + JSON.stringify(params) + (preview ? "p" : "l"))
                .digest("hex");
        
              // TODO: si tu as un Redis, essaye un GET cacheKey ici
        
              const viewModel = await buildViewModel(mongo.getDB(), spec.attributes, params);
        
              // Compile + render
              let template: Handlebars.TemplateDelegate;
              let layout:any;
        
                console.log(spec.body);
                try {
                    await templateRenderer.registerPartials(templateUID);    
                    template = Handlebars.compile(spec.body, {
                        noEscape: false,   // échappement par défaut
                    });
                    layout = Handlebars.compile(fs.readFileSync(path.join("src","_templates/"+templateUID, `layout.hbs`),'utf8'));

                } catch (e: any) {
                // Handlebars renvoie souvent line/column
                const line = e?.lineNumber ?? e?.line;
                const col  = e?.column;
                const reason = e?.message || String(e);
                return res
                    .status(400)
                    .send(`Erreur de compilation Handlebars dans "${templateUID}"${line ? ` (ligne ${line}${col ? `, col ${col}` : ""})` : ""} :\n${reason}`);
                }
                
              const html = template(
                { ...viewModel, _site: templateUID },
                { allowProtoPropertiesByDefault: false }
                );

              const wrapped = layout(
                { body: html, ...viewModel, _site: templateUID },
                { allowProtoPropertiesByDefault: false }
                );
            res.setHeader('Cache-Control', 'no-store');
            res.removeHeader('ETag');
            res.send(wrapped,);



              // TODO: setCache(cacheKey, html, ttl = spec.attributes?.cache?.ttlSeconds ?? 30)
              // ETag pour 304
            
            
              /*const strong = crypto.createHash('md5').update(html).digest('hex');
                const etagValue = await templateRenderer.quote(strong);          // ← important: guillemets
                res.setHeader('ETag', etagValue);
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');

                const inm = templateRenderer.parseIfNoneMatch(req.headers['if-none-match']);

                // Comparaison "strong" uniquement (ignore les W/)
                const match = (await inm).some(token => {
                    if (token.startsWith('W/')) token = token.slice(2);
                    return token === etagValue;
                });

                if (match) return res.status(304).end();*/
                
//return res.status(200).send(html);
                
                console.log("2spec.attributes",spec.attributes);
              // Layout support: si attributes.layout défini, utilise res.render(layout, ...)
              if (spec.attributes?.layout) {

                console.log("spec.attributes?.layout",spec.attributes?.layout);
                //return res.render(spec.attributes.layout, { body: html, ...viewModel });
              }
              
              //res.send(html);
            } catch (e) {
                console.log("ezezezezez",e);
                next(e);
            }
    },
    renderStatic:async (req: Request, res: Response) => {
        console.log("in renderStatic");
        try {
            const site = req.params.templateUID;
            const rel = req.params[0] || '';
            const base = path.join(env.TEMPLATES_LOCATION, site, 'assets');
            const filePath = await templateRenderer.safeJoin(base, rel);

            // Optionnel: contrôle d’accès si assets privés par tenant
            // if (!req.user || req.user.site !== site) return res.sendStatus(403);

            const st = await templateRenderer.stat(filePath); // 404 si absent
            if (!st.isFile()) return res.sendStatus(404);

            // Cache HTTP :
            //if (await templateRenderer.isFingerprinted(path.basename(filePath))) {
            // fichiers fingerprintés → cache long + immutable
            //res.set('Cache-Control', 'public, max-age=31536000, immutable');
            //} else {
            // assets non fingerprintés → cache court et revalidation possible
            //res.set('Cache-Control', 'public, max-age=300, must-revalidate');
            //}
            res.set('Cache-Control', 'no-cache');

            // ETag fort basé sur mtime+size (simple & efficace)
            const etag = `"${st.mtimeMs.toString(36)}-${st.size.toString(36)}"`;
            res.set('ETag', etag);

            // Validation conditionnelle GET/HEAD
            const inm = req.headers['if-none-match'];
            if ((req.method === 'GET' || req.method === 'HEAD') && inm && inm.split(',').map(s=>s.trim()).includes(etag)) {
            return res.status(304).end();
            }

            res.sendFile(filePath);
        } catch (e) {
            return res.sendStatus(404);
        }
    }

}