export type EventType = "tool_call" | "request" | "response";
export type EventResult = "success" | "error" | "pending";

// unify in single schema entry point since it's used in the transport layer
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id?: string | number | null;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string | number | null;
}

export type ToolCallData = {
  methodName: string; // JSON-RPC method name (e.g. "tools/call")
  rpcRequestId: string | number; // JSON-RPC request ID
  parameters: Record<string, any>; // tool name is inside params
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  duration?: number;
  startTime?: number;
  endTime?: number; // probably removed because we don't have any global timestamps
  requestHeaders?: Record<string, string | string[] | undefined>;
  sessionId?: string;
};

export type RequestData = {
  rpcRequestId: string | number;
  endpoint: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
};

export type ResponseData = {
  rpcRequestId: string | number;
  statusCode: number;
  responseTime: number;
};

export type TraceableData = ToolCallData | RequestData | ResponseData;

export interface TelemetryEvent {
  type: EventType;
  data: TraceableData;
  result: EventResult;
  timestamp: number;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
}

export interface TelemetrySpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, string | number | boolean>;
  status: "ok" | "error" | "timeout";
  events: TelemetryEvent[];
}

export interface Telemetry {
  sendEvent(event: TelemetryEvent): void;
  startSpan(operationName: string, parentSpanId?: string): TelemetrySpan;
  finishSpan(span: TelemetrySpan): void;
}
