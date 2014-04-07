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

    var t = e.to;
    dagFromTree(g, visited, t).connectTo(result);
  });

  return result;
}

exports.dagFromTree = dagFromTree;
