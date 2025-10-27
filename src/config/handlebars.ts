import { Express } from "express";
import { engine } from "express-handlebars";
import "./handlebars-helpers"
import Handlebars from "handlebars";


export function setupHandleBars(app: Express) {
    app.engine("hbs", engine({
    extname: ".hbs",
    handlebars: Handlebars,
    // layoutsDir/partialsDir si tu en utilises
    }));
    app.set("view engine", "hbs");
    app.set("views", "views"); // /views/templates, /views/layouts, /views/partials
}