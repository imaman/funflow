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

  function translate(dsl) {
    var root;
    if (util.isArray(dsl)) {
      var name = prefix + n;
      n += 1;
      root = g.vertex(name);

      dsl.forEach(function(current) {
        var child = translate(current);
        root.connectTo(child);
      });
      return root;
    }

    if (util.isPureObject(dsl)) {
      var name = prefix + n;
      n += 1;
      root = g.vertex(name);
      Object.keys(dsl).forEach(function(k) {
        var v = translate(dsl[k]);
        root.connectTo(v);
      });
      root.type = 'conc';
      return root;
    }

    return g.vertex(dsl);
  }
  translate(dsl);
  return g;
}

exports.treeFromDsl = treeFromDsl;
exports.rootFromDsl = rootFromDsl;

