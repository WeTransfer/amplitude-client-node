# amplitude-api

A simple wrapper around Amplitude's Groups and HTTP APIs.

Features:
- automatic, configurable retry with generated `insert_id`
- TypeScript support
- No dependencies
- event tracking (`/httpapi`)
- group identification (`/groupidentify`)
- there are tests
- requires Node v8 or higher

## Installation
```
npm install amplitude-api
```

## Usage
```javascript
const amplitude = require('amplitude-api');
// for typescript:
// import * as amplitude from 'amplitude-api';

const client = new amplitude.AmplitudeClient('api key', {
    // all keys are optional
    maxRetries: 3,
    timeoutMs: 2500,
    enabled: true, // disable sending of events, useful in dev
    endpoint: 'https://api.amplitude.com',
    appVersion: '1.2.3', // will set app_version in all outgoing events
    setTime: true, // will set time to Date.now() in all outgoing events
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
