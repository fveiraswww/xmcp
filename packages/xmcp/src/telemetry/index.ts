import { randomUUID } from "node:crypto";
import {
  Telemetry,
  TelemetryEvent,
  TelemetrySpan,
  JsonRpcRequest,
  ToolCallData,
  RequestData,
} from "./models";

export class TelemetryService implements Telemetry {
  private events: TelemetryEvent[] = [];
  private spans: Map<string, TelemetrySpan> = new Map();
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  sendEvent(event: TelemetryEvent): void {
    if (this.debug) {
      console.log("[Telemetry]", JSON.stringify(event, null, 2));
    }
  }

  addEvent(event: TelemetryEvent): void {
    this.events.push(event);
    this.sendEvent(event);
  }

  getEvents(): TelemetryEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }

  sendEvents(): void {
    this.events.forEach((event) => this.sendEvent(event));
  }

  startSpan(operationName: string, parentSpanId?: string): TelemetrySpan {
    const span: TelemetrySpan = {
      traceId: parentSpanId
        ? this.getTraceIdFromParent(parentSpanId)
        : randomUUID(),
      spanId: randomUUID(),
      parentSpanId,
      operationName,
      startTime: Date.now(),
      tags: {},
      status: "ok",
      events: [],
    };

    this.spans.set(span.spanId, span);
    return span;
  }

  finishSpan(span: TelemetrySpan): void {
    span.endTime = Date.now();
    this.spans.delete(span.spanId);
  }

  private getTraceIdFromParent(parentSpanId: string): string {
    const parentSpan = this.spans.get(parentSpanId);
    return parentSpan?.traceId ?? randomUUID();
  }

  createToolCallEvent(
    methodName: string,
    rpcRequestId: string | number,
    parameters: Record<string, any>,
    traceId?: string,
    spanId?: string
  ): TelemetryEvent {
    const startTime = Date.now();

    const toolCallData: ToolCallData = {
      methodName,
      rpcRequestId,
      parameters,
      startTime,
    };

    return {
      type: "tool_call",
      data: toolCallData,
      result: "pending",
      timestamp: startTime,
      traceId,
      spanId,
    };
  }

  createRequestEvent(
    rpcRequestId: string | number,
    endpoint: string,
    method: string,
    headers: Record<string, string | string[] | undefined>,
    traceId?: string,
    spanId?: string
  ): TelemetryEvent {
    const requestData: RequestData = {
      rpcRequestId,
      endpoint,
      method,
      headers,
    };

    return {
      type: "request",
      data: requestData,
      result: "pending",
      timestamp: Date.now(),
      traceId,
      spanId,
    };
  }

  updateToolCallResult(event: TelemetryEvent, result?: any, error?: any): void {
    if (event.type === "tool_call" && event.data) {
      const toolCallData = event.data as ToolCallData;
      const endTime = Date.now();

      toolCallData.endTime = endTime;

      // calc duration
      if (toolCallData.startTime) {
        toolCallData.duration = endTime - toolCallData.startTime;
      }

      if (error) {
        toolCallData.error = error;
        event.result = "error";
      } else {
        toolCallData.result = result;
        event.result = "success";
      }
    }
  }

  // parse json-rpc messages to extract tool calls
  extractToolCallsFromJsonRpc(messages: JsonRpcRequest[]): {
    methodName: string;
    rpcRequestId: string | number;
    parameters: Record<string, any>;
  }[] {
    return messages
      .filter((msg) => msg.method && msg.id !== undefined && msg.id !== null)
      .map((msg) => ({
        methodName: msg.method,
        rpcRequestId: msg.id!,
        parameters: msg.params || {},
      }));
  }
}

export const telemetryService = new TelemetryService();

export function createTelemetryService(
  debug: boolean = false // maybe default to on or omit?
): TelemetryService {
  return new TelemetryService(debug);
}
