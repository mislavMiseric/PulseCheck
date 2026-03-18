import { subscribe, unsubscribe } from '@/lib/event-bus';
import { getState } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

export async function GET() {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const initPayload = encoder.encode(
        `event: state\ndata: ${JSON.stringify(getState())}\n\n`,
      );
      controller.enqueue(initPayload);
      subscribe(controller);
    },
    cancel(controller) {
      unsubscribe(controller as ReadableStreamDefaultController<Uint8Array>);
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
