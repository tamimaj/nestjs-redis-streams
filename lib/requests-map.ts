export class RequestsMap<T extends string | number | symbol, S> {
  private map: Record<T, S> = {} as Record<T, S>;

  constructor() {}

  public addEntry(requestId: T, handler: S) {
    this.map[requestId] = handler;
    return true;
  }

  public getEntry(requestId: T) {
    return this.map[requestId];
  }

  public removeEntry(requestId: T) {
    delete this.map[requestId];
    return true;
  }

  public getMap() {
    return this.map;
  }
}
