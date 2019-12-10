import * as amplitude from '../';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import expect = require('expect.js');

describe('Amplitude API', () => {
    let app: express.Application;
    let server: http.Server;
    let endpoint: string;
    const port = 19567;

    beforeEach((done) => {
        endpoint = `http://localhost:${port}`;
        app = express();
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());
        server = app.listen(port, done);
    });

    afterEach((done) => {
        server.close(done);
    });

    describe('track event', () => {
        it('should track event', async () => {
            let callCount = 0;
            let reqBody: any;
            app.post('/2/httpapi', (req, res) => {
                callCount++;
                reqBody = req.body;
                res.send('hello world');
            });

            const start = new Date();

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
            });
            const event: amplitude.AmplitudeEventData = {
                user_id: '12345',
                event_type: 'my event',
                ip: '1.2.3.4'
            };
            const res = await client.track(event);

            expect(callCount).to.equal(1);

            expect(res).to.have.property('start').greaterThan(start.getTime() - 1);
            expect(res).to.have.property('end').greaterThan(start.getTime());
            expect(res).to.have.property('statusCode', 200);
            expect(res).to.have.property('retryCount', 0);

            expect(res).to.have.property('body').a(Buffer);
            expect(res.body.toString('utf8')).to.equal('hello world');

            expect(reqBody).to.eql({
                api_key: 'xxx',
                events: [ event ],
                options: {}
            });
        });

        it('should track event with time and app_version', async () => {
            let callCount = 0;
            let reqBody: any;
            app.post('/2/httpapi', (req, res) => {
                callCount++;
                reqBody = req.body;
                res.send('hello world');
            });

            const start = new Date();

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
                setTime: true,
                appVersion: '7.6.8'
            });
            const event: amplitude.AmplitudeEventData = {
                user_id: '12345',
                event_type: 'my event',
                ip: '1.2.3.4'
            };
            const res = await client.track(event);

            expect(callCount).to.equal(1);

            expect(res).to.have.property('start').greaterThan(start.getTime() - 1);
            expect(res).to.have.property('end').greaterThan(start.getTime());
            expect(res).to.have.property('statusCode', 200);
            expect(res).to.have.property('retryCount', 0);

            expect(res).to.have.property('body').a(Buffer);
            expect(res.body.toString('utf8')).to.equal('hello world');

            expect(reqBody).to.have.property('events');
            expect(reqBody.events).to.be.an('array');
            const reqEvent = reqBody.events[0];
            expect(reqEvent).to.have.property('time');
            expect(reqEvent.time).to.be.greaterThan(start.getTime() - 1);
            expect(reqBody).to.eql({
                api_key: 'xxx',
                events: [{
                    ...event,
                    time: reqEvent.time,
                    app_version: '7.6.8'
                }],
                options: {}
            });
        });

        it('should track event with automatic insert_id and retries', async () => {
            let callCount = 0;
            let reqBody: any;
            app.post('/2/httpapi', (req, res) => {
                callCount++;
                if (callCount < 5) {
                    res.sendStatus(502);
                    return;
                }

                reqBody = req.body;
                res.send('hello world');
            });

            const start = new Date();

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
                maxRetries: 5,
            });
            const event: amplitude.AmplitudeEventData = {
                user_id: '12345',
                event_type: 'my event',
                ip: '1.2.3.4'
            };
            const res = await client.track(event);

            expect(callCount).to.equal(5);

            expect(res).to.have.property('start').greaterThan(start.getTime() - 1);
            expect(res).to.have.property('end').greaterThan(start.getTime());
            expect(res).to.have.property('statusCode', 200);
            expect(res).to.have.property('retryCount', 4);
            expect(res).to.have.property('requestData');
            const events = res.requestData.events;
            expect(events).to.be.an('array');
            expect(events).to.have.length(1);
            expect(events[0]).to.have.property('insert_id');

            expect(res).to.have.property('body').a(Buffer);
            expect(res.body.toString('utf8')).to.equal('hello world');

            expect(reqBody).to.eql({
                api_key: 'xxx',
                events: [ event ],
                options: {},
            });
        });

        it('should track event with min_id_length', async () => {
            let callCount = 0;
            let reqBody: any;
            app.post('/2/httpapi', (req, res) => {
                callCount++;
                reqBody = req.body;
                res.send('hello world');
            });

            const start = new Date();

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
            });
            const event: amplitude.AmplitudeEventData = {
                user_id: '12345',
                event_type: 'my event',
                ip: '1.2.3.4'
            };
            const res = await client.track(event, {}, {
                min_id_length: 1,
            });

            expect(callCount).to.equal(1);

            expect(res).to.have.property('start').greaterThan(start.getTime() - 1);
            expect(res).to.have.property('end').greaterThan(start.getTime());
            expect(res).to.have.property('statusCode', 200);
            expect(res).to.have.property('retryCount', 0);

            expect(res).to.have.property('body').a(Buffer);
            expect(res.body.toString('utf8')).to.equal('hello world');

            expect(reqBody).to.eql({
                api_key: 'xxx',
                events: [event],
                options: {
                    min_id_length: 1
                }
            });
        });

        it('should throw error if maxRetries is reached', async () => {
            let callCount = 0;
            app.post('/2/httpapi', (req, res) => {
                callCount++;
                res.status(502);
                res.send('nope');
            });

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
                maxRetries: 5,
            });
            const event: amplitude.AmplitudeEventData = {
                user_id: '12345',
                event_type: 'my event',
                ip: '1.2.3.4'
            };
            try {
                await client.track(event);
            } catch (e) {
                const error = e as amplitude.AmplitudeApiError<any>;
                expect(callCount).to.equal(6);
                expect(e).to.be.a(amplitude.AmplitudeApiError);
                expect(error).to.have.property('response');
                expect(error).to.have.property('message', `Amplitude API call to ` +
                    `${endpoint}/2/httpapi failed with status 502 after 5 retries`);
                expect(error.response.statusCode).to.equal(502);
                expect(error.response.succeeded).to.equal(false);
                return;
            }

            throw new Error('expected error to be thrown');
        });

        [ 400, 413, 429, 501 ].forEach((status) => {
            it(`should not retry for ${status} status code`, async () => {
                let callCount = 0;
                app.post('/2/httpapi', (req, res) => {
                    callCount++;
                    res.status(status);
                    res.send('nope');
                });

                const client = new amplitude.AmplitudeClient('xxx', {
                    endpoint,
                    maxRetries: 5,
                });
                const event: amplitude.AmplitudeEventData = {
                    user_id: '12345',
                    event_type: 'my event',
                    ip: '1.2.3.4'
                };
                try {
                    await client.track(event);
                } catch (e) {
                    const error = e as amplitude.AmplitudeApiError<any>;
                    expect(callCount).to.equal(1);
                    expect(e).to.be.a(amplitude.AmplitudeApiError);
                    expect(error).to.have.property('response');
                    expect(error).to.have.property('message', `Amplitude API call to ` +
                        `${endpoint}/2/httpapi failed with status ${status} after 0 retries`);
                    expect(error.response.statusCode).to.equal(status);
                    expect(error.response.succeeded).to.equal(false);
                    return;
                }

                throw new Error('expected error to be thrown');
            });
        });

        it('should not track event if not enabled', async () => {
            let callCount = 0;
            app.post('/2/httpapi', (req, res) => {
                callCount++;
                res.sendStatus(200);
            });

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
                enabled: false,
            });
            const event: amplitude.AmplitudeEventData = {
                user_id: '12345',
                event_type: 'my event',
                ip: '1.2.3.4'
            };

            await client.track(event);
            expect(callCount).to.equal(0);
        });

        it('should throw error for invalid status code', async () => {
            let callCount = 0;
            app.post('/2/httpapi', (req, res) => {
                callCount++;
                res.sendStatus(501);
            });

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
            });
            const event: amplitude.AmplitudeEventData = {
                user_id: '12345',
                event_type: 'my event',
                ip: '1.2.3.4'
            };

            try {
                await client.track(event);
            } catch (e) {
                const error = e as amplitude.AmplitudeApiError<any>;
                expect(callCount).to.equal(1);
                expect(e).to.be.a(amplitude.AmplitudeApiError);
                expect(error).to.have.property('response');
                expect(error.response.statusCode).to.equal(501);
                expect(error.response.succeeded).to.equal(false);
                return;
            }

            throw new Error('expected error to be thrown');
        });
    });

    describe('group identify', () => {
        it('should not identify group if not enabled', async () => {
            let callCount = 0;
            app.post('/groupidentify', (req, res) => {
                callCount++;
                res.status(200);
            });

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
                enabled: false,
            });
            await client.groupIdentify('team id', '12345', {hello: 'world'});
            expect(callCount).to.equal(0);
        });

        it('should identify group', async () => {
            let callCount = 0;
            let reqBody: any;
            app.post('/groupidentify', (req, res) => {
                callCount++;
                reqBody = req.body;
                res.send('hello world');
            });

            const start = new Date();

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
            });

            const res = await client.groupIdentify('team id', '12345', {
                hello: 'world',
            });

            expect(callCount).to.equal(1);

            expect(res).to.have.property('start').greaterThan(start.getTime() - 1);
            expect(res).to.have.property('end').greaterThan(start.getTime());
            expect(res).to.have.property('statusCode', 200);
            expect(res).to.have.property('retryCount', 0);

            expect(res).to.have.property('body').a(Buffer);
            expect(res.body.toString('utf8')).to.equal('hello world');

            expect(reqBody).to.eql({
                api_key: 'xxx',
                identification: JSON.stringify({
                    group_type: 'team id',
                    group_value: '12345',
                    group_properties: {
                        hello: 'world'
                    }
                })
            });
        });
    });

    describe('identify', () => {
        it('should not identify if not enabled', async () => {
            let callCount = 0;
            app.post('/identify', (req, res) => {
                callCount++;
                res.status(200);
            });

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
                enabled: false,
            });
            await client.identify({
                user_id: '12345',
                city: 'Beantown',
                groups: {
                    'Team ID': '34567'
                }
            });
            expect(callCount).to.equal(0);
        });

        it('should identify user', async () => {
            let callCount = 0;
            let reqBody: any;
            app.post('/identify', (req, res) => {
                callCount++;
                reqBody = req.body;
                res.send('hello world');
            });

            const start = new Date();

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint,
            });

            const res = await client.identify({
                user_id: '12345',
                city: 'Beantown',
                groups: {
                    'Team ID': '34567'
                }
            });

            expect(callCount).to.equal(1);

            expect(res).to.have.property('start').greaterThan(start.getTime() - 1);
            expect(res).to.have.property('end').greaterThan(start.getTime());
            expect(res).to.have.property('statusCode', 200);
            expect(res).to.have.property('retryCount', 0);

            expect(res).to.have.property('body').a(Buffer);
            expect(res.body.toString('utf8')).to.equal('hello world');

            expect(reqBody).to.eql({
                api_key: 'xxx',
                identification: JSON.stringify({
                    user_id: '12345',
                    city: 'Beantown',
                    groups: {
                        'Team ID': '34567'
                    }
                })
            });
        });
    });

    describe('https', () => {
        let httpsServer: http.Server;
        const key = fs.readFileSync(path.join(__dirname, 'ssl', 'self-signed-key.pem'));
        const cert = fs.readFileSync(path.join(__dirname, 'ssl', 'self-signed-cert.pem'));
        const httpsPort = port + 1;

        beforeEach((done) => {
            const options: https.ServerOptions = {
                cert: cert,
                key: key,
            };
            httpsServer = https.createServer(options, app).listen(httpsPort, done);
        });

        afterEach((done) => {
            httpsServer.close(done);
        });

        it('should invoke https endpoint', async () => {
            const httpsEndpoint = `https://localhost:${httpsPort}`;
            let callCount = 0;
            let reqBody: any;
            app.post('/2/httpapi', (req, res) => {
                callCount++;
                reqBody = req.body;
                res.send('hello world');
            });

            const start = new Date();

            const client = new amplitude.AmplitudeClient('xxx', {
                endpoint: httpsEndpoint,
            });
            const event: amplitude.AmplitudeEventData = {
                user_id: '12345',
                event_type: 'my event',
                ip: '1.2.3.4'
            };
            const res = await client.track(event, {
                rejectUnauthorized: false
            });

            expect(callCount).to.equal(1);

            expect(res).to.have.property('start').greaterThan(start.getTime() - 1);
            expect(res).to.have.property('end').greaterThan(start.getTime());
            expect(res).to.have.property('statusCode', 200);
            expect(res).to.have.property('retryCount', 0);

            expect(res).to.have.property('body').a(Buffer);
            expect(res.body.toString('utf8')).to.equal('hello world');

            expect(reqBody).to.eql({
                api_key: 'xxx',
                events: [ event ],
                options: {}
            });
        });
    });
});
