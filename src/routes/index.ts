import { Router } from "express";
import { middle } from "../middles/jwt";
import { auth } from "../controllers/auth";
import { ekit } from "../controllers/ekit";

const router = Router();

// AUTH
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
// MIDDLE TOKEN VERIFICATION
router.use(middle.checkTokenValidity);
// GENERIC DATA METHOD
/**
 * @openapi
 * /api//datas/get:
 *   post:
 *     summary: Generic datas load to client
 *     responses:
 *       200:
 *         description: Return data from the generic mongodb data
 */
router.post('/datas/:lang', ekit.generic.getAll);
//

router.get('/:repo/:lang/:uid', ekit.generic.get);
router.post('/:repo/:lang', ekit.generic.save);
router.put('/:repo/:lang/:uid', ekit.generic.save);
//
export default router;