const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('service worker activation keeps sibling GitHub Pages app caches', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'site', 'sw.js'), 'utf8');
  const match = source.match(/const CACHE = "([^"]+)";/);
  assert.ok(match, 'current cache key must be declared');
  const current = match[1];
  const ownedOld = ['shift-manager-v2', 'shift-manager-v4-20261006'];
  const otherApps = [
    'ikukamo-v6',
    'sushi-fair-v20261006-icons-csp1',
    'meat-fair-shell-v20261006-csp1',
    'ai-data-guard-preview-v3',
    'seoul-trip-v1.0.2',
  ];
  const deleted = [];
  let onActivate;
  let claims = 0;
  const self = {
    addEventListener(type, handler) { if (type === 'activate') onActivate = handler; },
    clients: { async claim() { claims++; } },
  };
  const caches = {
    async keys() { return [...ownedOld, current, ...otherApps]; },
    async delete(key) { deleted.push(key); return true; },
  };
  vm.runInNewContext(source, { self, caches }, { filename: 'site/sw.js' });
  assert.equal(typeof onActivate, 'function');
  let pending;
  onActivate({ waitUntil(promise) { pending = promise; } });
  assert.ok(pending, 'activation must await cache cleanup');
  await pending;
  assert.deepEqual(deleted.sort(), ownedOld.sort());
  assert.equal(claims, 1);
});
