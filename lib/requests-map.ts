export class RequestsMap<T, S> {
  private map = {};

  constructor() {}

  public addEntry(requestId, handler) {
    this.map[requestId] = handler;
    return true;
  }

  public getEntry(requestId) {
    return this.map[requestId];
  }

  public removeEntry(requestId) {
    delete this.map[requestId];
    return true;
  }

  public getMap() {
    return this.map;
  }
}
