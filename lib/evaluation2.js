var u_ = require('underscore');
var treeFromDsl = require('./dsl').treeFromDsl;
var Graph = require('./graph');
var show = require('./visualization').show;


function compile(root) {
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

function check(cond) {
  if (!cond)
    throw new Error('inconceivable');
}

function prepare(dsl) {
  var node = treeFromDsl(dsl);
  var done = function() {
    throw new Error('no done() function was assigned');
  }

  var s = compile(node);
  dfs(s, function(v) {
    v.countdown = v.sources().length;
  });

  function uniNext(vertex, e, v) {
    vertex.output = v;
    vertex.outputReady = true;
    vertex.targets().forEach(function(t) {
      t.countdown -= 1;
    });
    var nextGeneration = vertex.targets().filter(function(t) { return t.countdown === 0 });
    nextGeneration.forEach(function(t) {
      exec(t, uniNext.bind(null, t));
    });
    if (nextGeneration.length === 0) {
      done(e, v);
    }
  }

  function exec(v, trap) {
    v.sources().forEach(function(s) {
      check(s.outputReady);
    });

    if (v.payload) {
      check(v.incoming().length === 1)
      var src = v.sources()[0];
      check(src.outputReady);
      v.payload(null, src.output, trap);
      return;
    }

    check(v.incoming() === 1);
    var src = v.sources()[0];
    trap(null, src,output, trap);
  }

  return function(e, next) {
    done = next;
    uniNext(s, null);
  }
}


exports.prepare = prepare;

function run() {
  var arr = u_.times(400, function() { return 'A' });
  arr.push(function(v, next) {
    next(null, v.toLowerCase());
  });

  var flow = prepare(arr);
  flow(null, function() {
    var args = u_.toArray(arguments);
    console.dir(args);
    if (args[0]) {
      console.log(args[0].stack);
      return;
    }
    check(args[1] === 'a');
  });
}

run();
