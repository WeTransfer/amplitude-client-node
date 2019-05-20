# amplitude-client-node

[![Build Status](https://travis-ci.com/WeTransfer/amplitude-client-node.svg?branch=master)](https://travis-ci.com/WeTransfer/amplitude-client-node)

A simple wrapper around Amplitude's Groups and HTTP APIs.

Features:
- automatic, configurable retry with generated `insert_id`
- TypeScript support
- No dependencies
- event tracking (`/httpapi`)
- group identification (`/groupidentify`)
- user identification (`/identify`)
- there are tests
- requires Node v8 or higher

## Installation
```
npm install amplitude-client-node
```

## Usage
```javascript
const amplitude = require('amplitude-client-node');
// for typescript:
// import * as amplitude from 'amplitude-client-node';

const client = new amplitude.AmplitudeClient('api key', {
    // all keys are optional
    maxRetries: 3,
    timeoutMs: 2500,
    enabled: true, // disable sending of events, useful in dev
    endpoint: 'https://api.amplitude.com',
    appVersion: '1.2.3', // will set app_version in all outgoing events
    setTime: true, // will set time to Date.now() in all outgoing events
    logging: (level, message) => {
        console.log(`${level}: ${message}`);
    }
});

const myEvent = {
    event_type: 'user register',
    user_id: '12345',
    event_properties: {
        source: 'marketing site',
        whatever: 'you want',
    },
    groups: {
        teamId: '67890'
    }
};

client.track(myEvent)
    .then((result) => {
        console.log(`successfully sent event to amplitude: ${result.body.toString('utf8')}`);
    })
    .catch((err) => {
        console.error(`amplitude api call failed after ${err.response.retryCount} retries: ${err.message}`);
    });
```

Successful calls return an `AmplitudeResponse` object:

```typescript
interface AmplitudeResponse<T> {
    statusCode: number;
    body: Buffer;
    start: Date;
    end: Date;
    requestOptions: https.RequestOptions;
    responseHeaders: http.IncomingHttpHeaders;
    succeeded: boolean;
    retryCount: number;
    requestData: T;
}
```

If all retries fail, or a non-retryable status code is returned from the Amplitude
API, then an error object is thrown that has a `response` property that is set to
the `AmplitudeResponse` object defined above.
