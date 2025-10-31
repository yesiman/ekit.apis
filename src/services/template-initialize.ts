import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import Handlebars from "handlebars";
import fs from "fs/promises"; 
import path from "path";
import { config } from "dotenv";
import { env } from "../config/env";

export const templateInitializer = {
    create:async (uid:string) => {
        const tpl = (id:string)=>`
        ---
        data: {}
        layout: "layout"
        ---
        <h1>${id} works</h1>`;

        const root=env.TEMPLATES_LOCATION;
        const id=uid.toString();
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
        
    }
}