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
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
var redisC = require("redis");
var cache = redisC.createClient();
cache.connect();
exports.redis = {
    saveHistory: (ownerUID, history) => __awaiter(void 0, void 0, void 0, function* () {
        yield cache.set("histo_" + ownerUID, JSON.stringify(history));
    }),
    loadHistory: (ownerUID) => __awaiter(void 0, void 0, void 0, function* () {
        return JSON.parse(yield cache.get("histo_" + ownerUID));
    }),
    saveSocket: (iocli) => __awaiter(void 0, void 0, void 0, function* () {
        //STOCKE LE SOCKET LIES A UN USER
        cache.set(iocli.ownerUID, iocli.ioSocketId);
    }),
    getSockets: (ownerUID) => __awaiter(void 0, void 0, void 0, function* () {
        //RECUPE DES SOCKETS LIES A UN USER
        return yield cache.get(ownerUID);
    }),
};
