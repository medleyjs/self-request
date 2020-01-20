# @medley/self-request

[![npm Version](https://img.shields.io/npm/v/@medley/self-request.svg)](https://www.npmjs.com/package/@medley/self-request)
[![Build Status](https://travis-ci.org/medleyjs/self-request.svg?branch=master)](https://travis-ci.org/medleyjs/self-request)
[![Coverage Status](https://coveralls.io/repos/github/medleyjs/self-request/badge.svg?branch=master)](https://coveralls.io/github/medleyjs/self-request?branch=master)
[![dependencies Status](https://img.shields.io/david/medleyjs/self-request.svg)](https://david-dm.org/medleyjs/self-request)

A [Medley](https://www.npmjs.com/package/@medley/medley) plugin that augments an app to be able to make HTTP requests to itself for testing purposes.

It adds a `.request()` method to the `app` that will start the app server and make HTTP requests to it using [`got`](https://www.npmjs.com/package/got).

## Installation

```sh
npm install @medley/self-request --save-dev
# or
yarn add @medley/self-request --dev
```

## Example Usage

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
const app = require('./app');

app.register(require('@medley/self-request'));

describe('app', () => {
  it('should say Hello', async () => {
    const res = await app.request('/');

    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'Hello');
  });
});
```

## Plugin Options

### `gotDefaults`

Type: `Object`

An object of [`got` options](https://www.npmjs.com/package/got#options) that will be used as the defaults for each request.

These options will be merged in with the following defaults:

```js
{
  retry: 0,
  timeout: 2000,
  followRedirect: false,
  throwHttpErrors: false,
  rejectUnauthorized: false,
  headers: {
    'user-agent': '@medley/self-request (https://github.com/medleyjs/self-request)',
  },
}
```

**Example:**

```js
const medley = require('@medley/medley');
const app = medley();

app.get('/', (req, res) => {
  res.send({ hello: 'world' });
});

app.register(require('@medley/self-request'), {
  gotDefaults: {
    responseType: 'json',
  },
});

(async () => {
  const res = await app.request('/hello');
  console.log(res.body); // { hello: 'world' }
})();
```

## API

### `app.request([url], [options])`

Returns a Promise that resolves with a [got `response` object](https://www.npmjs.com/package/got#response).

> Automatically calls [`app.listen()`](https://github.com/medleyjs/medley/blob/master/docs/App.md#listen) if the server is not already listening.

#### `url`

Type: `string`

The route URL to request.

```js
app.request('/hello');
```

#### `options`

Type: `Object`

An object of [`got` options](https://www.npmjs.com/package/got#options).

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

#### Usage with sub-apps

If called on a prefixed [sub-app](https://github.com/medleyjs/medley/blob/master/docs/App.md#createsubapp),
the `url` is relative to that sub-app.

```js
const medley = require('@medley/medley');
const app = medley();

app.register(require('@medley/self-request'));

const v1App = app.createSubApp('/v1');

v1App.get('/hello', (req, res) => {
  res.send('Hello');
});

(async () => {
  const res = await v1App.request('/hello');
  console.log(res.body); // -> 'Hello'
})();
````
