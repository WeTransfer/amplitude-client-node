/// <reference types="node" />
import * as http from 'http';
import * as https from 'https';
declare type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface ClientOptions {
    appVersion?: string;
    enabled?: boolean;
    setTime?: boolean;
    maxRetries?: number;
    timeoutMs?: number;
    endpoint?: string;
    logging?: (level: LogLevel, message: string) => void;
}
interface CommonEventProps {
    app_version?: string;
    platform?: string;
    os_name?: string;
    os_version?: string;
    device_brand?: string;
    device_manufacturer?: string;
    device_model?: string;
    carrier?: string;
    country?: string;
    region?: string;
    city?: string;
    dma?: string;
    language?: string;
}
export interface SetProperties {
    $set?: {
        [key: string]: any;
    };
    $unset?: {
        [key: string]: any;
    };
    $setOnce?: {
        [key: string]: any;
    };
    $append?: {
        [key: string]: any;
    };
    $prepend?: {
        [key: string]: any;
    };
    $add?: {
        [key: string]: any;
    };
}
export interface ObjectProperties {
    [key: string]: any;
}
export declare type UserProperties = SetProperties | ObjectProperties;
export declare type GroupProperties = SetProperties | ObjectProperties;
export interface Groups {
    [groupType: string]: string | string[];
}
export interface AmplitudeEventData<TEventNames = string> extends CommonEventProps {
    event_type: TEventNames;
    user_id: string;
    device_id?: string;
    time?: number;
    event_properties?: {
        [key: string]: any;
    };
    user_properties?: UserProperties;
    groups?: Groups;
    price?: number;
    quantity?: number;
    revenue?: number;
    productId?: string;
    revenueType?: string;
    location_lat?: number;
    location_lng?: number;
    ip?: string;
    idfa?: string;
    idfv?: string;
    adid?: string;
    android_id?: string;
    event_id?: number;
    session_id?: number;
    insert_id?: string;
}
interface CommonUserIdentification extends CommonEventProps {
    user_properties?: UserProperties;
    groups?: Groups;
    paying?: 'true' | 'false';
    start_version?: string;
}
declare type UserIdIdentification = CommonUserIdentification & {
    user_id: string;
};
declare type UserDeviceIdentification = CommonUserIdentification & {
    device_id: string;
};
export declare type UserIdentification = UserIdIdentification | UserDeviceIdentification;
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
export declare class AmplitudeApiError<T> extends Error {
    readonly response: AmplitudeResponse<T>;
    constructor(message: string, response: AmplitudeResponse<T>);
}
interface ApiKeyData {
    api_key: string;
}
export interface AmplitudeEventRequestData<T = string> extends ApiKeyData {
    events: AmplitudeEventData<T>[];
}
export interface AmplitudeGroupIdentifyRequestData extends ApiKeyData {
    identification: string;
}
export interface AmplitudeIdentifyRequestData extends ApiKeyData {
    identification: string;
}
export declare class AmplitudeClient<TEventNames = string> {
    private readonly apiKey;
    private readonly enabled;
    private readonly appVersion;
    private readonly setTime;
    private readonly maxRetries;
    private readonly timeoutMs;
    private readonly endpoint;
    private readonly logging?;
    constructor(apiKey: string, options?: ClientOptions);
    track(event: AmplitudeEventData<TEventNames>, reqOptions?: https.RequestOptions): Promise<AmplitudeResponse<AmplitudeEventRequestData>>;
    identify(identify: UserIdentification, reqOptions?: https.RequestOptions): Promise<AmplitudeResponse<AmplitudeIdentifyRequestData>>;
    groupIdentify(groupType: string, groupValue: string, groupProps: GroupProperties, reqOptions?: https.RequestOptions): Promise<AmplitudeResponse<AmplitudeGroupIdentifyRequestData>>;
    private sendRequest;
    private log;
}
export {};
