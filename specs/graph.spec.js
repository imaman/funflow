var Graph = require('../lib/graph');

describe('graph', function() {
  it('defines vertices when they are conneted', function() {
    var g = Graph.new_();
    g.connect(6, 3);
    expect(g.vertices().map(function(v) { return v.key })).toEqual([6, 3]);
  });
  it('registers each vertex once', function() {
    var g = Graph.new_();
    g.connect(6, 3);
    g.connect(6, 2);
    expect(g.vertices().map(function(v) { return v.key })).toEqual([6, 3, 2]);
  });
  it('allows a vertex to be created without an edge', function() {
    var g = Graph.new_();
    g.vertex(6);
    g.vertex(3);
    expect(g.vertices().map(function(v) { return v.key })).toEqual([6, 3]);
  });
  it('returns an edge object when an edge is defined', function() {
    var g = Graph.new_();
    var e = g.connect(6, 3);
    expect(e.from.key).toEqual(6);
    expect(e.to.key).toEqual(3);
  });
  describe('edge', function() {
    it('is string-representable by the keys of the vertices it connects', function() {
      var g = Graph.new_();
      var e = g.connect(6, 3);
      expect(e.toString()).toEqual('6 -> 3');
    });
  });
  describe('vertex', function() {
    it('provides access to outgoing edges', function() {
      var g = Graph.new_();
      var e = g.connect(6, 3);
      var v = e.from;
      g.connect(6, 2);
      expect(v.outgoing().map(function(x) { return x.to.key })).toEqual([3, 2]);
    });
    it('provides access to incoming edges', function() {
      var g = Graph.new_();
      var e = g.connect(6, 2);
      var v = e.to;
      g.connect(4, 2);
      expect(v.incoming().map(function(x) { return x.from.key })).toEqual([6, 4]);
    });
    it('can connect by key', function() {
      var g = Graph.new_();
      var e = g.connect(6, 2);
      var v = e.from;
      v.connectTo(3);
      expect(v.outgoing().map(function(x) { return x.to.key })).toEqual([2, 3]);
    });
    it('can connect by key when it started as a to vertex', function() {
      var g = Graph.new_();
      var e = g.connect(12, 6);
      var v = e.to;
      v.connectTo(2);
      expect(v.outgoing().map(function(x) { return x.to.key })).toEqual([2]);
    });
    it('can connect by vertex', function() {
      var g = Graph.new_();
      var v6 = g.vertex(6);
      var v2 = g.vertex(2);

      v6.connectTo(v2);
      expect(v6.outgoing().map(function(x) { return x.toString() })).toEqual(['6 -> 2']);
      expect(v2.incoming().map(function(x) { return x.toString() })).toEqual(['6 -> 2']);
      expect(g.vertices().map(function(v) { return v.toString() })).toEqual(['6', '2']);
    });
    it('is string-representable by its key', function() {
      var g = Graph.new_();
      var v = g.connect(12, 6).from;
      expect(v.toString()).toEqual('12');
    });
  });
});
