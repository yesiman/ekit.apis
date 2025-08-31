"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const router = express_1.default.Router();
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
passport_1.default.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = yield User.findOne({ email: profile.emails[0].value });
        if (user) {
            return done(null, user);
        }
        else {
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                profileImage: profile.photos[0].value,
                isVerified: true
            });
            yield user.save();
            return done(null, user);
        }
    }
    catch (error) {
        return done(error, null);
    }
})));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser((id, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User.findById(id);
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
}));
router.post('/google-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.body);
    const { token } = req.body;
    try {
        const ticket = yield client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const { name, email, picture } = ticket.getPayload();
        let user = yield User.findOne({ email });
        let isNewUser = false;
        if (!user) {
            user = new User({
                name,
                email,
                profileImage: picture,
                isVerified: true,
                role: 'user',
            });
            yield user.save();
            isNewUser = true;
        }
        const payload = { subject: user._id, email: user.email, userId: user._id };
        const jwtToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET);
        res.status(200).send({
            token: jwtToken,
            role: user.role,
            email: user.email,
            name: user.name,
            isVerified: user.isVerified,
            userId: user._id,
            isNewUser: isNewUser
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).send({ msg: 'Something went wrong' });
    }
}));
module.exports = router;
