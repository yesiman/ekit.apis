"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middle_1 = require("../middles/middle");
const auth_1 = require("../controllers/auth");
const ekit_1 = require("../controllers/ekit");
const router = (0, express_1.Router)();
// AUTH
router.post('/auth/custom/login', auth_1.auth.custom.log);
// MIDDLE TOKEN VERIFICATION
router.use(middle_1.middle.checkTokenValidity);
// GENERIC DATA METHOD
router.post('/datas/get', ekit_1.ekit.datas.getAll);
exports.default = router;
