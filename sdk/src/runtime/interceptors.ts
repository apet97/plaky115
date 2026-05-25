export type RequestInterceptorContext = {
  url: string;
  init: RequestInit;
  operationId: string;
};

export type ResponseInterceptorContext = {
  url: string;
  response: Response;
  body: unknown;
  operationId: string;
};

export type Interceptors = {
  request?: (ctx: RequestInterceptorContext) => Promise<{ url: string; init: RequestInit }> | { url: string; init: RequestInit };
  response?: (ctx: ResponseInterceptorContext) => Promise<void> | void;
};
