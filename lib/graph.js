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
      return this.graph_.connect(this.key, that);
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
    drop: function() {
      var self = this;
      function filterOut(es) {
        return es.filter(function(e) { return e != self });
      }
      this.graph_.edges_ = filterOut(this.graph_.edges_);
      this.from.outgoing_ = filterOut(this.from.outgoing_);
      this.to.incoming_ = filterOut(this.to.incoming_);
    },
    toString: function() {
      return this.from + ' -> ' + this.to;
    }
  },
  function(defs, graph, vfrom, vto) {
    return { graph_: graph, from: vfrom, to: vto};
  }
);

var Graph = Top.extend({
    connect: function (from, to) {
      var vfrom = this.vertex(from);
      var vto = this.vertex(to);
      var e = Edge.new_(this, vfrom, vto);
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
      key = (key === undefined) ? this.nextId_() : key;
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
    var counter = -1;
    function nextId() { return ++counter; }
    return { vertices_: [], vertexByKey_: {}, edges_: [], nextId_: nextId };
  }
);


module.exports = Graph;
