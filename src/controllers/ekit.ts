import { Request, Response } from "express";
import { mongo } from "../services/mongo";

// CUSTOM AUTH MANAGEMENT
export const ekit = {
    generic: {
        /**
         * 
         * @param req 
         * @param res 
         */
        getAll:async (req: Request, res: Response) => {    
            
            console.log("req.body",req.body);
            console.log("req.params.lang",req.params.lang);
            
            // LOAD PROJETS DE L'UTILISATEUR
            if (req.body.projectUID && req.body.tableUID && req.body.coordinates) {
                //LOAD PROPRIETES
                if (req.body.coordinates === "X") {
                    //const categories = await mongo.properties.getAll(req.body.projectUID, req.body.tableUID);
                    const properties = await mongo.properties.getAll(req.body.projectUID, [req.body.tableUID], req.params.lang);
                    // GET ALL ENUMS ids AND CATEGORIES TABLES IDs TO LOAD THEM
                    const enumsTablesIds = properties.filter(item => (item.body.ptype === "5912f82d4c3181110079e0a6"));
                    // LOAD CATEGORIES LINES VIA config.categid
                    const categoriesLines = await mongo.objects.getAll(req.body.projectUID, enumsTablesIds.map(item => { return item.config.categid }), req.params.lang);
                    res.json({ result:properties,categoriesLines:categoriesLines });
                }
                
                //LOAD OBJETS
                else {
                    //CORDINATE !== 
                    const datas = await mongo.objects.getAll(req.body.projectUID, [req.body.tableUID], req.params.lang);
                    res.json({ result:datas });
                }
            }
            //LOAD USER PROJECTS
            else if (req.body.projectsUIDs) {
                const projects = await mongo.projects.getAll(req.decoded._id, req.params.lang);
                console.log(projects);
                const mapedProjects = projects.map(item => ({
                    _id: item._id.toString(),
                    langs:item.langs,
                    name: item.body?.plib,
                    dateCreation: item.dateCreation
                }));
                res.json({ result:mapedProjects });
            }
            //LOAD PROJECT
            else if (req.body.projectUID) {
                const tables = await mongo.tables.getAll(req.body.projectUID, req.params.lang);
                res.json({ result:tables });
            }

        },
        save:async (req: Request, res: Response) => { 
            switch (req.params.repo) {
                case "projects":
                    await mongo.projects.save(req.decoded._id,req.body, req.params.lang);
                    break;
                case "prototypes":
                    await mongo.tables.save(req.decoded._id,req.body, req.params.lang);
                    break;
                case "properties":
                    await mongo.properties.save(req.decoded._id,req.body, req.params.lang);
                    break;
            } 
            res.json({ ok:true });
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
            }   
            res.json({ result:obj });
        }  
    }
}