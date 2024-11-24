import { EtherMiddleware, MicroEnv, Middleware } from '@ceil-dev/portals';
type FetchResponse = {
    ok: boolean;
    json: () => unknown;
    text: () => unknown;
};
export type FetchLike = (url: string, init?: {
    method: string;
    body: string;
    keepalive?: boolean;
    redirect?: 'error';
    signal?: AbortSignalLike;
}) => Promise<FetchResponse>;
type AbortControllerLike = {
    signal: AbortSignalLike;
    abort(reason?: any): AbortSignalLike | void;
};
type AbortSignalLike = {
    aborted: boolean;
    onabort: ((...args: any[]) => unknown) | null;
    reason: undefined;
    throwIfAborted: (...args: any[]) => void;
    addEventListener: (type: string, listener: (...args: any[]) => unknown, options?: boolean | any) => void;
    removeEventListener: (type: string, listener: (...args: any[]) => unknown, options?: boolean | any) => void;
    dispatchEvent: (...args: any[]) => boolean;
    any: any;
};
type WebPointPortalProps = {
    fetchMethod: FetchLike;
    env: MicroEnv;
    middleware?: Middleware;
    createAbortController?: () => AbortControllerLike;
    webPointUrl?: string;
    privateWebPointID?: string;
    onObtainedPrivateID?: (id: string) => void;
};
export declare const createWebPointPortal: ({ fetchMethod, env, middleware, createAbortController, webPointUrl, privateWebPointID, onObtainedPrivateID, }: WebPointPortalProps) => import("@ceil-dev/portals").PortalMethod;
type WebPointEtherProps = {
    fetchMethod: FetchLike;
    createAbortController?: () => AbortControllerLike;
    webPointUrl?: string;
    privateWebPointID?: string;
    onObtainedPrivateID?: (id: string) => void;
};
export declare const DEFAULT_WEBPOINT_URL = "https://webpoint.ceil.dev/";
export declare const createWebPointEther: ({ fetchMethod, webPointUrl, createAbortController, privateWebPointID, onObtainedPrivateID, }: WebPointEtherProps) => EtherMiddleware;
export {};
