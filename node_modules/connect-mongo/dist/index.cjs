Object.defineProperty(exports, '__esModule', { value: true });
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let node_assert_strict = require("node:assert/strict");
node_assert_strict = __toESM(node_assert_strict);
let express_session = require("express-session");
express_session = __toESM(express_session);
let mongodb = require("mongodb");
let debug = require("debug");
debug = __toESM(debug);
let node_util = require("node:util");
node_util = __toESM(node_util);
let node_crypto = require("node:crypto");
let kruptein = require("kruptein");
kruptein = __toESM(kruptein);

//#region src/lib/cryptoAdapters.ts
const defaultCryptoOptions = {
	secret: false,
	algorithm: "aes-256-gcm",
	hashing: "sha512",
	encodeas: "base64",
	key_size: 32,
	iv_size: 16,
	at_size: 16
};
const createKrupteinAdapter = (options) => {
	const merged = {
		...defaultCryptoOptions,
		...options
	};
	if (!merged.secret) throw new Error("createKrupteinAdapter requires a non-empty secret");
	const instance = (0, kruptein.default)(merged);
	const encrypt = node_util.default.promisify(instance.set).bind(instance);
	const decrypt = node_util.default.promisify(instance.get).bind(instance);
	return {
		async encrypt(plaintext) {
			const ciphertext = await encrypt(merged.secret, plaintext);
			return String(ciphertext);
		},
		async decrypt(ciphertext) {
			const plaintext = await decrypt(merged.secret, ciphertext);
			if (typeof plaintext === "string") return plaintext;
			return JSON.stringify(plaintext);
		}
	};
};
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const toUint8Array = (input) => {
	if (typeof input === "string") return encoder.encode(input);
	if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
	if (input instanceof ArrayBuffer) return new Uint8Array(input);
	throw new TypeError("Unsupported secret type for Web Crypto adapter");
};
const encodeBytes = (bytes, encoding) => {
	switch (encoding) {
		case "hex": return Buffer.from(bytes).toString("hex");
		case "base64url": return Buffer.from(bytes).toString("base64url");
		case "base64":
		default: return Buffer.from(bytes).toString("base64");
	}
};
const decodeBytes = (payload, encoding) => {
	switch (encoding) {
		case "hex": return new Uint8Array(Buffer.from(payload, "hex"));
		case "base64url": return new Uint8Array(Buffer.from(payload, "base64url"));
		case "base64":
		default: return new Uint8Array(Buffer.from(payload, "base64"));
	}
};
const createWebCryptoAdapter = ({ secret, ivLength, encoding = "base64", algorithm = "AES-GCM", salt, iterations = 31e4 }) => {
	if (!secret) throw new Error("createWebCryptoAdapter requires a secret");
	const { subtle } = node_crypto.webcrypto;
	if (!subtle?.decrypt || !node_crypto.webcrypto?.getRandomValues) throw new Error("Web Crypto API is not available in this runtime");
	const resolvedIvLength = ivLength ?? (algorithm === "AES-GCM" ? 12 : 16);
	const resolvedSalt = salt ?? encoder.encode("connect-mongo:webcrypto-default-salt");
	const deriveKey = async () => {
		const secretBytes = toUint8Array(secret);
		const baseKey = await subtle.importKey("raw", secretBytes, "PBKDF2", false, ["deriveKey"]);
		const saltBytes = typeof resolvedSalt === "string" ? encoder.encode(resolvedSalt) : toUint8Array(resolvedSalt);
		return subtle.deriveKey({
			name: "PBKDF2",
			salt: saltBytes,
			iterations,
			hash: "SHA-256"
		}, baseKey, {
			name: algorithm,
			length: 256
		}, false, ["encrypt", "decrypt"]);
	};
	const keyPromise = deriveKey();
	return {
		async encrypt(plaintext) {
			const key = await keyPromise;
			const iv = node_crypto.webcrypto.getRandomValues(new Uint8Array(resolvedIvLength));
			const data = encoder.encode(plaintext);
			const encrypted = await subtle.encrypt({
				name: algorithm,
				iv
			}, key, data);
			const cipherBytes = new Uint8Array(encrypted);
			const combined = new Uint8Array(resolvedIvLength + cipherBytes.byteLength);
			combined.set(iv, 0);
			combined.set(cipherBytes, resolvedIvLength);
			return encodeBytes(combined, encoding);
		},
		async decrypt(ciphertext) {
			const key = await keyPromise;
			const combined = decodeBytes(ciphertext, encoding);
			const iv = combined.slice(0, resolvedIvLength);
			const data = combined.slice(resolvedIvLength);
			const decrypted = await subtle.decrypt({
				name: algorithm,
				iv
			}, key, data);
			return decoder.decode(decrypted);
		}
	};
};

