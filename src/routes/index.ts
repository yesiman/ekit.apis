import { Router } from "express";
import { middle } from "../middles/middle";
import { auth } from "../controllers/auth";
import { ekit } from "../controllers/ekit";

const router = Router();

// AUTH
router.post('/auth/custom/login', auth.custom.log);
// MIDDLE TOKEN VERIFICATION
router.use(middle.checkTokenValidity);
// GENERIC DATA METHOD
router.post('/datas/get', ekit.datas.getAll);

export default router;