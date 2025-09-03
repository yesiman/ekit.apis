import { Request, Response } from "express";
import { mongo } from "../modules/db/mongo";

// CUSTOM AUTH MANAGEMENT
export const ekit = {
    datas: {
        getAll:async (req: Request, res: Response) => {    
            
            console.log("req.body",req.body);
            // LOAD PROJETS DE L'UTILISATEUR
            if (req.body.projectUID && req.body.tableUID && req.body.coordinates) {
                //LOAD PROPRIETES
                if (req.body.coordinates === "X") {
                    const properties = await mongo.properties.getAll(req.body.projectUID, req.body.tableUID);
                    res.json({ result:properties });
                }
                
                //LOAD OBJETS
                else {
                    //CORDINATE !== 
                    console.log(req.body.coordinates);
                    const datas = await mongo.objects.getAll(req.body.projectUID, req.body.tableUID);
                    res.json({ result:datas });

                }
            }
            //LOAD USER PROJECTS
            else if (req.body.projectsUIDs) {
                const projects = await mongo.projects.getAll(req.body.projectsUIDs);
                const mapedProjects = projects.map(item => ({
                    id: item._id.toString(),
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
        // LOAD PROJETS
        getAll:async (req: Request, res: Response) => {    
            const projects = await mongo.projects.getAll(req.body.networks);
            // .collection.aggregate(aggParams).toArray();
            const mapedProjects = projects.map(item => ({
                id: item._id.toString(),
                name: item.body?.plib,

                dateCreation: item.dateCreation
            }));
            res.json({ result:mapedProjects });
        }
    },
    properties: {
        // LOAD PROJETS
        getAll:async (req: Request, res: Response) => {    
            //const props = await mongo.properties.getAll(req.body.tableUID);
            res.json({ result:[] });
        }
    },
    tables: {
        // LOAD PROJETS
        getAll:async (req: Request, res: Response) => {    
            console.log("getAllTables");
            const tables = await mongo.tables.getAll(req.body.projectUID);
            res.json({ result:tables });
        }
    },
}