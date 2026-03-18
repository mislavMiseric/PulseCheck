const GLOBAL_KEY = '__pulsecheck_event_bus__';

type Controller = ReadableStreamDefaultController<Uint8Array>;

interface EventBus {
  subscribers: Set<Controller>;
}

function getEventBus(): EventBus {
  const g = globalThis as unknown as Record<string, EventBus>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { subscribers: new Set() };
  }
  return g[GLOBAL_KEY];
}

const encoder = new TextEncoder();

function formatSSE(eventType: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function subscribe(controller: Controller) {
  getEventBus().subscribers.add(controller);
}

export function unsubscribe(controller: Controller) {
  getEventBus().subscribers.delete(controller);
}

export function broadcast(eventType: string, payload: unknown) {
  const message = formatSSE(eventType, payload);
  const bus = getEventBus();
  for (const controller of bus.subscribers) {
    try {
      controller.enqueue(message);
    } catch {
      bus.subscribers.delete(controller);
    }
  }
}

export function getSubscriberCount(): number {
  return getEventBus().subscribers.size;
}
