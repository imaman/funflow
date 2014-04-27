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

  var completed = [];
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

    if (v.dsl.payload()) {
      check(v.incoming().length === 1)
      var src = v.sources()[0];
      check(src.outputReady);
      v.dsl.payload()(null, src.output, trap);
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

function functionFromTree(node) {
  return node.accept({
    fork: function(v) {
      var zipped = v.map(function(current) {
        return [current, functionFromTree(current)];
      });
      return function() {
        var args = u_.toArray(arguments);
        var next = args.pop();

        var completedSlots = {};
        var result = {};
        var wasCalled = false;
        var open = true;
        var numSlots = zipped.length;
        function merge(node, e) {
          if (!open)
            return;

          if (e) {
            open = false;
            return next(e);
          }
          var output = u_.toArray(arguments).slice(2);
          if (node.outArity() === 1) {
            output = output[0];
          }
          result[node.slot()] = output;

          if (v.merge()) {
            if (wasCalled)
              return;
            v.merge()(result, function() {
              wasCalled = true;
              var args = u_.toArray(arguments);
              next.apply(null, args);
            });
          } else if (Object.keys(result).length === numSlots) {
            next(null, result);
          }
        }
        zipped.forEach(function(current) {
          var func = current[1];

          var bounded = merge.bind(null, current[0]);
          func.apply(null, args.concat(bounded));
        });
      }
    },
    sequence: function(v) {
      var kids = v.map(functionFromTree);
      return function() {
        var args = u_.toArray(arguments);
        var next = args.pop();

        var reduced = kids.reduceRight(function(soFar, current) {
          return function() {
            var args = u_.toArray(arguments);
            args.push(soFar);
            return current.apply(null, args);
          }
        }, next);

        reduced.apply(null, args);
      }
    },
    computation: function(v) {
      return function() {
        var args = u_.toArray(arguments);
        var e = args[0];
        var trap = u_.last(args);
        var payload = v.payload();
        if (e) {
          var arity = v.inArity();
          args = u_.range(arity).map(function(index) {
            if (index === 0) return e;
            if (index === arity - 1) return trap;
            return null;
          });
        }
        try {
          function noArgsToNull() {
            if (arguments.length === 0)
              return trap(null);
            return trap.apply(null, arguments);
          }
          args[args.length - 1] = noArgsToNull;
          payload.apply(null, args);
        } catch (e) {
          trap(e);
        }
      }
    }
  });
}

exports.newFlow = function(dsl) { return functionFromTree(treeFromDsl(dsl)) }
exports.prepare = prepare;

