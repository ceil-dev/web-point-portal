import {
  createPortal,
  EtherAttachSupplier,
  EtherDetachSupplier,
  EtherMiddleware,
  EtherSendSupplier,
  MicroEnv,
  Middleware,
  OpenSupplier,
} from '@ceil-dev/portals';

type FetchResponse = { ok: boolean; json: () => unknown; text: () => unknown };
export type FetchLike = (
  url: string,
  init?: {
    method: string;
    body: string;
    keepalive?: boolean;
    redirect?: 'error';
    signal?: AbortSignalLike;
  }
) => Promise<FetchResponse>;

type AbortControllerLike = {
  signal: AbortSignalLike;
  abort(reason?: any): AbortSignalLike | void;
};

type AbortSignalLike = {
  aborted: boolean;
  onabort: ((...args: any[]) => unknown) | null;
  reason: undefined;
  throwIfAborted: (...args: any[]) => void;
  addEventListener: (
    type: string,
    listener: (...args: any[]) => unknown,
    options?: boolean | any
  ) => void;
  removeEventListener: (
    type: string,
    listener: (...args: any[]) => unknown,
    options?: boolean | any
  ) => void;
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

const WEBPOINT_REG_RESPONSE_CODES = {
  '-1': 'Max retries reached',
  0: 'Public ID already existst',
  1: 'Wrong format public ID (must be UUID?)',
};

export const createWebPointPortal = ({
  fetchMethod,
  env,
  middleware,
  createAbortController,
  webPointUrl,
  privateWebPointID,
  onObtainedPrivateID,
}: WebPointPortalProps) => {
  return createPortal(env, [
    middleware,
    createWebPointEther({
      fetchMethod,
      createAbortController,
      webPointUrl,
      privateWebPointID,
      onObtainedPrivateID,
    }),
  ]);
};

type WebPointEtherProps = {
  fetchMethod: FetchLike;
  createAbortController?: () => AbortControllerLike;
  webPointUrl?: string;
  privateWebPointID?: string;
  onObtainedPrivateID?: (id: string) => void;
};

export const DEFAULT_WEBPOINT_URL = 'https://webpoint.ceil.dev/';

export const createWebPointEther = ({
  fetchMethod,
  webPointUrl = DEFAULT_WEBPOINT_URL,
  createAbortController,
  privateWebPointID,
  onObtainedPrivateID,
}: WebPointEtherProps): EtherMiddleware => {
  let isAttached = false;

  let dispatchData: { [k: string]: any } | undefined = {};
  let abortController: AbortControllerLike | undefined;

  let failsCount = 0;
  let numActiveReqs = 0;

  const start: OpenSupplier = async ({ id, portal }) => {
    const send = async () => {
      let fetchRes: FetchResponse | undefined;
      const lastDispatchData = Object.values(dispatchData)[0];

      abortController = createAbortController?.();

      numActiveReqs++;
      try {
        fetchRes = await fetchMethod(webPointUrl, {
          redirect: 'error',
          method: 'POST',
          body: JSON.stringify({
            from: privateWebPointID,
            to: lastDispatchData?.recipient,
            payload: lastDispatchData?.payload,
          }),
          keepalive: true,
          signal: abortController?.signal,
        });
      } catch (e) {
        console.warn(e?.['message'] || e);
      }

      if (!isAttached) return;

      numActiveReqs--;

      abortController = undefined;

      const retry = async (pause?: number) => {
        pause && (await new Promise((resolve) => setTimeout(resolve, pause)));
        send().catch();
        return;
      };

      if (!fetchRes?.ok) {
        failsCount++;
        retry(0 + failsCount * failsCount * 100).catch();
        return;
      }

      const result = await fetchRes.text();

      // TODO: figure out a solution - this approach is not working with eventually consistent storage
      // call was successfull - assuming that there's no need to send the same data again
      if (lastDispatchData === Object.values(dispatchData)[0]) {
        delete dispatchData[Object.keys(dispatchData)[0]];
        // dispatchData = undefined;
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
        } catch (e) {
          failsCount++;
          retry(0 + failsCount * failsCount * 100).catch(console.warn);
          return;
        }
      }
      retry(500).catch(console.warn);
    };

    send().catch(console.warn);
  };

  let id: string;

  const etherAttachSupplier: EtherAttachSupplier = async (data, scope) => {
    if (isAttached) {
      console.warn(
        'etherAttachSupplier: tried to attach, but is already attached'
      );

      return;
    }

    isAttached = true;

    id = data.id;

    const { getSupplierTypes, demand } = scope;

    const persistence = getSupplierTypes().includes('persistence')
      ? demand({ type: 'persistence' })
      : undefined;

    // !provided?
    if (!privateWebPointID)
      privateWebPointID = (await persistence?.get({ key: id + '_webPointID' }))
        ?.value as string;

    // !stored?
    if (!privateWebPointID) {
      let numAttempts = 0;

      while (numAttempts++ < 10) {
        try {
          const res = await fetchMethod(webPointUrl, {
            method: 'POST',
            body: JSON.stringify({ ['jf9384jFn3rjw*fcn']: id }),
          });

          if (!isAttached) return;

          const _id = (await res.text()) as string;
          if (!res.ok || !_id) throw 'Unsuccessfull';

          privateWebPointID = _id;

          if (privateWebPointID?.length === 1) break;

          await persistence?.set({
            key: id + '_webPointID',
            value: privateWebPointID,
          });

          onObtainedPrivateID?.(privateWebPointID);

          break;
        } catch (e) {
          if (!isAttached) return;

          await new Promise((res) =>
            setTimeout(res, 100 * numAttempts * numAttempts)
          );
        }
      }
    }

    if ((privateWebPointID?.length || 0) <= 1) {
      if (!privateWebPointID) privateWebPointID = '-1';
      console.error(
        `WebPoint Ether: Could not get a private ID. Code: ${privateWebPointID}(${WEBPOINT_REG_RESPONSE_CODES[privateWebPointID]}). Returning nothing.`
      );
      return;
    }

    setTimeout(() => start(data, scope), 100);
  };

  const etherSendSupplier: EtherSendSupplier = async (data, scope) => {
    const { id, payload } = data;

    if (payload.recipient) dispatchData[payload.recipient] = payload;

    try {
      abortController?.abort();
    } catch (e) {
      console.warn(e);
    }
  };

  const etherDetachSupplier: EtherDetachSupplier = () => {
    isAttached = false;
    abortController?.abort();
  };

  return {
    'ether.attach': etherAttachSupplier,
    'ether.send': etherSendSupplier,
    'ether.detach': etherDetachSupplier,
  };
};
