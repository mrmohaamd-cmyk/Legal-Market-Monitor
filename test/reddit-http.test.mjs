import test from 'node:test';
import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { once } from 'node:events';
import { Duplex } from 'node:stream';
import { sendJson } from '../reddit-bot/server/http.mjs';

test('JSON responses carry an explicit UTF-8 byte length for the Devvit bridge', async () => {
  const responses = {
    '/preview': { status: 200, value: { showToast: 'معاينة وظائف — Preview only 🧪. No posts or claims created.' } },
    '/scheduler': { status: 200, value: { status: 'ok', result: 'disabled' } },
    '/missing': { status: 404, value: { error: 'Not found' } }
  };
  for (const [path, expected] of Object.entries(responses)) {
    // Exercise Node's actual HTTP framing through an in-memory socket. No open port,
    // external service, or network permission is needed for this regression.
    const chunks = [];
    const socket = new Duplex({read() {}, write(chunk, _encoding, callback) {chunks.push(Buffer.from(chunk)); callback();}});
    const request = new IncomingMessage(socket);
    request.method = 'POST';
    const response = new ServerResponse(request);
    response.assignSocket(socket);
    const finished = once(response, 'finish');
    sendJson(response, expected.status, expected.value);
    await finished;
    const wire = Buffer.concat(chunks);
    const headerEnd = wire.indexOf('\r\n\r\n');
    assert.ok(headerEnd > 0);
    const headers = wire.subarray(0, headerEnd).toString('ascii');
    const bytes = wire.subarray(headerEnd + 4);
    assert.match(headers, new RegExp(`^HTTP/1\\.1 ${expected.status} `));
    assert.match(headers, /\r\ncontent-type: application\/json; charset=utf-8\r\n/i);
    assert.match(headers, new RegExp(`\\r\\ncontent-length: ${bytes.length}\\r\\n`, 'i'));
    assert.ok(bytes.length > 0);
    assert.doesNotMatch(headers, /transfer-encoding:/i);
    assert.deepEqual(JSON.parse(bytes.toString('utf8')), expected.value);
    if (path === '/preview') assert.ok(bytes.length > bytes.toString('utf8').length, 'Multibyte preview text must use byte count, not string length.');
    socket.destroy();
  }
});
