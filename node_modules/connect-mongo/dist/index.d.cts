import * as session from "express-session";
import { Collection, MongoClient, MongoClientOptions, WriteConcernSettings } from "mongodb";

//#region src/lib/cryptoAdapters.d.ts
interface CryptoAdapter {
  encrypt: (unencryptedPayload: string) => Promise<string>;
  decrypt: (encryptedPayload: string) => Promise<string>;
}
type CryptoOptions = {
  secret: false | string;
  algorithm?: string;
  hashing?: string;
  encodeas?: string;
  key_size?: number;
  iv_size?: number;
  at_size?: number;
};
declare const createKrupteinAdapter: (options: CryptoOptions) => CryptoAdapter;
type WebCryptoEncoding = 'base64' | 'base64url' | 'hex';
type WebCryptoAdapterOptions = {
  secret: string | ArrayBuffer | ArrayBufferView;
  ivLength?: number;
  encoding?: WebCryptoEncoding;
  algorithm?: 'AES-GCM' | 'AES-CBC';
  salt?: string | ArrayBuffer | ArrayBufferView;
  iterations?: number;
};
declare const createWebCryptoAdapter: ({
  secret,
  ivLength,
  encoding,
  algorithm,
  salt,
  iterations
}: WebCryptoAdapterOptions) => CryptoAdapter;
//#endregion
//#region src/lib/MongoStore.d.ts
type StoredSessionValue = session.SessionData | string;
type Serialize<T extends session.SessionData> = (session: T) => StoredSessionValue;
type Unserialize<T extends session.SessionData> = (payload: StoredSessionValue) => T;
type ConnectMongoOptions<T extends session.SessionData = session.SessionData> = {
  mongoUrl?: string;
  clientPromise?: Promise<MongoClient>;
  client?: MongoClient;
  collectionName?: string;
  mongoOptions?: MongoClientOptions;
  dbName?: string;
  ttl?: number;
  touchAfter?: number;
  stringify?: boolean;
  createAutoRemoveIdx?: boolean;
  autoRemove?: 'native' | 'interval' | 'disabled';
  autoRemoveInterval?: number;
  serialize?: Serialize<T>;
  unserialize?: Unserialize<T>;
  writeOperationOptions?: WriteConcernSettings;
  transformId?: (sid: string) => string;
  crypto?: CryptoOptions;
  cryptoAdapter?: CryptoAdapter;
  timestamps?: boolean;
};
type InternalSessionType<T extends session.SessionData> = {
  _id: string;
  session: StoredSessionValue | T;
  expires?: Date;
  lastModified?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
declare class MongoStore<T extends session.SessionData = session.SessionData> extends session.Store {
  private clientP;
  private readonly cryptoAdapter;
  private timer?;
  collectionP: Promise<Collection<InternalSessionType<T>>>;
  private options;
  private transformFunctions;
  constructor({
    collectionName,
    ttl,
    mongoOptions,
    autoRemove,
    autoRemoveInterval,
    touchAfter,
    stringify,
    timestamps,
    crypto,
    cryptoAdapter,
    ...required
  }: ConnectMongoOptions<T>);
  static create<U extends session.SessionData = session.SessionData>(options: ConnectMongoOptions<U>): MongoStore<U>;
  private setAutoRemove;
  private computeStorageId;
  /**
   * Normalize payload before encryption so decrypt can restore the original
   * serialized session value.
   */
  private serializeForCrypto;
  private parseDecryptedPayload;
  /**
   * Decrypt given session data
   * @param session session data to be decrypt. Mutate the input session.
   */
  private decryptSession;
  /**
   * Get a session from the store given a session ID (sid)
   * @param sid session ID
   */
  get(sid: string, callback: (err: any, session?: T | null) => void): void;
  /**
   * Upsert a session into the store given a session ID (sid) and session (session) object.
   * @param sid session ID
   * @param session session object
   */
  set(sid: string, session: T, callback?: (err: any) => void): void;
  touch(sid: string, session: T & {
    lastModified?: Date;
  }, callback?: (err: any) => void): void;
  /**
   * Get all sessions in the store as an array
   */
  all(callback: (err: any, obj?: T[] | {
    [sid: string]: T;
  } | null) => void): void;
  /**
   * Destroy/delete a session from the store given a session ID (sid)
   * @param sid session ID
   */
  destroy(sid: string, callback?: (err: any) => void): void;
  /**
   * Get the count of all sessions in the store
   */
  length(callback: (err: any, length: number) => void): void;
  /**
   * Delete all sessions from the store.
   */
  clear(callback?: (err: any) => void): void;
  /**
   * Close database connection
   */
  close(): Promise<void>;
}
//#endregion
export { type CryptoAdapter, type CryptoOptions, MongoStore, MongoStore as default, type WebCryptoAdapterOptions, createKrupteinAdapter, createWebCryptoAdapter };
//# sourceMappingURL=index.d.cts.map