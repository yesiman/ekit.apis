import { Request, Response } from "express";
import { mongo } from "../services/mongo";

// CUSTOM AUTH MANAGEMENT
export const ekit = {
    datas: {
        getAll:async (req: Request, res: Response) => {    
            
            console.log("req.body",req.body);
            // LOAD PROJETS DE L'UTILISATEUR
            if (req.body.projectUID && req.body.tableUID && req.body.coordinates) {
                //LOAD PROPRIETES
                if (req.body.coordinates === "X") {
                    //const categories = await mongo.properties.getAll(req.body.projectUID, req.body.tableUID);
                    const properties = await mongo.properties.getAll(req.body.projectUID, [req.body.tableUID]);
                    // GET ALL ENUMS ids AND CATEGORIES TABLES IDs TO LOAD THEM
                    const enumsTablesIds = properties.filter(item => (item.body.ptype === "5912f82d4c3181110079e0a6"));
                    // LOAD CATEGORIES LINES VIA config.categid
                    const categoriesLines = await mongo.objects.getAll(req.body.projectUID, enumsTablesIds.map(item => { return item.config.categid }));
                    res.json({ result:properties,categoriesLines:categoriesLines });
                }
                //LOAD OBJETS
                else {
                    //CORDINATE !== 
                    const datas = await mongo.objects.getAll(req.body.projectUID, [req.body.tableUID]);
                    res.json({ result:datas });
                }
            }
            //LOAD USER PROJECTS
            else if (req.body.projectsUIDs) {
                const projects = await mongo.projects.getAll(req.decoded._id);
                console.log(projects);
                const mapedProjects = projects.map(item => ({
                    id: item._id.toString(),
                    langs:item.langs,
                    name: item.body?.plib,
                    dateCreation: item.dateCreation
                }));
                res.json({ result:mapedProjects });
            }
            //LOAD PROJECT
            else if (req.body.projectUID) {
                const tables = await mongo.tables.getAll(req.body.projectUID);
                res.json({ result:tables });
            }

        }
    },
    projects: {
        save:async (req: Request, res: Response) => {    
            await mongo.projects.save(req.decoded._id,req.body);
            res.json({ ok:true });
            //mongo.projects.save();
        },
        get:async (req: Request, res: Response) => {    
            const obj = await mongo.projects.get(req.params.uid);
            res.json({ result:obj });
            //mongo.projects.save();
        }  
    }
}