import { Request, Response } from "express";
import { mongo } from "../services/mongo";
import { templateInitializer } from "../services/template-initialize";

// CUSTOM AUTH MANAGEMENT
export const ekit = {
    generic: {
        /**
         * 
         * @param req 
         * @param res 
         */
        getAll:async (req: Request, res: Response) => {    
            // LOAD PROJETS DE L'UTILISATEUR
            if (req.body.projectUID && req.body.tableUID && req.body.coordinates) {
                //LOAD PROPRIETES
                if (req.body.coordinates === "X") {
                    //const categories = await mongo.properties.getAll(req.body.projectUID, req.body.tableUID);
                    const properties = await mongo.properties.getAll(req.body.projectUID, [req.body.tableUID], req.params.lang);
                    // GET ALL ENUMS ids AND CATEGORIES TABLES IDs TO LOAD THEM
                    const enumsTablesIds = properties.filter(item => (item.body.ptype === "5912f82d4c3181110079e0a6"));
                    // LOAD CATEGORIES LINES VIA config.categid
                    const categoriesLines = await mongo.objects.getAll(req.body.projectUID, enumsTablesIds.map(item => { return item.config?.categid }), req.params.lang);
                    // LOAD LINKED PROTOTYPES TO GET title Col
                    let categoriesPrototypesTitles = [];
                    if (enumsTablesIds.length>0) {
                        categoriesPrototypesTitles = await mongo.properties.getTitleColumnsIds(req.body.projectUID, enumsTablesIds.map(item => { return item.config?.categid }), req.params.lang);
                    }
                    res.json({ result:properties,categoriesLines:categoriesLines,categoriesPrototypesTitles:categoriesPrototypesTitles });
                }
                //LOAD OBJETS
                else {
                    //CORDINATE !== 
                    const datas = await mongo.objects.getAll(req.body.projectUID, [req.body.tableUID], req.params.lang);
                    res.json({ result:datas });
                }
            }
            //LOAD PROJECT
            else if (req.body.projectUID) {
                const tables = await mongo.tables.getAll(req.body.projectUID, req.body.type, req.params.lang);
                res.json({ result:tables });
            }
            //LOAD USER PROJECTS
            else {
                const projects = await mongo.projects.getAll(req.decoded._id, req.params.lang);
                const mapedProjects = projects.map(item => ({
                    _id: item._id.toString(),
                    langs:item.langs,
                    defaultLang:item.defaultLang,
                    name: item.body?.plib,
                    dateCreation: item.dateCreation
                }));
                
                res.json({ result:mapedProjects });
                
            }
        },
        save:async (req: Request, res: Response) => { 
            let objUID:string = "";
            switch (req.params.repo) {
                case "projects":
                    objUID = await mongo.projects.save(req.decoded._id,req.body, req.params.lang);
                    break;
                case "prototypes":
                    //
                    objUID = await mongo.tables.save(req.decoded._id,req.body, req.params.lang);
                    //
                    if (req.body._id == "-1") {
                        await templateInitializer.create(objUID);
                    }
                    break;
                case "properties":
                    objUID = await mongo.properties.save(req.decoded._id,req.body, req.params.lang);
                    break;
                case "objects":
                    objUID = await mongo.objects.save(req.decoded._id,req.body, req.params.lang);
                    break;
            } 
            res.json({ ok:objUID });
        },
        delete:async (req: Request, res: Response) => { 
            let obj = {};
            switch (req.params.repo) {
                case "projects":
                    //obj = await mongo.projects.delete(req.decoded._id,req.body, req.params.lang);
                    break;
                case "prototypes":
                    //obj = await mongo.tables.save(req.decoded._id,req.body, req.params.lang);
                    break;
                case "properties":
                    //obj = await mongo.properties.save(req.decoded._id,req.body, req.params.lang);
                    break;
                case "objects":
                    await mongo.objects.delete(req.params.uid);
                    break;
            } 
            res.json({ ok:obj });
        },
        get:async (req: Request, res: Response) => {  
            let obj = {};
            switch (req.params.repo) {
                case "projects":
                    obj = await mongo.generic.get(req.params.uid,mongo.projects.collection,req.params.lang);
                    break;
                case "prototypes":
                    obj = await mongo.generic.get(req.params.uid,mongo.tables.collection,req.params.lang);
                    break;
                case "properties":
                    obj = await mongo.generic.get(req.params.uid,mongo.properties.collection,req.params.lang);
                    break;
                case "objects":
                    obj = await mongo.generic.get(req.params.uid,mongo.objects.collection,req.params.lang);
                    break;

            }
            res.json({ result:obj });

        }  
    }
}