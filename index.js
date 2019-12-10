"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const https = require("https");
const querystring = require("querystring");
const url_1 = require("url");
class AmplitudeApiError extends Error {
    constructor(message, response) {
        super(message);
        this.response = response;
    }
}
exports.AmplitudeApiError = AmplitudeApiError;
class AmplitudeClient {
    constructor(apiKey, options = {}) {
        options = options || {};
        this.apiKey = apiKey;
        this.enabled = options.enabled !== false;
        this.appVersion = options.appVersion || null;
        this.setTime = options.setTime === true;
        this.maxRetries = options.maxRetries || 2;
        this.timeoutMs = options.timeoutMs || 5000;
        this.endpoint = options.endpoint || 'https://api.amplitude.com';
        this.logging = options.logging;
    }
    async track(event, reqOptions) {
        var _a;
        if (this.setTime) {
            event.time = Date.now();
        }
        if (this.appVersion) {
            event.app_version = this.appVersion;
        }
        if (!event.insert_id) {
            event.insert_id = Date.now() + '_' + Math.random().toString().substring(2);
        }
        const formData = {
            api_key: this.apiKey,
            events: [event],
        };
        const options = Object.assign(Object.assign({ method: 'POST', path: '/2/httpapi' }, reqOptions), { headers: Object.assign(Object.assign({}, (_a = reqOptions) === null || _a === void 0 ? void 0 : _a.headers), { 'Content-Type': 'application/json' }) });
        return this.sendRequest(options, formData);
    }
    async identify(identify, reqOptions) {
        var _a;
        const formData = {
            api_key: this.apiKey,
            identification: JSON.stringify(identify)
        };
        const options = Object.assign(Object.assign({ method: 'POST', path: '/identify' }, reqOptions), { headers: Object.assign(Object.assign({}, (_a = reqOptions) === null || _a === void 0 ? void 0 : _a.headers), { 'Content-Type': 'application/x-www-form-urlencoded' }) });
        return this.sendRequest(options, formData);
    }
    async groupIdentify(groupType, groupValue, groupProps, reqOptions) {
        var _a;
        const formData = {
            api_key: this.apiKey,
            identification: JSON.stringify({
                group_type: groupType,
                group_value: groupValue,
                group_properties: groupProps
            })
        };
        const options = Object.assign(Object.assign({ method: 'POST', path: '/groupidentify' }, reqOptions), { headers: Object.assign(Object.assign({}, (_a = reqOptions) === null || _a === void 0 ? void 0 : _a.headers), { 'Content-Type': 'application/x-www-form-urlencoded' }) });
        return this.sendRequest(options, formData);
    }
    async sendRequest(options, formData, retryCount = 0) {
        const url = new url_1.URL(this.endpoint);
        options.protocol = url.protocol;
        options.hostname = url.hostname;
        options.port = url.port;
        options.timeout = this.timeoutMs;
        let byteLength;
        let postData;
        options.headers = options.headers || {};
        switch (options.headers['Content-Type']) {
            case 'application/x-www-form-urlencoded':
                postData = querystring.stringify(formData);
                byteLength = Buffer.byteLength(postData);
                break;
            case 'application/json':
                postData = JSON.stringify(formData);
                byteLength = Buffer.byteLength(postData);
                break;
            default:
                throw new Error(`Unknown Content-Type header: "${options.headers['Content-Type']}"`);
        }
        options.headers['Content-Length'] = byteLength;
        if (!this.enabled) {
            return {
                body: Buffer.alloc(0),
                start: new Date(),
                end: new Date(),
                requestOptions: options,
                responseHeaders: {},
                statusCode: 0,
                succeeded: true,
                retryCount: 0,
                requestData: formData,
            };
        }
        const apiUrl = `${options.protocol}//${options.hostname}` +
            `${options.port ? ':' + options.port : ''}${options.path}`;
        const result = await new Promise((resolve, reject) => {
            const start = new Date();
            try {
                const httpLib = options.protocol === 'https:' ? https : http;
                this.log('debug', `sending request to Amplitude API ${apiUrl} (${byteLength} bytes)`);
                const req = httpLib.request(options, (res) => {
                    res.on('error', reject);
                    const chunks = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => {
                        resolve({
                            start,
                            end: new Date(),
                            // should be "success" for successful requests
                            // or some kind of message for failures (or HTML for 502s)
                            body: Buffer.concat(chunks),
                            requestOptions: options,
                            responseHeaders: res.headers,
                            statusCode: res.statusCode || 0,
                            succeeded: res.statusCode === 200,
                            retryCount,
                            requestData: formData,
                        });
                    });
                });
                req.on('error', reject);
                req.write(postData);
                req.end();
            }
            catch (e) {
                reject(e);
            }
        });
        // https://developers.amplitude.com/#http-status-codes--amp--retrying-failed-requests
        const retryableStatusCodes = {
            500: true,
            502: true,
            503: true,
            504: true,
        };
        const elapsed = result.end.getTime() - result.start.getTime();
        if (!retryableStatusCodes[result.statusCode] || retryCount >= this.maxRetries) {
            if (result.succeeded) {
                this.log('info', `successful Amplitude API call to ${apiUrl} ` +
                    `after ${retryCount} retries (${elapsed}ms)`);
                return result;
            }
            const message = `Amplitude API call to ${apiUrl} failed with ` +
                `status ${result.statusCode} after ${retryCount} retries`;
            this.log('error', message + ` (${elapsed}ms)`);
            throw new AmplitudeApiError(message, result);
        }
        this.log('warn', `retrying Amplitude request to ${apiUrl} ` +
            `(status code: ${result.statusCode}, retries: ${retryCount})`);
        return this.sendRequest(options, formData, retryCount + 1);
    }
    log(level, message) {
        if (!this.logging || typeof (this.logging) !== 'function') {
            return;
        }
        try {
            this.logging(level, message);
        }
        catch (e) {
            // ignore logging errors
        }
    }
}
exports.AmplitudeClient = AmplitudeClient;
//# sourceMappingURL=index.js.map