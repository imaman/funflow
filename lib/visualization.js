require('util-is');
var util = require('util');
var Graph = require('../lib/graph');

function dagFromTree(g, visited, v) {
  var targets = v.targets();
  if (targets.length === 0)
    return v;

  if (targets.length === 1) {
    return dagFromTree(g, visited, targets[0]);
  }

  var result = g.vertex(- Number(v));
  v.outgoing().forEach(function(e) {
    if (e.type === 'next') {
      result.connectTo(e.to);
      e.drop();
      return;
    }

    dagFromTree(g, visited, e.to).connectTo(result);
  });

  return result;
}

function treeFromDsl(dsl, prefix) {
  prefix = prefix || '_temp_';
  var g = Graph.new_();
  var n = 0;

  function go(dsl) {
    if (util.isArray(dsl)) {
      return dsl.reduceRight(function(soFar, current) {
        var result = go(current);
        if (soFar) {
          var e = result.connectTo(soFar);
          e.type = 'next';
        }
        return result;
      }, null);
    }

    if (util.isPureObject(dsl)) {
      var name = prefix + n;
      n += 1;
      var root = g.vertex(name);
      Object.keys(dsl).forEach(function(k) {
        var v = go(dsl[k]);
        root.connectTo(v);
      });
      return root;
    }

    return g.vertex(dsl);
  }
  go(dsl);
  return g;
}

exports.dagFromTree = dagFromTree;
exports.treeFromDsl = treeFromDsl;

