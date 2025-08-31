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
exports.binance = void 0;
const child_process_1 = require("child_process");
const Binance = require('binance-api-node').default;
const binanceCli = Binance({
    apiKey: process.env.BINANCE_APIKEY,
    apiSecret: process.env.BINANCE_APISECRET
});
exports.binance = {
    //DECODEAGE HASH ENVOYE PAR GOOGLE CONTENANT LES INFOS DE L'USER
    getPrices: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        let ret = yield binanceCli.prices();
        res.json({ ret: ret });
    }),
    getAccountInfos: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        let ret = yield binanceCli.accountInfo();
        res.json({ ret: ret });
    }),
    sendOrder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        //let ret = await binanceCli.accountInfo();
        console.log(req.body);
        let ret = yield binanceCli.order(req.body);
        console.log(ret);
        res.json({ ret: "klm" });
    }),
    startTradBot: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        //let ret = await binanceCli.accountInfo();
        console.log(req.body);
        //let ret = await binanceCli.order(req.body);
        //console.log(ret);
        //START PM2 PROCESS LINKED TO FB PARAMS 
        (0, child_process_1.exec)('sudo pm2 start ' + process.env.TRADBOT_SCRIPT + ' --name bot-' + req.body.tradeUID + ' -- ' + req.body.tradeUID);
        //console.log(`stdout: ${stdout}`);
        //console.log(`stderr: ${stderr}`);
        //});
        res.json({ ret: "klm" });
    }),
    stopTradBot: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        //let ret = await binanceCli.accountInfo();
        //let ret = await binanceCli.order(req.body);
        (0, child_process_1.exec)('sudo pm2 delete bot-' + req.body.tradeUID);
        //START PM2 PROCESS LINKED TO FB PARAMS 
        res.json({ ret: "klm" });
    }),
};
