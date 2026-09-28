/** Durable Objects — stateful object lifecycle, not a plain serverless handler. */

export abstract class WaeDurableObject {
    abstract fetch(request: Request): Promise<Response>;

    protected handle(request: Request): Promise<Response> {
        return this.fetch(request);
    }
}
