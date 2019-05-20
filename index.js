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
    }
    async track(event, reqOptions) {
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
            event: JSON.stringify(event),
        };
        const options = Object.assign({ method: 'POST', path: '/httpapi' }, reqOptions);
        return this.sendRequest(options, formData);
    }
    async identify(identify, reqOptions) {
        const formData = {
            api_key: this.apiKey,
            identification: JSON.stringify(identify)
        };
        const options = Object.assign({ method: 'POST', path: '/identify' }, reqOptions);
        return this.sendRequest(options, formData);
    }
    async groupIdentify(groupType, groupValue, groupProps, reqOptions) {
        const formData = {
            api_key: this.apiKey,
            identification: JSON.stringify({
                group_type: groupType,
                group_value: groupValue,
                group_properties: groupProps
            })
        };
        const options = Object.assign({ method: 'POST', path: '/groupidentify' }, reqOptions);
        return this.sendRequest(options, formData);
    }
    async sendRequest(options, formData, retryCount = 0) {
        const url = new url_1.URL(this.endpoint);
        options.protocol = url.protocol;
        options.hostname = url.hostname;
        options.port = url.port;
        options.timeout = this.timeoutMs;
        const postData = querystring.stringify(formData);
        options.headers = options.headers || {};
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = Buffer.byteLength(postData);
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
        const result = await new Promise((resolve, reject) => {
            const start = new Date();
            try {
                const httpLib = options.protocol === 'https:' ? https : http;
                const req = httpLib.request(options, (res) => {
                    res.on('error', reject);
                    const chunks = [];
                    res.on('data', chunk => chunks.push(chunk));
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
        if (!retryableStatusCodes[result.statusCode] || retryCount >= this.maxRetries) {
            if (result.succeeded) {
                return result;
            }
            const urlData = result.requestOptions;
            const url = `${urlData.protocol}//${urlData.hostname}` +
                `${urlData.port ? ':' + urlData.port : ''}${urlData.path}`;
            throw new AmplitudeApiError(`Amplitude API call failed with status ${result.statusCode} (${url})`, result);
        }
        return this.sendRequest(options, formData, retryCount + 1);
    }
}
exports.AmplitudeClient = AmplitudeClient;
//# sourceMappingURL=index.js.map