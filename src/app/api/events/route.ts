import { subscribe, unsubscribe } from '@/lib/event-bus';
import { getState } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

export async function GET() {
  let streamController: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      const initPayload = encoder.encode(
        `event: state\ndata: ${JSON.stringify(getState())}\n\n`,
      );
      controller.enqueue(initPayload);
      subscribe(controller);
    },
    cancel() {
      unsubscribe(streamController);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
