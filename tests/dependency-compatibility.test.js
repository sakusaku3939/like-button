const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');

test('Firestore uses the patched gRPC transport and maps an RPC error', { timeout: 15000 }, async () => {
  const firestoreRequire = createRequire(require.resolve('@firebase/firestore'));
  const grpc = firestoreRequire('@grpc/grpc-js');
  const { initializeApp, deleteApp } = require('firebase/app');
  const { getFirestore, connectFirestoreEmulator, doc, runTransaction, terminate } = require('firebase/firestore');

  assert.equal(firestoreRequire('@grpc/grpc-js/package.json').version, '1.13.6');

  const server = new grpc.Server();
  let requests = 0;
  let app;
  let db;

  // The real SDK serializes the request. A local stub returns a non-retryable
  // status, exercising its Node gRPC path without credentials or Firebase data.
  server.addService({
    batchGetDocuments: {
      path: '/google.firestore.v1.Firestore/BatchGetDocuments',
      requestStream: false,
      responseStream: true,
      requestSerialize: Buffer.from,
      requestDeserialize: value => value,
      responseSerialize: Buffer.from,
      responseDeserialize: value => value,
    },
  }, {
    batchGetDocuments(call) {
      requests++;
      call.emit('error', {
        code: grpc.status.PERMISSION_DENIED,
        details: 'offline dependency regression response',
      });
    },
  });

  try {
    const port = await new Promise((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, value) => {
        if (error) reject(error);
        else resolve(value);
      });
    });
    app = initializeApp({ projectId: 'demo-like-button-dependency-test' }, 'dependency-test');
    db = getFirestore(app);
    connectFirestoreEmulator(db, '127.0.0.1', port);

    await assert.rejects(
      runTransaction(db, transaction => transaction.get(doc(db, 'fixtures', 'smoke')), { maxAttempts: 1 }),
      error => error.code === 'permission-denied' && error.message.includes('offline dependency regression response'),
    );
    assert.equal(requests, 1);
  } finally {
    if (db) await terminate(db);
    if (app) await deleteApp(app);
    server.forceShutdown();
  }
});

