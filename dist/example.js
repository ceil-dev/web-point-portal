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
const index_1 = require("./index");
const portals_1 = require("@ceil-dev/portals");
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const envA = (0, portals_1.microEnv)({ foo: 'bar' }, { id: (0, portals_1.randomUUID)() }, {
        set: (props) => {
            console.log('portalA: env.set called with:', props);
        },
    });
    const portalA = (0, index_1.createWebPointPortal)({
        env: envA,
        fetchMethod: fetch,
        createAbortController: () => new AbortController(),
        middleware: {},
    });
    const envB_id = (0, portals_1.randomUUID)();
    const portalB = (0, index_1.createWebPointPortal)({
        env: (0, portals_1.microEnv)({ foo: 'baz' }, { id: envB_id }),
        fetchMethod: fetch,
        createAbortController: () => new AbortController(),
        middleware: {},
    });
    yield portalB('open');
    const remoteEnv = yield portalA('enter', envB_id);
    console.log('Remote environment descriptor:', remoteEnv.descriptor);
    console.log('Remote value "foo":', yield remoteEnv.face.foo);
    remoteEnv.face.foo = 68;
    console.log('Remote value "foo" after settings to 68:', yield remoteEnv.face.foo);
    remoteEnv.face.foo = 419;
    console.log('Remote value "foo" after settings to 419:', yield remoteEnv.face.foo);
    remoteEnv.face.foo = 'not bar';
    console.log('Remote value "foo" after settings to "not bar":', yield remoteEnv.face.foo);
    try {
        process.exit(0);
    }
    catch (e) { }
});
run().catch(console.warn);
//# sourceMappingURL=example.js.map