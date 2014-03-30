function spawn(parent, props) {
  var defs = {}, key;
  for (key in props) {
    if (props.hasOwnProperty(key)) {
      defs[key] = {value: props[key], enumerable: true};
    }
  }
  return Object.create(parent, defs);
}


var Vertex = spawn({}, {
  create: function(graph, key) {
    return spawn(this, {graph_: graph, incoming_: [], outgoing_: [], key: key});
  },
  outgoing: function() {
    return this.outgoing_;
  },
  incoming: function() {
    return this.incoming_;
  },
  connectTo: function(that) {
    this.graph_.connect(this.key, that);
  },
  toString: function() {
    return '' + this.key;
  }
});

var Edge = spawn({}, {
  create: function(vfrom, vto) {
    return spawn(this, {from: vfrom, to: vto});
  },
  toString: function() {
    return this.from + ' -> ' + this.to;
  }
});

var Graph = spawn({}, {
  connect: function (from, to) {
    var vfrom = this.vertexByKey_[from];
    if (!vfrom) {
      vfrom = Vertex.create(this, from);
      this.vertices_.push(vfrom);
      this.vertexByKey_[from] = vfrom;
    }
    var vto = this.vertexByKey_[to];
    if (!vto) {
      var vto = Vertex.create(this, to);
      this.vertices_.push(vto);
      this.vertexByKey_[to] = vto;
    }
    var e = Edge.create(vfrom, vto);
    this.edges_.push(e);
    vfrom.outgoing_.push(e);
    vto.incoming_.push(e);
    return e;
  },
  vertices: function() {
    return this.vertices_;
  },
  create: function() {
    return spawn(this, { vertices_: [], vertexByKey_: {}, edges_: [] });
  }
});

describe('graph', function() {
  it('defines vertices when they are conneted', function() {
    var g = Graph.create();
    g.connect(6, 3);
    expect(g.vertices().map(function(v) { return v.key })).toEqual([6, 3]);
  });
  it('registers each vertex once', function() {
    var g = Graph.create();
    g.connect(6, 3);
    g.connect(6, 2);
    expect(g.vertices().map(function(v) { return v.key })).toEqual([6, 3, 2]);
  });
  it('returns an edge object when an edge is defined', function() {
    var g = Graph.create();
    var e = g.connect(6, 3);
    expect(e.from.key).toEqual(6);
    expect(e.to.key).toEqual(3);
  });
  describe('edge', function() {
    it('is string-representable by the keys of the vertices it connects', function() {
      var g = Graph.create();
      var e = g.connect(6, 3);
      expect(e.toString()).toEqual('6 -> 3');
    });
  });
  describe('vertex', function() {
    it('provides access to outgoing edges', function() {
      var g = Graph.create();
      var e = g.connect(6, 3);
      var v = e.from;
      g.connect(6, 2);
      expect(v.outgoing().map(function(x) { return x.to.key })).toEqual([3, 2]);
    });
    it('provides access to incoming edges', function() {
      var g = Graph.create();
      var e = g.connect(6, 2);
      var v = e.to;
      g.connect(4, 2);
      expect(v.incoming().map(function(x) { return x.from.key })).toEqual([6, 4]);
    });
    it('can create an edge', function() {
      var g = Graph.create();
      var e = g.connect(6, 2);
      var v = e.from;
      v.connectTo(3);
      expect(v.outgoing().map(function(x) { return x.to.key })).toEqual([2, 3]);
    });
    it('can create an edge when it started as a to vertex', function() {
      var g = Graph.create();
      var e = g.connect(12, 6);
      var v = e.to;
      v.connectTo(2);
      expect(v.outgoing().map(function(x) { return x.to.key })).toEqual([2]);
    });
    it('is string-representable by its key', function() {
      var g = Graph.create();
      var v = g.connect(12, 6).from;
      expect(v.toString()).toEqual('12');
    });
  });
});
