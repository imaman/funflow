var spawn = require('./top').spawn;
var Top = require('./top').Top;

var Vertex = Top.extend({
    outgoing: function() {
      return this.outgoing_;
    },
    targets: function() {
      return this.outgoing().map(function(e) { return e.to });
    },
    incoming: function() {
      return this.incoming_;
    },
    sources: function() {
      return this.incoming().map(function(e) { return e.from });
    },
    connectTo: function(that) {
      this.graph_.connect(this.key, that);
    },
    toString: function() {
      return '' + this.key;
    },
  },
  function(defs, graph, key) {
    return { graph_: graph, incoming_: [], outgoing_: [], key: key };
  }
);

var Edge = Top.extend({
    toString: function() {
      return this.from + ' -> ' + this.to;
    }
  },
  function(defs, vfrom, vto) {
    return { from: vfrom, to: vto};
  }
);

var Graph = Top.extend({
    connect: function (from, to) {
      var vfrom = this.vertex(from);
      var vto = this.vertex(to);
      var e = Edge.new_(vfrom, vto);
      this.edges_.push(e);
      vfrom.outgoing_.push(e);
      vto.incoming_.push(e);
      return e;
    },
    edges: function() {
      return this.edges_;
    },
    vertices: function() {
      return this.vertices_;
    },
    vertex: function(key) {
      var result = this.vertexByKey_[key];
      if (!result) {
        result = Vertex.new_(this, key);
        this.vertices_.push(result);
        this.vertexByKey_[key] = result;
      }
      return result;
    }
  },
  function() {
    return { vertices_: [], vertexByKey_: {}, edges_: [] };
  }
);


module.exports = Graph;
