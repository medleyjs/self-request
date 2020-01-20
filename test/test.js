'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const medley = require('@medley/medley');
const path = require('path');
const selfRequest = require('../self-request');

describe('self-request', () => {

  it('should make requests to the app it’s registered on using got', async () => {
    const app = medley();

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.send('success');
    });

    const res = await app.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'success');
    assert.strictEqual(typeof res.timings, 'object', 'got response should have timings object');
  });

  it('should accept the same parameters as got', async () => {
    const app = medley();

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.send('success');
    });

    const res1 = await app.request({url: '/'});
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body, 'success');

    const res2 = await app.request('/', {responseType: 'buffer'});
    assert.strictEqual(res2.statusCode, 200);
    assert.deepStrictEqual(res2.body, Buffer.from('success'));
  });

  it('should not require URLs to have a leading slash "/" character', async () => {
    const app = medley();

    app.get('/', (req, res) => {
      res.send('success');
    });

    app.get('/hello', (req, res) => {
      res.send('hello');
    });

    app.register(selfRequest);

    const res1 = await app.request({url: ''});
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body, 'success');

    const res2 = await app.request('');
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body, 'success');

    const res3 = await app.request('hello');
    assert.strictEqual(res3.statusCode, 200);
    assert.strictEqual(res3.body, 'hello');
  });

  it('should work if .request() is called multiple times before the server is started', async () => {
    const app = medley();

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.send('success');
    });

    const [
      res1,
      res2,
    ] = await Promise.all([
      app.request('/'),
      app.request('/', {responseType: 'buffer'}),
    ]);

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body, 'success');

    assert.strictEqual(res2.statusCode, 200);
    assert.deepStrictEqual(res2.body, Buffer.from('success'));
  });

  it('should not follow redirects by default', async () => {
    const app = medley();

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.redirect(302, '/redirect');
    });

    const res = await app.request('/');
    assert.strictEqual(res.statusCode, 302);
    assert.strictEqual(res.headers.location, '/redirect');
  });

  it('should not throw on error response codes by default', async () => {
    const app = medley();

    app.register(selfRequest);

    const res = await app.request('/no-route');
    assert.strictEqual(res.statusCode, 404);
  });

  it('should not retry on error response codes by default', async () => {
    const app = medley();

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.error(new Error('retry test error'));
    });

    const res = await app.request('/');
    assert.strictEqual(res.retryCount, 0);
    assert.strictEqual(res.statusCode, 500);
  });

  it('should have a custom User-Agent header by default', async () => {
    const app = medley();

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.send(req.headers['user-agent']);
    });

    const res = await app.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, '@medley/self-request (https://github.com/medleyjs/self-request)');
  });

  it('should accept `gotDefaults` plugin option', async () => {
    const app = medley();

    app.register(selfRequest, {
      gotDefaults: {
        followRedirect: true,
        responseType: 'buffer',
      },
    });

    app.get('/', (req, res) => {
      res.redirect(302, '/redirect');
    });

    app.get('/redirect', (req, res) => {
      res.send('redirected');
    });

    const res = await app.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, Buffer.from('redirected'));
  });

  it('should accept `gotDefaults.headers` without overriding the plugin’s default headers', async () => {
    const app = medley();

    app.register(selfRequest, {
      gotDefaults: {
        headers: {
          'x-custom-header': 'test',
        },
      },
    });

    app.get('/', (req, res) => {
      res.send(req.headers);
    });

    const res = await app.request('/', {responseType: 'json'});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body['x-custom-header'], 'test');
    assert.strictEqual(res.body['user-agent'], '@medley/self-request (https://github.com/medleyjs/self-request)');
  });

  it('should make requests relative a sub-app’s `basePath`', async () => {
    const app = medley();
    const subApp = app.createSubApp('/v1');

    subApp.get('/', (req, res) => {
      res.send('success');
    });

    subApp.register(selfRequest);

    const res = await subApp.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'success');
  });

  it('should make requests relative a sub-app’s `basePath` when the plugin is registered on the root app', async () => {
    const app = medley();
    const subApp = app.createSubApp('/v1');

    subApp.get('/', (req, res) => {
      res.send('success');
    });

    app.register(selfRequest);

    const res = await subApp.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'success');
  });

  it('should support HTTPS apps', async () => {
    const app = medley({
      https: {
        cert: fs.readFileSync(path.join(__dirname, 'certs/test.crt')),
        key: fs.readFileSync(path.join(__dirname, 'certs/test.key')),
      },
    });

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.send('success');
    });

    const res = await app.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'success');
  });

  it('should support HTTP/2 apps', async () => {
    const app = medley({
      http2: {
        allowHTTP1: true,
        cert: fs.readFileSync(path.join(__dirname, 'certs/test.crt')),
        key: fs.readFileSync(path.join(__dirname, 'certs/test.key')),
      },
    });

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.send('success');
    });

    const res = await app.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'success');
  });

  it('should support custom servers', async () => {
    const app = medley({
      server: http.createServer(),
    });

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.send('success');
    });

    const res = await app.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'success');
  });

  it('should work if the server is already listening', async () => {
    const app = medley();

    app.register(selfRequest);

    app.get('/', (req, res) => {
      res.send('success');
    });

    await app.listen();

    const res = await app.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'success');
  });

  it('should reject if the url is not provided', async () => {
    const app = medley();

    app.register(selfRequest);

    await assert.rejects(
      () => app.request(),
      new TypeError('Missing `url` argument or option')
    );

    await assert.rejects(
      () => app.request({}),
      new TypeError('Missing `url` argument or option')
    );
  });

  it('should timeout after 2000ms by default', async function() {
    this.timeout(3000);

    const app = medley();

    app.register(selfRequest);

    app.get('/', () => {
      // Cause timeout by not responding
    });

    await assert.rejects(
      app.request('/'),
      {
        name: 'TimeoutError',
        code: 'ETIMEDOUT',
      }
    );
  });

});
