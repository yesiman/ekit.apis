import { Request, Response } from "express";
import { mongo } from "../modules/db/mongo";

// CUSTOM AUTH MANAGEMENT
export const ekit = {
    projects: {
        // LOAD PROJETS
        getAll:async (req: Request, res: Response) => {
            var aggParams = [];
            aggParams.push({$lookup: {
                from: "objects_langs",
                localField: "_id",    // field in the orders collection
                foreignField: "objectid",
                as: "body",
            }});
            aggParams.push({ "$unwind": "$body" });
            aggParams.push({ "$match": {"body.lang":"fr"} });            
            const projects = await mongo.projects.collection.aggregate(aggParams).toArray();
            const mapedProjects = projects.map(item => ({
                id: item._id.toString(),
                name: item.body?.plib,
                dateCreation: item.dateCreation
            }));

            res.json({ result:mapedProjects });
        }
    },
}