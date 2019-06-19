# @medley/self-request

[![npm Version](https://img.shields.io/npm/v/@medley/self-request.svg)](https://www.npmjs.com/package/@medley/self-request)
[![Build Status](https://travis-ci.org/medleyjs/self-request.svg?branch=master)](https://travis-ci.org/medleyjs/self-request)
[![Coverage Status](https://coveralls.io/repos/github/medleyjs/self-request/badge.svg?branch=master)](https://coveralls.io/github/medleyjs/self-request?branch=master)
[![dependencies Status](https://img.shields.io/david/medleyjs/self-request.svg)](https://david-dm.org/medleyjs/self-request)

A [Medley](https://www.npmjs.com/package/@medley/medley) plugin that augments an app to be able to make HTTP requests to itself for testing purposes.

It adds a `request` method to the `app` that will start the app server and make HTTP requests to it using [`got`](https://www.npmjs.com/package/got).

## Installation

```sh
npm install @medley/self-request --save-dev
# or
yarn add @medley/self-request --dev
```

## Usage

**app.js**
```js
const medley = require('@medley/medley');
const app = medley();

app.get('/', (req, res) => {
  res.send('Hello');
});

module.exports = app;
```

**test.js**
```js
const assert = require('assert').strict;

function buildApp() {
  const app = require('./app');

  app.register(require('@medley/self-request'));

  return app;
}

describe('app', () => {
  it('should say Hello', async () => {
    const app = buildApp();
    const res = await app.request('/');

    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'Hello');
  });
});
```

### API

#### `app.request([url], [options])`

Returns a Promise for a [got `response` object](https://www.npmjs.com/package/got#response).

> Automatically calls [`app.listen()`](https://github.com/medleyjs/medley/blob/master/docs/App.md#listen) if the server is not already listening.

##### `url`

Type: `string`

The route URL to request.

```js
app.request('/hello');
```

##### `options`

Type: `Object`

Any of the [`got` options](https://www.npmjs.com/package/got#options).

```js
app.request('/hello', {
  method: 'POST',
  body: 'Greetings',
});

app.request({
  url: '/hello',
  method: 'POST',
  body: 'Greetings',
});
```

### Plugin Options

#### `basePath`

Type: `string`<br>
Default: `app.basePath`

A path prefix that will be prepended to all requests.

```js
const medley = require('@medley/medley');
const app = medley();

app.get('/v1/hello', (req, res) => {
  res.send('Hello');
});

app.register(require('@medley/self-request'), {
  basePath: '/v1',
});

(async () => {
  const res = await app.request('/hello');
  console.log(res.body); // -> 'Hello'
})();
````

Since the default is `app.basePath`, testing [sub-apps](https://github.com/medleyjs/medley/blob/master/docs/App.md#createsubapp) is trivial:

```js
const medley = require('@medley/medley');
const app = medley();

const v1Routes = app.createSubApp('/v1');

v1Routes.get('/hello', (req, res) => {
  res.send('Hello');
});

v1Routes.register(require('@medley/self-request'));

(async () => {
  const res = await v1Routes.request('/hello');
  console.log(res.body); // -> 'Hello'
})();
````

#### `gotDefaults`

Type: `Object`

A set of [`got` options](https://www.npmjs.com/package/got#options) that will be used as the defaults for each request.

These options will be merged in with the following defaults set by `self-request`:

```js
{
  retry: 0,
  followRedirect: false,
  throwHttpErrors: false,
  rejectUnauthorized: false,
}
```

**Example:**

```js
const medley = require('@medley/medley');
const app = medley();

app.get('/', (req, res) => {
  res.send('Hello');
});

app.register(require('@medley/self-request'), {
  gotDefaults: {
    encoding: null,
  },
});

(async () => {
  const res = await app.request('/hello');
  console.log(res.body); // -> <Buffer 48 65 6c 6c 6f>
})();
```

**Note:** The `baseUrl` got option cannot be used since it is automatically set by this plugin.
