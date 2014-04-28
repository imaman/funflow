var u_ = require('underscore');
var treeFromDsl = require('./dsl').treeFromDsl;
var Graph = require('./graph');
var show = require('./visualization').show;


function graphFromTree(root) {
  var g = Graph.new_();

  function translate(root) {
    return root.accept({
      computation: function(node) {
        var v = g.vertex(node.key());
        v.dsl = node;
        v.payload = node.payload();
        return {b: v, e: v};
      },
      fork: function(node) {
        var s = g.vertex(node.key());
        var t = g.vertex('_BOT_' + node.key());
        var arr = node.map(translate);
        arr.forEach(function(kid) {
          s.connectTo(kid.b);
          kid.e.connectTo(t);
        });
        return {b: s, e: t}
      },
      sequence: function(node) {
        var arr = node.map(translate);
        arr.reduce(function(prev, curr) {
          if (prev)
            prev.e.connectTo(curr.b);
          return curr;
        });
        return {b: arr[0].b, e: arr[arr.length - 1].e}
      },
    });
  }

  var temp = translate(root).b;
  var v0 = g.vertex('__v0');
  v0.connectTo(temp);
  return v0;
}

function dfs(s, atVertex) {
  var q = [s];
  var visited = {};
  while(q.length > 0) {
    var curr = q.pop();
    if (visited[curr.key])
      continue;

    visited[curr.key] = true;
    atVertex(curr);
    curr.targets().forEach(function(t) {
      q.push(t);
    });
  }
}

function check(cond, message) {
  if (!cond)
    throw new Error(message || 'inconceivable');
}


exports.prepare = prepare;

function prepare(dsl) {
  var node = treeFromDsl(dsl);
  var v0 = graphFromTree(node);

  var completed = [v0];
  var pumpOn = false;

  function next(t, callback) {
    var output = u_.toArray(arguments).slice(2);
    t.output = output;
    completed.push(t);
    pump(callback);
  }

  function pump(callback) {
    if (pumpOn)
      return;

    pumpOn = true;
    try {
      while (completed.length > 0) {
        var curr = completed.pop();

        var ts = curr.targets();
        if (ts.length === 0) {
          return callback.apply(null, curr.output);
        }
        var t = ts[0];
        var outgoingArgs = [].concat(curr.output);
        outgoingArgs.push(next.bind(null, t, callback));
        t.payload.apply(null, outgoingArgs);
      }
    } finally {
      pumpOn = false;
    }
  }

  return function(e, next) {
    var args = u_.toArray(arguments);
    var next = args.pop();
    if (e) return next(e);
    v0.output = args;
    pump(next);
  }
}

