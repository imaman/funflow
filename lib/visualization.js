require('util-is');
var util = require('util');
var Graph = require('../lib/graph');
var Screen = require('../lib/screen').Screen;
var extend = require('node.extend');
var u_ = require('underscore');

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
function preOrder(root, f) {
  function dfs(v) {
    var outgoing = v.outgoing();
    if (outgoing.length === 0) {
      return f([], undefined);
    }
    if (outgoing.length === 1) {
      return f([], dfs(outgoing[0].to));
    }

    var acc = [];
    var next;
    outgoing.forEach(function(e) {
      if (e.type === 'next')
        next = dfs(e.to);
      else
        acc.push(dfs(e.to));
    });
    return f(acc, next);
  }

  return dfs(root);
}

function width(v) {
  return preOrder(v, function(kids, next) {
    if (kids.length === 0 && next === undefined)
      return 1;

    if (kids.length === 0)
      return next;

    var widthOfKids = kids.reduce(function(a,b) { return a + b }, 1);
    return Math.max(widthOfKids, next);
  });
}

function order(v) {
  var temp = [];
  var q = [];
  q.push({v: v, depth: 0});
  var visitCountByVertex = {};

  while(q.length > 0) {
    var current = q.shift();
    var visitCount = visitCountByVertex[current.v] || 0;
    visitCount += 1;
    visitCountByVertex[current.v] = visitCount;
    if (visitCount < current.v.incoming().length) {
      continue;
    }

    temp.push(current);
    current.v.targets().forEach(function(t) {
      q.push({v: t, depth: current.depth + 1});
    });
  }

  function groupBy(array, map) {
    var groups = {};
    array.forEach(function(o) {
      var group = JSON.stringify(map(o));
      groups[group] = groups[group] || [];
      groups[group].push(o);
    });
    return groups;
  }

  var groups = groupBy(temp, function(o) { return o.depth });
  var result = Object.keys(groups).map(function(k) {
    return {d: k, vs: groups[k].map(function(x) { return x.v })}
  });
  result.sort(function(x, y) {
    var dx = Number(x.d);
    var dy = Number(y.d);
    return (dx === dy) ? 0 : (dx < dy) ? -1 : 1;
  });
  return result.map(function(x) { return x.vs.map(function(v) { return v.toString() }) });
}
function dump(v, options) {
  options = extend({seqShift: 1, branchShift: 1}, options);
  function preOrder(v, screen) {
    screen.putAt(0, 0, v.key);

    var row = 1;
    var col = 1;
    if (v.type === 'conc') {
      v.targets().forEach(function(t) {
        var dim = preOrder(t, screen.nested(options.branchShift, col));
        col += dim.p;
        row = Math.max(row, dim.s);
      });
      if (v.targets().length) {
        row += options.branchShift;
      }
    } else {
      v.targets().forEach(function(t) {
        var dim = preOrder(t, screen.nested(row, options.seqShift));
        row += dim.s;
        col = Math.max(col, dim.p);
      });
      if (v.targets().length) {
        col += options.seqShift;
      }
    }

    return { s: row, p: col };
  }

  var screen = Screen.new_();
  preOrder(v, screen);
  return screen.render(1);
}

exports.dagFromTree = dagFromTree;
exports.treeFromDsl = treeFromDsl;
exports.width = width;
exports.order = order;
exports.dump = dump;