test('webpack-dev-server 4 serves and rebuilds with patched middleware', { timeout: 30000 }, async () => {
  const webpack = require('webpack');
  const DevServer = require('webpack-dev-server');
  const serverRequire = createRequire(require.resolve('webpack-dev-server'));
  assert.equal(serverRequire('webpack-dev-middleware/package.json').version, '7.4.6');

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'like-button-dependencies-'));
  const entry = path.join(directory, 'entry.js');
  fs.writeFileSync(entry, 'console.log("dependency-fixture-v1")');
  const compiler = webpack({
    mode: 'development',
    entry,
    devtool: false,
    output: {
      path: path.join(directory, 'dist'),
      filename: 'bundle.js',
      // Deliberately omit the final slash to cover GHSA-g84c-rxfj-3j2c.
      publicPath: '/assets',
    },
    infrastructureLogging: { level: 'error' },
  });
  const server = new DevServer({
    host: '127.0.0.1',
    port: 0,
    static: false,
    client: false,
    hot: false,
    setupExitSignals: false,
    devMiddleware: { stats: 'errors-only' },
  }, compiler);

  try {
    await server.start();
    const stats = await new Promise(resolve => server.middleware.waitUntilValid(resolve));
    assert.equal(stats.hasErrors(), false, stats.toString());
    const port = server.server.address().port;
    // http.request preserves the raw traversal path; URL/fetch can normalize it.
    const request = (url, options = {}) => new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path: url, ...options }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString(),
        }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => req.destroy(new Error('Fixture request timed out')));
      req.end();
    });

    const bundle = await request('/assets/bundle.js');
    assert.equal(bundle.status, 200);
    assert.match(bundle.body, /dependency-fixture-v1/);
    assert.match(bundle.headers['content-type'], /javascript/);

    const head = await request('/assets/bundle.js', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.body, '');

    const range = await request('/assets/bundle.js', { headers: { range: 'bytes=0-9' } });
    assert.equal(range.status, 206);
    assert.equal(Buffer.byteLength(range.body), 10);

    server.middleware.context.outputFileSystem.writeFileSync(
      path.join(directory, 'secret.txt'), 'sibling-sentinel-must-not-leak',
    );
    for (const url of ['/assets../secret.txt', '/assets/..%2fsecret.txt']) {
      const response = await request(url);
      assert.equal(response.status, 403, url);
      assert.doesNotMatch(response.body, /sibling-sentinel/);
    }

    const rebuilt = new Promise((resolve, reject) => {
      compiler.hooks.done.tap('DependencyRegression', nextStats => {
        if (nextStats.hasErrors()) reject(new Error(nextStats.toString()));
        else resolve();
      });
    });
    fs.writeFileSync(entry, 'console.log("dependency-fixture-v2")');
    server.invalidate();
    await rebuilt;
    const updated = await request('/assets/bundle.js');
    assert.equal(updated.status, 200);
    assert.match(updated.body, /dependency-fixture-v2/);
  } finally {
    await server.stop();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('SockJS is the only UUID consumer and resolves the native v4 adapter', () => {
  const lockfile = require('../package-lock.json');
  const consumers = Object.entries(lockfile.packages)
    .filter(([, pkg]) => pkg.dependencies && pkg.dependencies.uuid)
    .map(([location, pkg]) => ({ location, version: pkg.version }));
  assert.deepEqual(consumers, [{ location: 'node_modules/sockjs', version: '0.3.24' }]);

  // Reject a reintroduced registry UUID package, including a nested copy.
  const uuidPackages = Object.entries(lockfile.packages)
    .filter(([location]) => location.endsWith('/node_modules/uuid') || location === 'node_modules/uuid');
  assert.deepEqual(uuidPackages, [['node_modules/uuid', {
    resolved: 'vendor/sockjs-uuid',
    link: true,
  }]]);

  const sockjsRequire = createRequire(require.resolve('sockjs'));
  assert.equal(sockjsRequire('uuid/package.json').name, '@like-button/sockjs-uuid');
  const uuid = sockjsRequire('uuid');
  assert.deepEqual(Object.keys(uuid), ['v4']);
  assert.throws(() => uuid.v4({}), TypeError);
  const ids = new Set(Array.from({ length: 100 }, () => uuid.v4()));
  assert.equal(ids.size, 100);
  for (const id of ids) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
});

test('SockJS creates native UUIDs and exchanges messages after reconnecting', { timeout: 15000 }, async () => {
  const sockjs = require('sockjs');
  const WebSocket = require('ws');
  const ids = [];
  const sockets = new Set();
  const server = http.createServer();
  const transport = sockjs.createServer({ log() {}, disconnect_delay: 10 });
  transport.on('connection', connection => {
    ids.push(connection.id);
    connection.on('data', message => connection.write(`echo:${message}`));
  });
  transport.installHandlers(server, { prefix: '/sockjs' });

  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const connect = session => new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/sockjs/000/${session}/websocket`);
      sockets.add(socket);
      let received = false;
      socket.on('error', reject);
      socket.on('message', frame => {
        try {
          const message = frame.toString();
          if (message === 'o') socket.send(JSON.stringify([session]));
          else if (message.startsWith('a')) {
            assert.deepEqual(JSON.parse(message.slice(1)), [`echo:${session}`]);
            received = true;
            socket.close();
          }
        } catch (error) {
          reject(error);
          socket.terminate();
        }
      });
      socket.on('close', () => {
        sockets.delete(socket);
        if (received) resolve();
        else reject(new Error('SockJS closed before exchanging a message'));
      });
    });

    await connect('first-session');
    await connect('reconnected-session');
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1]);
    for (const id of ids) {
      assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  } finally {
    for (const socket of sockets) socket.terminate();
    await new Promise(resolve => server.close(resolve));
  }
});
