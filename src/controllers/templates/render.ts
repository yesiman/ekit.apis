import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { loadTemplateById } from "./template-loader";
import { buildViewModel } from "../../services/template-data-loader";
import { mongo } from "../../services/mongo";
import Handlebars from "handlebars";
import fs from "fs/promises"; import path from "path";
import { config } from "dotenv";
import { env } from "../../config/env";
export const templateRenderer = {
    create:async (req: Request, res: Response, next:NextFunction) => {
        const tpl = (id:string)=>`
        ---
        data: {}
        layout: "layout"
        ---
        <h1>${id} works</h1>`;

        const root=env.TEMPLATES_LOCATION;
        const id="2"
        const dir = path.join(root, id);
        await fs.mkdir(path.join(dir, "partials"), { recursive: true });
        await fs.mkdir(path.join(dir, "assets/css"), { recursive: true });

        await fs.writeFile(path.join(dir, "template.hbs"), tpl(id), "utf8");
        await fs.writeFile(path.join(dir, "layout.hbs"),
        `<!doctype html><html><head><link rel="stylesheet" href="/render/static/${id}/assets/css/main.css"></head><body>{{{body}}}</body></html>`,
        "utf8");
        await fs.writeFile(path.join(dir, "partials/card.hbs"), `<div class="card">{{title}}</div>`, "utf8");
        await fs.writeFile(path.join(dir, "assets/css/main.css"), `body{font:14px/1.4 system-ui}`, "utf8");
        await fs.writeFile(path.join(dir, "meta.json"),
        JSON.stringify({ name:id, version:1, entry:"template.hbs", layout:"layout.hbs",
        partials:["partials/card.hbs"], assets:["assets/css/main.css"] }, null, 2), "utf8");
        
    },
    render:async (req: Request, res: Response, next:NextFunction) => {    
        try {
              const { templateId } = req.params;
              const preview = req.query.preview === "1"; // contrôle d’accès spécifique
              const params = JSON.parse(String(req.query.params || "{}"));
                
              // TODO: checkAuth(req) + checkTemplatePermission(templateId, preview)
        
              const spec = await loadTemplateById(templateId);
                
              // Cache key = templateId + params + (preview ? "preview" : "live")
              const cacheKey = crypto.createHash("sha1")
                .update(templateId + JSON.stringify(params) + (preview ? "p" : "l"))
                .digest("hex");
        
              // TODO: si tu as un Redis, essaye un GET cacheKey ici
        
              const viewModel = await buildViewModel(mongo.getDB(), spec.attributes, params);
        
              // Compile + render
              let template: Handlebars.TemplateDelegate;
        
                
                try {
                template = Handlebars.compile(spec.body, {
                    noEscape: false,   // échappement par défaut
                });
                } catch (e: any) {
                // Handlebars renvoie souvent line/column
                const line = e?.lineNumber ?? e?.line;
                const col  = e?.column;
                const reason = e?.message || String(e);
                return res
                    .status(400)
                    .send(`Erreur de compilation Handlebars dans "${templateId}"${line ? ` (ligne ${line}${col ? `, col ${col}` : ""})` : ""} :\n${reason}`);
                }
        
              console.log("template",template);
        
              const html = template(viewModel, { allowProtoPropertiesByDefault: false });
              // TODO: setCache(cacheKey, html, ttl = spec.attributes?.cache?.ttlSeconds ?? 30)
              // ETag pour 304
              const etag = crypto.createHash("md5").update(html).digest("hex");
              if (req.headers["if-none-match"] === etag) return res.status(304).end();
              res.setHeader("ETag", etag);
              res.setHeader("Content-Type", "text/html; charset=utf-8");
        
        
              // Layout support: si attributes.layout défini, utilise res.render(layout, ...)
              if (spec.attributes?.layout) {
                console.log("spec.attributes?.layout");
                return res.render(spec.attributes.layout, { body: html, ...viewModel });
              }
              
              res.send(html);
            } catch (e) {
                console.log("ezezezezez",e);
                next(e);
            }
    }
}