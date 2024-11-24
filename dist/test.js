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
const node_fetch_1 = require("node-fetch");
const portals_1 = require("@ceil-dev/portals");
const persistence_1 = require("@ceil-dev/persistence");
const fs = require("node:fs");
const persistenceSupplier = (0, persistence_1.createPersistenceSupplier)({
    defaultData: {},
    id: 'test',
    levels: {
        default: (0, persistence_1.createRuntimeLevel)({ next: { level: 'fs' } }),
        fs: (0, persistence_1.createFileSystemLevel)({ fs, folderPath: './tmp/', prefix: 'fs_' }),
    },
});
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const portalA = (0, index_1.createWebPointPortal)({
        env: (0, portals_1.microEnv)({ foo: 'bar' }, { id: 'test_portalA' }, {
            set: ({ key, value }) => {
                console.log('portalA.env.set:', key, value);
            },
        }),
        fetchMethod: node_fetch_1.default,
        createAbortController: () => new AbortController(),
        middleware: {},
    });
    const portalB = (0, index_1.createWebPointPortal)({
        env: (0, portals_1.microEnv)({ foo: 'not bar' }, { id: 'test_portalB' }),
        fetchMethod: node_fetch_1.default,
        createAbortController: () => new AbortController(),
        middleware: {},
    });
    console.log('>>>>>>>>>>');
    yield portalB('open');
    const envB = yield portalA('enter', 'test_portalB');
    console.log('>>>>>>>>>>', envB.descriptor);
    console.log('>>>>>>>>>>', yield envB.face.foo);
    yield new Promise((resolve) => setTimeout(resolve, 1000));
    envB.face.foo = 69;
    console.log('>>>>>>>>>>', yield envB.face.foo);
    envB.face.foo = 420;
    console.log('>>>>>>>>>>', yield envB.face.foo);
    envB.face.foo = 'bar';
    console.log('>>>>>>>>>>', yield envB.face.foo);
});
const run2 = () => __awaiter(void 0, void 0, void 0, function* () {
    const portalA = (0, index_1.createWebPointPortal)({
        fetchMethod: node_fetch_1.default,
        env: (0, portals_1.microEnv)({}, { id: '__portalA' }),
        middleware: {
            persistence: persistenceSupplier,
        },
    });
    console.log('>>>>>>>>>>');
    const env = yield portalA('enter', '59ad65ed-f7c1-4f8f-aed8-88ce9bee42a7');
    console.log('>>>>>>>>>>', env.descriptor);
    let num = 0;
    while (num++ < 3) {
        yield env.face.message('h' + 'm'.repeat(num) + '!');
        yield new Promise((resolve) => setTimeout(resolve, 3000));
    }
});
run().catch(console.warn);
//# sourceMappingURL=test.js.map