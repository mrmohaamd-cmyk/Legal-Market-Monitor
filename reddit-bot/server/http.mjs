import { Buffer } from 'node:buffer';

/**
 * Devvit's server bridge requires an explicit byte length for a nonempty response.
 * @param {import('node:http').ServerResponse} response
 * @param {number} status
 * @param {unknown} value
 */
export function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body, 'utf8')
  }).end(body);
}
