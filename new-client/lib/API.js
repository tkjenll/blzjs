"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _query;
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = void 0;
const CommunicationService_1 = require("./services/CommunicationService");
const lodash_1 = require("lodash");
const Assert_1 = require("./Assert");
const cosmosjs = require('@cosmostation/cosmosjs');
const fetch = require('node-fetch');
const BLOCK_TIME_IN_SECONDS = 5;
class API {
    constructor(config) {
        this.account = () => this.cosmos.getAccounts(this.address)
            .then((x) => x.result.value);
        this.count = () => __classPrivateFieldGet(this, _query).call(this, `crud/count/${this.uuid}`)
            .then((res) => parseInt(res.count || '0'));
        this.delete = (key, gasInfo) => this.communicationService.sendMessage({
            type: 'crud/delete',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => ({ height: res.height, txhash: res.txhash }));
        this.deleteAll = (gasInfo) => this.communicationService.sendMessage({
            type: 'crud/deleteall',
            value: {
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => ({ height: res.height, txhash: res.txhash }));
        this.getLease = (key) => __classPrivateFieldGet(this, _query).call(this, `crud/getlease/${this.uuid}/${encodeSafe(key)}`)
            .then(res => res.lease * BLOCK_TIME_IN_SECONDS)
            .catch(res => {
            throw res.error === 'Not Found' ? 'key not found' : res.error;
            return;
        });
        this.getNShortestLeases = async (count) => {
            Assert_1.assert(count >= 0, "Invalid value specified" /* INVALID_VALUE_SPECIFIED */);
            return __classPrivateFieldGet(this, _query).call(this, `crud/getnshortestleases/${this.uuid}/${count}`)
                .then(res => res.keyleases.map(({ key, lease }) => ({ key, lease: parseInt(lease) * BLOCK_TIME_IN_SECONDS })));
        };
        this.has = (key) => __classPrivateFieldGet(this, _query).call(this, `crud/has/${this.uuid}/${key}`)
            .then(res => res.has);
        this.keys = () => __classPrivateFieldGet(this, _query).call(this, `crud/keys/${this.uuid}`)
            .then(res => res.keys);
        this.keyValues = () => __classPrivateFieldGet(this, _query).call(this, `crud/keyvalues/${this.uuid}`)
            .then(res => res.keyvalues);
        this.multiUpdate = async (keyValues, gasInfo) => {
            Assert_1.assert(Array.isArray(keyValues), 'keyValues must be an array');
            keyValues.forEach(({ key, value }, index, array) => {
                Assert_1.assert(typeof key === 'string', "All keys must be strings" /* ALL_KEYS_MUST_BE_STRINGS */);
                Assert_1.assert(typeof value === 'string', "All values must be strings" /* ALL_VALUES_MUST_BE_STRINGS */);
            });
            return this.communicationService.sendMessage({
                type: 'crud/multiupdate',
                value: {
                    KeyValues: keyValues,
                    UUID: this.uuid,
                    Owner: this.address
                }
            }, gasInfo)
                .then(res => ({ txhash: res.txhash, height: res.height }));
        };
        this.read = (key, prove = false) => __classPrivateFieldGet(this, _query).call(this, `crud/${prove ? 'pread' : 'read'}/${this.uuid}/${encodeSafe(key)}`)
            .then(res => res.value)
            .catch(({ error }) => {
            throw (new Error(error === 'Not Found' ? 'key not found' : error));
        });
        this.renewLease = async (key, gasInfo, leaseInfo) => {
            Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
            const blocks = convertLease(leaseInfo);
            Assert_1.assert(blocks >= 0, "Invalid lease time" /* INVALID_LEASE_TIME */);
            return this.communicationService.sendMessage({
                type: 'crud/renewlease',
                value: {
                    Key: key,
                    Lease: blocks.toString(),
                    UUID: this.uuid,
                    Owner: this.address
                }
            }, gasInfo)
                .then(res => ({ height: res.height, txhash: res.txhash }));
        };
        this.renewLeaseAll = async (gasInfo, leaseInfo = {}) => {
            const blocks = convertLease(leaseInfo);
            Assert_1.assert(blocks >= 0, "Invalid lease time" /* INVALID_LEASE_TIME */);
            return this.communicationService.sendMessage({
                type: 'crud/renewleaseall',
                value: {
                    Lease: blocks.toString(),
                    UUID: this.uuid,
                    Owner: this.address
                }
            }, gasInfo)
                .then(res => ({ height: res.height, txhash: res.txhash }));
        };
        this.txCount = async (gasInfo) => {
            return this.communicationService.sendMessage({
                type: 'crud/count',
                value: {
                    UUID: this.uuid,
                    Owner: this.address
                }
            }, gasInfo)
                .then(res => findMine(res, it => it.count !== undefined))
                .then(({ res, data }) => ({ height: res.height, txhash: res.txhash, count: parseInt((data === null || data === void 0 ? void 0 : data.count) || '0') }));
        };
        this.txGetLease = async (key, gasInfo) => {
            return this.communicationService.sendMessage({
                type: 'crud/getlease',
                value: {
                    Key: key,
                    UUID: this.uuid,
                    Owner: this.address
                }
            }, gasInfo)
                .then(res => findMine(res, it => it.key === key && it.lease !== undefined))
                .then(({ res, data }) => ({
                height: res.height,
                txhash: res.txhash,
                lease: parseInt((data === null || data === void 0 ? void 0 : data.lease) || '0') * BLOCK_TIME_IN_SECONDS
            }));
        };
        this.txGetNShortestLeases = async (n, gasInfo) => {
            return {
                txhash: 'xxx',
                height: 1,
                leases: []
            };
        };
        this.txHas = async (key, gasInfo) => {
            Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
            return this.communicationService.sendMessage({
                type: 'crud/has',
                value: {
                    Key: key,
                    UUID: this.uuid,
                    Owner: this.address,
                }
            }, gasInfo)
                .then(res => res.data.find(it => it.key === key && it.has) ? true : false);
        };
        this.txKeys = async (gasInfo) => {
            return this.communicationService.sendMessage({
                type: 'crud/keys',
                value: {
                    UUID: this.uuid,
                    Owner: this.address
                }
            }, gasInfo)
                .then(res => { var _a; return ((_a = res.data.find(it => it.keys)) === null || _a === void 0 ? void 0 : _a.keys) || []; });
        };
        this.txKeyValues = async (gasinfo) => {
            // TODO: Finish this
        };
        _query.set(this, (path) => fetch(`${this.url}/${path}`)
            .then((res) => {
            res;
            if (res.status !== 200) {
                throw {
                    status: res.status,
                    error: res.statusText
                };
            }
            return res.json().then((obj) => { var _a; return (_a = obj.result) !== null && _a !== void 0 ? _a : obj; });
        }));
        this.cosmos = cosmosjs.network(config.endpoint, config.chain_id);
        this.cosmos.setPath("m/44'/118'/0'/0/0");
        this.cosmos.bech32MainPrefix = "bluzelle";
        this.mnemonic = config.mnemonic;
        this.address = this.cosmos.getAddress(this.mnemonic);
        this.ecPairPriv = this.cosmos.getECPairPriv(this.mnemonic);
        this.chainId = config.chain_id;
        this.uuid = config.uuid;
        this.url = config.endpoint;
        this.communicationService = CommunicationService_1.CommunicationService.create(this);
    }
    withTransaction(fn) {
        return this.communicationService.withTransaction(fn);
    }
    setMaxMessagesPerTransaction(count) {
        this.communicationService.setMaxMessagesPerTransaction(count);
    }
    async create(key, value, gasInfo, leaseInfo = {}) {
        const blocks = convertLease(leaseInfo);
        Assert_1.assert(!!key, "Key cannot be empty" /* KEY_CANNOT_BE_EMPTY */);
        Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
        Assert_1.assert(typeof value === 'string', "Value must be a string" /* VALUE_MUST_BE_A_STRING */);
        Assert_1.assert(blocks >= 0, "Invalid lease time" /* INVALID_LEASE_TIME */);
        Assert_1.assert(!key.includes('/'), "Key cannot contain a slash" /* KEY_CANNOT_CONTAIN_SLASH */);
        return this.communicationService.sendMessage({
            type: "crud/create",
            value: {
                Key: encodeSafe(key),
                Value: encodeSafe(value),
                UUID: this.uuid,
                Owner: this.address,
                Lease: blocks.toString(),
            }
        }, gasInfo)
            .then(res => ({ height: res.height, txhash: res.txhash }));
    }
    txRead(key, gasInfo) {
        return this.communicationService.sendMessage({
            type: 'crud/read',
            value: {
                Key: key,
                UUID: this.uuid,
                Owner: this.address
            }
        }, gasInfo)
            .then(res => findMine(res, it => it.value !== undefined && it.key === key))
            .then(({ res, data }) => ({ height: res.height, txhash: res.txhash, value: data === null || data === void 0 ? void 0 : data.value }));
    }
    async update(key, value, gasInfo, leaseInfo = {}) {
        const blocks = convertLease(leaseInfo);
        Assert_1.assert(!!key, "Key cannot be empty" /* KEY_CANNOT_BE_EMPTY */);
        Assert_1.assert(typeof key === 'string', "Key must be a string" /* KEY_MUST_BE_A_STRING */);
        Assert_1.assert(typeof value === 'string', "Value must be a string" /* VALUE_MUST_BE_A_STRING */);
        Assert_1.assert(blocks >= 0, "Invalid lease time" /* INVALID_LEASE_TIME */);
        Assert_1.assert(!key.includes('/'), "Key cannot contain a slash" /* KEY_CANNOT_CONTAIN_SLASH */);
        await this.communicationService.sendMessage({
            type: "crud/update",
            value: {
                Key: encodeSafe(key),
                Value: encodeSafe(value),
                UUID: this.uuid,
                Owner: this.address,
                Lease: blocks.toString()
            }
        }, gasInfo)
            .then(() => {
        });
    }
    version() {
        return __classPrivateFieldGet(this, _query).call(this, 'node_info').then(res => res.application_version.version);
    }
    transferTokensTo(toAddress, amount, gasInfo) {
        return Promise.resolve();
        // const msgs = [
        //     {
        //         type: "cosmos-sdk/MsgSend",
        //         value: {
        //             amount: [
        //                 {
        //                     amount: String(`${amount}000000`),
        //                     denom: "ubnt"
        //                 }
        //             ],
        //             from_address: this.address,
        //             to_address: toAddress
        //         }
        //     }
        // ];
        //
        // return sendTx(this, msgs, 'transfer', gasInfo);
    }
}
exports.API = API;
_query = new WeakMap();
const encodeSafe = (str) => encodeURI(str)
    .replace(/([\#\?])/g, ch => `%${ch.charCodeAt(0).toString(16)}`);
const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const convertLease = ({ seconds = 0, minutes = 0, hours = 0, days = 0 }) => Math.ceil((seconds + (minutes * MINUTE) + (hours * HOUR) + (days * DAY)) / BLOCK_TIME_IN_SECONDS);
const findMine = (res, condition) => {
    for (let i = 0; i < res.data.length; i++) {
        if (condition(res.data[i])) {
            const found = res.data[i];
            lodash_1.pullAt(res.data, i);
            return { res, data: found };
        }
    }
    return { res, data: undefined };
};
//# sourceMappingURL=API.js.map