import { RequestsMap } from '../lib/requests-map';

describe('RequestsMap', () => {
  let requestsMap: RequestsMap<any, any>;

  beforeEach(() => {
    requestsMap = new RequestsMap();
  });

  describe('addEntry', () => {
    it('should add an entry to the map', () => {
      const handler = jest.fn();
      requestsMap.addEntry('request1', handler);
      expect(requestsMap.getMap()).toEqual({ request1: handler });
    });

    it('should return true', () => {
      const handler = jest.fn();
      const result = requestsMap.addEntry('request1', handler);
      expect(result).toBe(true);
    });
  });

  describe('getEntry', () => {
    it('should return the handler for a given requestId', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      requestsMap.addEntry('request1', handler1);
      requestsMap.addEntry('request2', handler2);
      const result = requestsMap.getEntry('request1');
      expect(result).toBe(handler1);
    });

    it('should return undefined if requestId does not exist in map', () => {
      const result = requestsMap.getEntry('request1');
      expect(result).toBeUndefined();
    });
  });

  describe('removeEntry', () => {
    it('should remove an entry from the map', () => {
      const handler = jest.fn();
      requestsMap.addEntry('request1', handler);
      requestsMap.removeEntry('request1');
      expect(requestsMap.getMap()).toEqual({});
    });

    it('should return true', () => {
      const handler = jest.fn();
      requestsMap.addEntry('request1', handler);
      const result = requestsMap.removeEntry('request1');
      expect(result).toBe(true);
    });
  });

  describe('getMap', () => {
    it('should return the map', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      requestsMap.addEntry('request1', handler1);
      requestsMap.addEntry('request2', handler2);
      const result = requestsMap.getMap();
      expect(result).toEqual({ request1: handler1, request2: handler2 });
    });
  });
});
