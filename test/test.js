'use strict';

const assert = require('assert');
const fs = require('fs');
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

    const res2 = await app.request('/', {encoding: null});
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

    try {
      await app.request('/no-route', {throwHttpErrors: true});

      return Promise.reject(new assert.AssertionError({
        message: 'Expected the request to throw',
      }));
    } catch (err) {
      assert.strictEqual(err.statusCode, 404);
      assert.strictEqual(err.response.retryCount, 0);
    }
  });

  it('should accept `gotDefaults` plugin option', async () => {
    const app = medley();

    app.register(selfRequest, {
      gotDefaults: {
        followRedirect: true,
        encoding: null,
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

  it('should accept `basePath` plugin option', async () => {
    const app = medley();

    app.register(selfRequest, {basePath: '/v1'});

    app.get('/v1/', (req, res) => {
      res.send('success');
    });

    const res = await app.request('/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'success');
  });

  it('should default `basePath` to the app’s `basePath`', async () => {
    const app = medley();
    const subApp = app.createSubApp('/v1');

    subApp.register(selfRequest);

    subApp.get('/', (req, res) => {
      res.send('success');
    });

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

});
