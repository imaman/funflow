var Graph = require('../lib/graph');
var Top = require('../lib/top').Top;
require('util-is');
var util = require('util');

function rootFromDsl(dsl, prefix) {
  return treeFromDsl(dsl, prefix);
/*  var g = treeFromDsl(dsl, prefix);
  var roots = g.vertices().filter(function(v) { return v.incoming().length === 0});
  if (roots.length !== 1)
    throw new Error('Found ' + roots.length + ' roots');
  return objectsFromVertices(roots[0]);*/
}

var TYPE_FORK = 'fork';

var Node = Top.extend({
  kids: function() { return this.kids_ },
  branchNames: function() {
    if (!this.isFork())
      throw new Error('Branches are present only in forks');
    return this.v_.outgoing().map(function(e) { return e.name })
  },
  key: function() { return this.v_.key },
  payload: function() { return this.v_.payload },
  isFork: function() {
    return this.v_.type === TYPE_FORK;
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
  return Node.new_(v, kids);
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
    var node;
    var kids;
    if (util.isArray(dsl)) {
      root = g.vertex(nextId());

      kids = [];
      dsl.forEach(function(current) {
        var child = translate(current);
        kids.push(child);
        root.connectTo(child.v_);
      });
      node = Node.new_(root, kids);
      return node; //root;
    }

    if (util.isPureObject(dsl)) {
      root = g.vertex(nextId());

      kids = [];
      Object.keys(dsl).forEach(function(k) {
        var v = translate(dsl[k]);
        kids.push(v);
        root.connectTo(v.v_).name = k;
      });
      root.type = TYPE_FORK;
      node = Node.new_(root, kids);
      return node; //root;
    }

    if (util.isFunction(dsl)) {
      root = g.vertex(nextId());
      root.payload = dsl;
      return Node.new_(root, []);
    }

    return Node.new_(g.vertex(dsl), []);
  }
  return translate(dsl);
}

exports.rootFromDsl = rootFromDsl;

