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
  create: function(key) {
    return spawn(this, {incoming_: [], outgoing_: [], key: key});
  },
  outgoing: function() {
    return this.outgoing_;
  },
  incoming: function() {
    return this.incoming_;
  }
});

var Graph = spawn({}, {
  connect: function (from, to) {
    var vfrom = this.vertexByKey_[from];
    if (!vfrom) {
      vfrom = Vertex.create(from);
      this.vertices_.push(vfrom);
      this.vertexByKey_[from] = vfrom;
    }
    var vto = this.vertexByKey_[to];
    if (!vto) {
      var vto = Vertex.create(to);
      this.vertices_.push(vto);
      this.vertexByKey_[to] = vto;
    }
    var e = {from: vfrom, to: vto};
    this.edges_.push(e);
    vfrom.outgoing_.push(e);
    vto.incoming_.push(e);
    return e;
  },
  vertices: function() {
    return this.vertices_;
  },
  neighbors: function(v) {
    return this.edges_.filter(function(e) {
      return e.from.key === v }).map(function(e) { return e.to.key });
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
  });

  describe('neighbors', function() {
    it('are all vertices connected from a given vertex', function() {
      var g = Graph.create();
      g.connect(6, 3);
      g.connect(6, 2);
      expect(g.neighbors(6)).toEqual([3, 2]);
    });
  });
});
