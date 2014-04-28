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
        v.outArity = node.outArity();
        return {b: v, e: v};
      },
      fork: function(node) {
        var s = g.vertex(node.key());
        var t = g.vertex('_BOT_' + node.key());
        var arr = node.map(translate);
        var slots = node.map(function(kid) { return kid.slot() });
        t.type = 'MERGE';
        arr.forEach(function(kid, index) {
          s.connectTo(kid.b);
          kid.e.connectTo(t).slot = slots[index];
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

function check(cond, message) {
  if (!cond)
    throw new Error(message || 'inconceivable');
}

function dfs(v, callback) {
  var visited = {};
  var q = [v];
  while(q.length > 0) {
    var curr = q.pop();
    if (visited[curr])
      continue;

    visited[curr] = true;
    callback(curr);
    curr.targets().forEach(function(t) {
      q.push(t);
    });
  }
}

function normalize(v) {
  var sources = v.sources();
  if (sources.length === 0)
    return;

  if (v.payload && sources.length === 1) {
    return;
  }

  var isMerge = v.type === 'MERGE';
  if (isMerge) {
    v.payload = function() {
      var args = u_.toArray(arguments);
      var next = args.pop();

      var inputs = {};
      v.incoming().forEach(function(edge) {
        var s = edge.from;
        inputs[edge.slot] = s.output.slice(1);
        if (s.outArity === 1) {
          inputs[edge.slot] = s.output.slice(1)[0];
        }
      });
      next(null, inputs);
    }
    return;
  }

  check(sources.length === 1);
  v.payload = function() {
    var args = u_.toArray(arguments);
    var next = args.pop();
    next.apply(null, args);
  };
}


exports.prepare = prepare;

function prepare(dsl) {
  var node = treeFromDsl(dsl);
  var v0 = graphFromTree(node);

  dfs(v0, normalize);

  var completed = [v0];
  var pumpOn = false;

  function next(t, callback) {
    var output = u_.toArray(arguments).slice(2);
    t.output = output;
    completed.push(t);
    pump(callback);
  }

  function isReady(v) {
    return v.sources().every(function(s) { return s.completed });
  }

  function pump(callback) {
    if (pumpOn)
      return;

    pumpOn = true;
    try {
      while (completed.length > 0) {
        var curr = completed.pop();
        curr.completed = true;

        var ts = curr.targets();
        if (ts.length === 0) {
          return callback.apply(null, curr.output);
        }
        ts.filter(isReady).forEach(function(t) {
          var outgoingArgs = [].concat(curr.output);
          var nextOfT = next.bind(null, t, callback);
          outgoingArgs.push(nextOfT);
          t.payload.apply(null, outgoingArgs);
        });
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

