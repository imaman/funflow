var Graph = require('../lib/graph');
var Top = require('../lib/top').Top;
require('util-is');
var util = require('util');

function rootFromDsl(dsl, prefix) {
  var g = treeFromDsl(dsl, prefix);
  var roots = g.vertices().filter(function(v) { return v.incoming().length === 0});
  if (roots.length !== 1)
    throw new Error('Found ' + roots.length + ' roots');
  return objectsFromVertices(roots[0]);
}

var Node = Top.extend({
  kids: function() { return this.kids_ },
  branchNames: function() {
    if (this.v_.type !== 'conc')
      throw new Error('Branches are present only in forks');
    return this.v_.outgoing().map(function(e) { return e.name })
  },
  isFork: function() {
    return this.v_.type === 'conc';
  },
  isSequence: function() {
    return !this.isFork() && (this.kids_.length > 0)
  },
  toString: function() { return this.v_.key }
}, function(defs, v, kids) {
  return { v_: v, kids_: kids }
});

function objectsFromVertices(v) {
  var kids = v.targets().map(function(t) { return objectsFromVertices(t) });
  var result = Node.new_(v, kids);
  result.key = v.key;
//  result.type = v.type;
  result.payload = v.payload;
  return result;
}

function treeFromDsl(dsl, prefix) {
  prefix = prefix || '_temp_';
  var g = Graph.new_();
  var n = 0;

  function nextId() {
    var result = prefix + n;
    n += 1;
    return result;
  }

  function translate(dsl) {
    var root;
    if (util.isArray(dsl)) {
      root = g.vertex(nextId());

      dsl.forEach(function(current) {
        var child = translate(current);
        root.connectTo(child);
      });
      return root;
    }

    if (util.isPureObject(dsl)) {
      root = g.vertex(nextId());
      Object.keys(dsl).forEach(function(k) {
        var v = translate(dsl[k]);
        root.connectTo(v).name = k;
      });
      root.type = 'conc';
      return root;
    }

    if (util.isFunction(dsl)) {
      root = g.vertex(nextId());
      root.payload = dsl;
      return root;
    }

    return g.vertex(dsl);
  }
  translate(dsl);
  return g;
}

exports.rootFromDsl = rootFromDsl;

