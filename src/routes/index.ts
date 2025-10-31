import { Router } from "express";
import { middle } from "../middles/jwt";
import { auth } from "../controllers/auth";
import { ekit } from "../controllers/ekit";
import { templateRenderer } from "../controllers/templates/render";
import { templateFileManager } from "../controllers/templates/files-manager";

const router = Router();

/**
 * 
 * AUTH ROUTES
 * 
 */
/**
/**
 * @openapi
 * /api/auth/custom:
 *   post:
 *     summary: Custom authentification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - pass
 
 *             properties:
 *               login:
 *                 type: string
 *                 example: "test@test.test"
 *               pass:
 *                 type: string
 *                 example: password
 *     responses:
 *       200:
 *         description: Return user data and token if valid log/pass
 */
router.post('/auth/custom/login', auth.custom.log);
/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     summary: Google authentification
 *     responses:
 *       200:
 *         description: Return user data and token for new or exsting gauth user
 */
router.post('/auth/google',auth.google.log);

/** TEMPLATING RENDERING ROUTES
 * 
 * 
 * 
 */
router.get("/templates/render/:templateUID", templateRenderer.render);

router.get('/templates/render/static/:templateUID/*', templateRenderer.renderStatic);
  
//router.get('/templates/files', templateRenderer.create);
//router.post('/templates/files', templateRenderer.create);
//router.put('/templates/files', templateRenderer.create);
//router.delete('/templates/files', templateRenderer.create);

// MIDDLE TOKEN VERIFICATION
router.use(middle.checkTokenValidity);
// MIDDLE USER RULE VERIFICATION (READ/WRITE...)
router.use(middle.checkUserAccess);

/** TEMPLATING ROUTES
 * 
 * 
 * 
 */
router.get('/templates/create', templateRenderer.create);
//
router.get('/templates/tree/:templateUID', templateFileManager.getTree);
//
router.post('/templates/file/:templateUID', templateFileManager.getFile);
router.put('/templates/file/:templateUID', templateFileManager.updateFile);
/** EKIT ROUTES
 * 
 * 
 * 
 */
/**
 * @openapi
 * /api/datas/get:
 *   post:
 *     summary: Generic datas load to client
 *     responses:
 *       200:
 *         description: Return data from the generic mongodb data
 */
router.post('/datas/:lang', ekit.generic.getAll);
/**
 * @openapi
 * /api/{repo}/{lang}/{uid}:
 *   get:
 *      summary: Retrieve on record from the query key REPO/LANG/UID
 *      security:
 *          - bearerAuth: []
 *      description: >
 *          Retourne les données d’un objet spécifique à partir du dépôt indiqué,
 *          dans la langue choisie.  
 *          Cette route est utilisée pour récupérer dynamiquement les contenus selon un `repo`, une `lang` et un `uid`.
 *      parameters:
 *          - name: repo
 *            in: path
 *            required: true
 *            description: Nom du dépôt ou collection à interroger
 *            schema:
 *              type: string
 *              example: projects
 *          - name: lang
 *            in: path
 *            required: true
 *            description: Language à interroger
 *            schema:
 *              type: string
 *              example: fr
 *          - name: uid
 *            in: path
 *            required: true
 *            description: identifiant objet a récupérer
 *            schema:
 *              type: string
 *              example: xxxxxxxxxxxxxxxx (GUID mongoID)
 */
router.get('/:repo/:lang/:uid', ekit.generic.get);
router.post('/:repo/:lang', ekit.generic.save);
router.put('/:repo/:lang/:uid', ekit.generic.save);
router.delete('/:repo/:lang/:uid', ekit.generic.delete);
//
export default router;
