var spawn = require('./top').spawn;

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
  },
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
    var vfrom = this.vertex(from);
    var vto = this.vertex(to);
    var e = Edge.create(vfrom, vto);
    this.edges_.push(e);
    vfrom.outgoing_.push(e);
    vto.incoming_.push(e);
    return e;
  },
  vertices: function() {
    return this.vertices_;
  },
  vertex: function(key) {
    var result = this.vertexByKey_[key];
    if (!result) {
      result = Vertex.create(this, key);
      this.vertices_.push(result);
      this.vertexByKey_[key] = result;
    }
    return result;
  },
  create: function() {
    return spawn(this, { vertices_: [], vertexByKey_: {}, edges_: [] });
  }
});


module.exports = Graph;
