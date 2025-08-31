var redisC = require("redis");
var cache = redisC.createClient();
cache.connect();
export const redis = {
    saveHistory:async (ownerUID:string,history:any) => {
        await cache.set("histo_"+ownerUID,JSON.stringify(history));
    },
    loadHistory:async (ownerUID:string) => {
        return JSON.parse(await cache.get("histo_"+ownerUID));
    },
    saveSocket:async (iocli:any) => {
        //STOCKE LE SOCKET LIES A UN USER
        cache.set(iocli.ownerUID,iocli.ioSocketId);
    },
    getSockets:async (ownerUID:string) => {
        //RECUPE DES SOCKETS LIES A UN USER
        return await cache.get(ownerUID);
    },
}