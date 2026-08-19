import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { test } from 'node:test';

import { createApp } from '../src/app.js';
import { getLatestBtcPrice } from '../src/btc-price.js';

test('live BTC price integration', async t => {
  await t.test('fetches, validates, coalesces, and caches a Coinbase price', async () => {
    const [firstPrice, concurrentPrice] = await Promise.all([
      getLatestBtcPrice(),
      getLatestBtcPrice(),
    ]);

    assert.strictEqual(concurrentPrice, firstPrice);
    assert.strictEqual(await getLatestBtcPrice(), firstPrice);
    assert.equal(firstPrice.pair, 'BTC-USD');
    assert.ok(firstPrice.price > 0);
    assert.ok(!Number.isNaN(Date.parse(firstPrice.observedAt)));
  });

  await t.test('serves the live price without allowing HTTP caching', async t => {
    const { server, baseUrl } = await startTestServer();
    t.after(() => closeServer(server));

    const response = await fetch(`${baseUrl}/api/btc-price`);
    const btcPrice: unknown = await response.json();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(btcPrice, await getLatestBtcPrice());
  });
});

async function startTestServer() {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Test server did not bind to a TCP port');
  }

  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
