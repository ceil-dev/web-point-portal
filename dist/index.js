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
exports.createWebPointEther = exports.DEFAULT_WEBPOINT_URL = exports.createWebPointPortal = void 0;
const portals_1 = require("@ceil-dev/portals");
const WEBPOINT_REG_RESPONSE_CODES = {
    '-1': 'Max retries reached',
    0: 'Public ID already existst',
    1: 'Wrong format public ID (must be UUID?)',
};
const createWebPointPortal = ({ fetchMethod, env, middleware, createAbortController, webPointUrl, privateWebPointID, onObtainedPrivateID, }) => {
    return (0, portals_1.createPortal)(env, [
        middleware,
        (0, exports.createWebPointEther)({
            fetchMethod,
            createAbortController,
            webPointUrl,
            privateWebPointID,
            onObtainedPrivateID,
        }),
    ]);
};
exports.createWebPointPortal = createWebPointPortal;
exports.DEFAULT_WEBPOINT_URL = 'https://webpoint.ceil.dev/';
const createWebPointEther = ({ fetchMethod, webPointUrl = exports.DEFAULT_WEBPOINT_URL, createAbortController, privateWebPointID, onObtainedPrivateID, }) => {
    let isAttached = false;
    let dispatchData = {};
    let abortController;
    let failsCount = 0;
    let numActiveReqs = 0;
    const start = (_a) => __awaiter(void 0, [_a], void 0, function* ({ id, portal }) {
        const send = () => __awaiter(void 0, void 0, void 0, function* () {
            let fetchRes;
            const lastDispatchData = Object.values(dispatchData)[0];
            abortController = createAbortController === null || createAbortController === void 0 ? void 0 : createAbortController();
            numActiveReqs++;
            try {
                fetchRes = yield fetchMethod(webPointUrl, {
                    redirect: 'error',
                    method: 'POST',
                    body: JSON.stringify({
                        from: privateWebPointID,
                        to: lastDispatchData === null || lastDispatchData === void 0 ? void 0 : lastDispatchData.recipient,
                        payload: lastDispatchData === null || lastDispatchData === void 0 ? void 0 : lastDispatchData.payload,
                    }),
                    keepalive: true,
                    signal: abortController === null || abortController === void 0 ? void 0 : abortController.signal,
                });
            }
            catch (e) {
                console.warn((e === null || e === void 0 ? void 0 : e['message']) || e);
            }
            if (!isAttached)
                return;
            numActiveReqs--;
            abortController = undefined;
            const retry = (pause) => __awaiter(void 0, void 0, void 0, function* () {
                pause && (yield new Promise((resolve) => setTimeout(resolve, pause)));
                send().catch();
                return;
            });
            if (!(fetchRes === null || fetchRes === void 0 ? void 0 : fetchRes.ok)) {
                failsCount++;
                retry(0 + failsCount * failsCount * 100).catch();
                return;
            }
            const result = yield fetchRes.text();
            if (lastDispatchData === Object.values(dispatchData)[0]) {
                delete dispatchData[Object.keys(dispatchData)[0]];
            }
            if (result) {
                try {
                    if (typeof result !== 'string')
                        throw 'webpoint call result is not string';
                    const payloads = JSON.parse(result);
                    if (!Array.isArray(payloads))
                        throw 'webpoint call result is not json array';
                    for (const p of payloads) {
                        portal('receive', p);
                    }
                    failsCount = 0;
                }
                catch (e) {
                    failsCount++;
                    retry(0 + failsCount * failsCount * 100).catch(console.warn);
                    return;
                }
            }
            retry(500).catch(console.warn);
        });
        send().catch(console.warn);
    });
    let id;
    const etherAttachSupplier = (data, scope) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (isAttached) {
            console.warn('etherAttachSupplier: tried to attach, but is already attached');
            return;
        }
        isAttached = true;
        id = data.id;
        const { getSupplierTypes, demand } = scope;
        const persistence = getSupplierTypes().includes('persistence')
            ? demand({ type: 'persistence' })
            : undefined;
        if (!privateWebPointID)
            privateWebPointID = (_a = (yield (persistence === null || persistence === void 0 ? void 0 : persistence.get({ key: id + '_webPointID' })))) === null || _a === void 0 ? void 0 : _a.value;
        if (!privateWebPointID) {
            let numAttempts = 0;
            while (numAttempts++ < 10) {
                try {
                    const res = yield fetchMethod(webPointUrl, {
                        method: 'POST',
                        body: JSON.stringify({ ['jf9384jFn3rjw*fcn']: id }),
                    });
                    if (!isAttached)
                        return;
                    const _id = (yield res.text());
                    if (!res.ok || !_id)
                        throw 'Unsuccessfull';
                    privateWebPointID = _id;
                    if ((privateWebPointID === null || privateWebPointID === void 0 ? void 0 : privateWebPointID.length) === 1)
                        break;
                    yield (persistence === null || persistence === void 0 ? void 0 : persistence.set({
                        key: id + '_webPointID',
                        value: privateWebPointID,
                    }));
                    onObtainedPrivateID === null || onObtainedPrivateID === void 0 ? void 0 : onObtainedPrivateID(privateWebPointID);
                    break;
                }
                catch (e) {
                    if (!isAttached)
                        return;
                    yield new Promise((res) => setTimeout(res, 100 * numAttempts * numAttempts));
                }
            }
        }
        if (((privateWebPointID === null || privateWebPointID === void 0 ? void 0 : privateWebPointID.length) || 0) <= 1) {
            if (!privateWebPointID)
                privateWebPointID = '-1';
            console.error(`WebPoint Ether: Could not get a private ID. Code: ${privateWebPointID}(${WEBPOINT_REG_RESPONSE_CODES[privateWebPointID]}). Returning nothing.`);
            return;
        }
        setTimeout(() => start(data, scope), 100);
    });
    const etherSendSupplier = (data, scope) => __awaiter(void 0, void 0, void 0, function* () {
        const { id, payload } = data;
        if (payload.recipient)
            dispatchData[payload.recipient] = payload;
        try {
            abortController === null || abortController === void 0 ? void 0 : abortController.abort();
        }
        catch (e) {
            console.warn(e);
        }
    });
    const etherDetachSupplier = () => {
        isAttached = false;
        abortController === null || abortController === void 0 ? void 0 : abortController.abort();
    };
    return {
        'ether.attach': etherAttachSupplier,
        'ether.send': etherSendSupplier,
        'ether.detach': etherDetachSupplier,
    };
};
exports.createWebPointEther = createWebPointEther;
//# sourceMappingURL=index.js.map