import Handlebars from "handlebars";
import { format } from "date-fns";

Handlebars.registerHelper("formatDate", (iso: string, fmt = "yyyy-MM-dd") =>
  iso ? format(new Date(iso), fmt) : "");

Handlebars.registerHelper("truncate", (s: string, n = 160) =>
  typeof s === "string" ? (s.length > n ? s.slice(0, n) + "…" : s) : s);

Handlebars.registerHelper("eq", (a: any, b: any) => a === b);
Handlebars.registerHelper("and", (a: any, b: any) => a && b);
Handlebars.registerHelper("or", (a: any, b: any) => a || b);

// Block helper simple
Handlebars.registerHelper("list", function(items: any[], options: any) {
  return (items || []).map(item => options.fn(item)).join("");
});