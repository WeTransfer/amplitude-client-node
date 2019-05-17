import * as amplitude from '../';
import * as express from 'express';
import * as http from 'http'
import expect = require('expect.js');

describe('Amplitude API', () => {
    let app: express.Application;
    let server: http.Server;
    let endpoint: string;

    beforeEach((done) => {
        const port = 19567;
        endpoint = `http://localhost:${port}`;
        app = express();
        app.use(express.urlencoded({ extended: true }));
        server = app.listen(port, done);
    });

    afterEach((done) => {
        server.close(done);
    });

    describe('track event', () => {
        it('should track event', async () => {
            let callCount = 0;
            let reqBody: any;
            app.post('/httpapi', (req, res) => {
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
                event: JSON.stringify(event)
            });
        });

        it('should track event with automatic insert_id and retries', async () => {
            let callCount = 0;
            let reqBody: any;
            app.post('/httpapi', (req, res) => {
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
            expect(JSON.parse(res.requestData.event)).to.have.property('insert_id');

            expect(res).to.have.property('body').a(Buffer);
            expect(res.body.toString('utf8')).to.equal('hello world');

            expect(reqBody).to.eql({
                api_key: 'xxx',
                event: JSON.stringify(event)
            });
        });

        it('should throw error if maxRetries is reached', async () => {
            let callCount = 0;
            app.post('/httpapi', (req, res) => {
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
                expect(error).to.have.property('message',
                    `Amplitude API call failed with status 502 (${endpoint}/httpapi)`);
                expect(error.response.statusCode).to.equal(502);
                expect(error.response.succeeded).to.equal(false);
                return;
            }

            throw new Error('expected error to be thrown');
        });

        it('should not track event if not enabled', async () => {
            let callCount = 0;
            app.post('/httpapi', (req, res) => {
                callCount++;
                res.status(200);
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
});
