var Graph = require('../lib/graph');
require('util-is');
var util = require('util');

function rootFromDsl(dsl, prefix) {
  var g = treeFromDsl(dsl, prefix);
  var roots = g.vertices().filter(function(v) { return v.incoming().length === 0});
  if (roots.length !== 1)
    throw new Error('Found ' + roots.length + ' roots');
  return roots[0];
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

exports.treeFromDsl = treeFromDsl;
exports.rootFromDsl = rootFromDsl;

