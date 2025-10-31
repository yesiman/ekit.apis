import fs from "fs/promises";
import path from "path";
import fm from "front-matter";
import Handlebars from "handlebars";

export type TemplateSpec = {
  attributes: any;    // { data, layout, cache, ... }
  body: string;       // Handlebars source
};

export async function loadTemplateById(templateId: string): Promise<TemplateSpec> {
  const file = path.join(process.cwd(), "src","_templates/"+templateId, `template.hbs`);

  const raw = await fs.readFile(file, "utf8");
  const parsed = fm<any>(raw);

  return { attributes: parsed.attributes || {}, body: parsed.body || "" };
}