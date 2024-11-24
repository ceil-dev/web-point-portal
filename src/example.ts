import { createWebPointPortal } from './index';
import { microEnv, randomUUID } from '@ceil-dev/portals';

const run = async () => {
  // create portal A microenv
  const envA = microEnv(
    { foo: 'bar' },
    { id: randomUUID() }, // only UUID format strings are accepted as ID for default webpoint (webpoint.ceil.dev)
    {
      set: (props) => {
        console.log('portalA: env.set called with:', props);
      },
    }
  );
  // initialise portal A instance
  const portalA = createWebPointPortal({
    env: envA,
    fetchMethod: fetch,
    createAbortController: () => new AbortController(),
    middleware: {
      // debug: (data) => console.log(...data),
    },
  });

  const envB_id = randomUUID();

  // initialise portalB instance
  const portalB = createWebPointPortal({
    env: microEnv({ foo: 'baz' }, { id: envB_id }),
    fetchMethod: fetch,
    createAbortController: () => new AbortController(),
    middleware: {
      // debug: (data) => console.log(...data),
    },
  });

  // open portal B
  await portalB('open');

  // enter env B via portal A
  const remoteEnv = await portalA('enter', envB_id);
  console.log('Remote environment descriptor:', remoteEnv.descriptor);

  console.log('Remote value "foo":', await remoteEnv.face.foo);

  remoteEnv.face.foo = 68;
  console.log(
    'Remote value "foo" after settings to 68:',
    await remoteEnv.face.foo
  );
  remoteEnv.face.foo = 419;
  console.log(
    'Remote value "foo" after settings to 419:',
    await remoteEnv.face.foo
  );
  remoteEnv.face.foo = 'not bar';
  console.log(
    'Remote value "foo" after settings to "not bar":',
    await remoteEnv.face.foo
  );

  try {
    process.exit(0);
  } catch (e) {}
};

run().catch(console.warn);
