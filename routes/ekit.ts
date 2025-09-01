import { Request, Response } from "express";
import { mongo } from "../modules/db/mongo";

// CUSTOM AUTH MANAGEMENT
export const ekit = {
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
            const props = await mongo.properties.getAll(req.body.tableUID);
            // .collection.aggregate(aggParams).toArray();
            
            res.json({ result:props });
        }
    },
    tables: {
        // LOAD PROJETS
        getAll:async (req: Request, res: Response) => {    
            console.log("getAllTables");
            
            const tables = await mongo.tables.getAll(req.body.tableUID);
            console.log(tables);

            res.json({ result:tables });
        }
    },
}