//#endregion
//#region src/lib/MongoStore.ts
const debug$1 = (0, debug.default)("connect-mongo");
const noop = () => {};
const unit = (a) => a;
function defaultSerializeFunction(currentSession) {
	const result = { cookie: currentSession.cookie };
	Object.entries(currentSession).forEach(([key, value]) => {
		if (key === "cookie" && value && typeof value.toJSON === "function") result.cookie = value.toJSON();
		else result[key] = value;
	});
	return result;
}
function computeTransformFunctions(options) {
	if (options.serialize || options.unserialize) return {
		serialize: options.serialize || defaultSerializeFunction,
		unserialize: options.unserialize || unit
	};
	if (options.stringify === false) return {
		serialize: defaultSerializeFunction,
		unserialize: unit
	};
	return {
		serialize: (value) => JSON.stringify(value),
		unserialize: (payload) => JSON.parse(payload)
	};
}
function computeExpires(session, fallbackTtlSeconds) {
	const cookie = session?.cookie;
	if (cookie?.expires) return new Date(cookie.expires);
	const now = Date.now();
	return new Date(now + fallbackTtlSeconds * 1e3);
}
var MongoStore = class MongoStore extends express_session.Store {
	clientP;
	cryptoAdapter = null;
	timer;
	collectionP;
	options;
	transformFunctions;
	constructor({ collectionName = "sessions", ttl = 1209600, mongoOptions = {}, autoRemove = "native", autoRemoveInterval = 10, touchAfter = 0, stringify = true, timestamps = false, crypto, cryptoAdapter, ...required }) {
		super();
		debug$1("create MongoStore instance");
		const options = {
			collectionName,
			ttl,
			mongoOptions,
			autoRemove,
			autoRemoveInterval,
			touchAfter,
			stringify,
			timestamps,
			crypto,
			cryptoAdapter: cryptoAdapter ?? null,
			...required
		};
		(0, node_assert_strict.default)(options.mongoUrl || options.clientPromise || options.client, "You must provide either mongoUrl|clientPromise|client in options");
		(0, node_assert_strict.default)(options.createAutoRemoveIdx === null || options.createAutoRemoveIdx === void 0, "options.createAutoRemoveIdx has been reverted to autoRemove and autoRemoveInterval");
		(0, node_assert_strict.default)(!options.autoRemoveInterval || options.autoRemoveInterval <= 71582, "autoRemoveInterval is too large. options.autoRemoveInterval is in minutes but not seconds nor mills");
		if (crypto !== void 0 && cryptoAdapter !== void 0) throw new Error("Provide either the legacy crypto option or cryptoAdapter, not both");
		const legacyCryptoRequested = crypto !== void 0 && crypto.secret !== false;
		if (options.cryptoAdapter) this.cryptoAdapter = options.cryptoAdapter;
		else if (legacyCryptoRequested) this.cryptoAdapter = createKrupteinAdapter(options.crypto);
		options.cryptoAdapter = this.cryptoAdapter;
		this.transformFunctions = computeTransformFunctions(options);
		let _clientP;
		if (options.mongoUrl) _clientP = mongodb.MongoClient.connect(options.mongoUrl, options.mongoOptions);
		else if (options.clientPromise) _clientP = options.clientPromise;
		else if (options.client) _clientP = Promise.resolve(options.client);
		else throw new Error("Cannot init client. Please provide correct options");
		(0, node_assert_strict.default)(!!_clientP, "Client is null|undefined");
		this.clientP = _clientP;
		this.options = options;
		this.collectionP = _clientP.then(async (con) => {
			const collection = con.db(options.dbName).collection(options.collectionName);
			await this.setAutoRemove(collection);
			return collection;
		});
	}
	static create(options) {
		return new MongoStore(options);
	}
	setAutoRemove(collection) {
		const removeQuery = () => ({ expires: { $lt: /* @__PURE__ */ new Date() } });
		switch (this.options.autoRemove) {
			case "native":
				debug$1("Creating MongoDB TTL index");
				return collection.createIndex({ expires: 1 }, {
					background: true,
					expireAfterSeconds: 0
				});
			case "interval": {
				debug$1("create Timer to remove expired sessions");
				const runIntervalRemove = () => collection.deleteMany(removeQuery(), { writeConcern: { w: 0 } }).catch((err) => {
					debug$1("autoRemove interval cleanup failed: %s", err?.message ?? err);
				});
				this.timer = setInterval(() => {
					runIntervalRemove();
				}, this.options.autoRemoveInterval * 1e3 * 60);
				this.timer.unref();
				return Promise.resolve();
			}
			case "disabled":
			default: return Promise.resolve();
		}
	}
	computeStorageId(sessionId) {
		if (this.options.transformId && typeof this.options.transformId === "function") return this.options.transformId(sessionId);
		return sessionId;
	}
	/**
	* Normalize payload before encryption so decrypt can restore the original
	* serialized session value.
	*/
	serializeForCrypto(payload) {
		if (typeof payload === "string") return payload;
		try {
			return JSON.stringify(payload);
		} catch (error) {
			debug$1("Falling back to string serialization for crypto payload: %O", error);
			return String(payload);
		}
	}
	parseDecryptedPayload(plaintext) {
		let parsed;
		try {
			parsed = JSON.parse(plaintext);
		} catch {
			parsed = plaintext;
		}
		if (this.options.stringify === false) {
			if (typeof parsed === "string") try {
				return JSON.parse(parsed);
			} catch {
				return parsed;
			}
			return parsed;
		}
		if (!this.options.serialize && !this.options.unserialize) return typeof parsed === "string" ? parsed : JSON.stringify(parsed);
		return parsed;
	}
	/**
	* Decrypt given session data
	* @param session session data to be decrypt. Mutate the input session.
	*/
	async decryptSession(sessionDoc) {
		if (this.cryptoAdapter && sessionDoc && typeof sessionDoc.session === "string") {
			const plaintext = await this.cryptoAdapter.decrypt(sessionDoc.session);
			sessionDoc.session = this.parseDecryptedPayload(plaintext);
		}
	}
	/**
	* Get a session from the store given a session ID (sid)
	* @param sid session ID
	*/
	get(sid, callback) {
		(async () => {
			try {
				debug$1(`MongoStore#get=${sid}`);
				const sessionDoc = await (await this.collectionP).findOne({
					_id: this.computeStorageId(sid),
					$or: [{ expires: { $exists: false } }, { expires: { $gt: /* @__PURE__ */ new Date() } }]
				});
				if (this.cryptoAdapter && sessionDoc) try {
					await this.decryptSession(sessionDoc);
				} catch (error) {
					callback(error);
					return;
				}
				let result;
				if (sessionDoc) {
					result = this.transformFunctions.unserialize(sessionDoc.session);
					if (this.options.touchAfter > 0 && sessionDoc.lastModified) result.lastModified = sessionDoc.lastModified;
				}
				this.emit("get", sid);
				callback(null, result ?? null);
			} catch (error) {
				callback(error);
			}
		})();
	}
	/**
	* Upsert a session into the store given a session ID (sid) and session (session) object.
	* @param sid session ID
	* @param session session object
	*/
	set(sid, session, callback = noop) {
		(async () => {
			try {
				debug$1(`MongoStore#set=${sid}`);
				if (this.options.touchAfter > 0 && session?.lastModified) delete session.lastModified;
				const s = {
					_id: this.computeStorageId(sid),
					session: this.transformFunctions.serialize(session)
				};
				s.expires = computeExpires(session, this.options.ttl);
				if (this.options.touchAfter > 0) s.lastModified = /* @__PURE__ */ new Date();
				if (this.cryptoAdapter) {
					const plaintext = this.serializeForCrypto(s.session);
					s.session = await this.cryptoAdapter.encrypt(plaintext);
				}
				const collection = await this.collectionP;
				const update = { $set: s };
				if (this.options.timestamps) {
					update.$setOnInsert = { createdAt: /* @__PURE__ */ new Date() };
					update.$currentDate = { updatedAt: true };
				}
				if ((await collection.updateOne({ _id: s._id }, update, {
					upsert: true,
					writeConcern: this.options.writeOperationOptions
				})).upsertedCount > 0) this.emit("create", sid);
				else this.emit("update", sid);
				this.emit("set", sid);
			} catch (error) {
				return callback(error);
			}
			return callback(null);
		})();
	}
	touch(sid, session, callback = noop) {
		(async () => {
			try {
				debug$1(`MongoStore#touch=${sid}`);
				const updateFields = {};
				const touchAfter = this.options.touchAfter * 1e3;
				const lastModified = session.lastModified ? session.lastModified.getTime() : 0;
				const currentDate = /* @__PURE__ */ new Date();
				if (touchAfter > 0 && lastModified > 0) {
					if (currentDate.getTime() - lastModified < touchAfter) {
						debug$1(`Skip touching session=${sid}`);
						return callback(null);
					}
					updateFields.lastModified = currentDate;
				}
				updateFields.expires = computeExpires(session, this.options.ttl);
				const collection = await this.collectionP;
				const updateQuery = { $set: updateFields };
				if (this.options.timestamps) updateQuery.$currentDate = { updatedAt: true };
				if ((await collection.updateOne({ _id: this.computeStorageId(sid) }, updateQuery, { writeConcern: this.options.writeOperationOptions })).matchedCount === 0) return callback(/* @__PURE__ */ new Error("Unable to find the session to touch"));
				else {
					this.emit("touch", sid, session);
					return callback(null);
				}
			} catch (error) {
				return callback(error);
			}
		})();
	}
	/**
	* Get all sessions in the store as an array
	*/
	all(callback) {
		(async () => {
			try {
				debug$1("MongoStore#all()");
				const sessions = (await this.collectionP).find({ $or: [{ expires: { $exists: false } }, { expires: { $gt: /* @__PURE__ */ new Date() } }] });
				const results = [];
				for await (const sessionDoc of sessions) {
					if (this.cryptoAdapter && sessionDoc) await this.decryptSession(sessionDoc);
					results.push(this.transformFunctions.unserialize(sessionDoc.session));
				}
				this.emit("all", results);
				callback(null, results);
			} catch (error) {
				callback(error);
			}
		})();
	}
	/**
	* Destroy/delete a session from the store given a session ID (sid)
	* @param sid session ID
	*/
	destroy(sid, callback = noop) {
		debug$1(`MongoStore#destroy=${sid}`);
		this.collectionP.then((colleciton) => colleciton.deleteOne({ _id: this.computeStorageId(sid) }, { writeConcern: this.options.writeOperationOptions })).then(() => {
			this.emit("destroy", sid);
			callback(null);
		}).catch((err) => callback(err));
	}
	/**
	* Get the count of all sessions in the store
	*/
	length(callback) {
		debug$1("MongoStore#length()");
		this.collectionP.then((collection) => collection.countDocuments()).then((c) => callback(null, c)).catch((err) => callback(err, 0));
	}
	/**
	* Delete all sessions from the store.
	*/
	clear(callback = noop) {
		debug$1("MongoStore#clear()");
		this.collectionP.then((collection) => collection.deleteMany({}, { writeConcern: this.options.writeOperationOptions })).then(() => callback(null)).catch((err) => {
			const message = err?.message ?? "";
			if (err?.code === 26 || /ns not found/i.test(message)) {
				callback(null);
				return;
			}
			callback(err);
		});
	}
	/**
	* Close database connection
	*/
	close() {
		debug$1("MongoStore#close()");
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = void 0;
		}
		return this.clientP.then((c) => c.close());
	}
};

//#endregion
//#region src/index.ts
var src_default = MongoStore;

//#endregion
exports.MongoStore = MongoStore;
exports.createKrupteinAdapter = createKrupteinAdapter;
exports.createWebCryptoAdapter = createWebCryptoAdapter;
exports.default = src_default;
//# sourceMappingURL=index.cjs.map