var u_ = require('underscore');
var treeFromDsl = require('./dsl').treeFromDsl;
var Graph = require('./graph');
var Top = require('./top').Top;
var show = require('./visualization').show;


function graphFromTree(root) {
  var g = Graph.new_();
  function newVertex(name) {
    var v = g.vertex();
    v.name = name;
    return v;
  }

  function translate(root) {
    return root.accept({
      computation: function(node) {
        var v = newVertex(node.key());
        v.dsl = node;
        v.payload = node.payload();
        v.outArity = node.outArity();
        return {b: v, e: v};
      },
      fork: function(node) {
        var s = newVertex(node.key());
        var t = newVertex('MERGE OF ' + node.key());
        var arr = node.map(translate);
        var slots = node.map(function(kid) { return kid.slot() });
        t.type = 'MERGE';
        t.merge = node.merge() || function(output, next) {
          if (Object.keys(output).length === slots.length)
            next(null, output);
        };
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
  var v0 = newVertex('__v0');
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
    v.payloadWithExecution = function() {
      var args = u_.toArray(arguments);
      var execution = args.pop();
      var next = args.pop();

      var inputs = {};
      var err;
      var completedEdges = v.incoming().filter(function(edge) { return execution.get(edge.from, 'completed') });
      completedEdges.forEach(function(edge) {
        var s = edge.from;
        var outputOfS = execution.get(s, 'output');
        inputs[edge.slot] = outputOfS.slice(1);
        err = err || outputOfS[0];
        // TODO: move on as soon as an err is produced by any of the branches.
        // currently errors are detected only after all inputs are ready.
        if (s.outArity === 1) {
          inputs[edge.slot] = outputOfS.slice(1)[0];
        }
      });
      if (err) return next(err);
      v.merge(inputs, next);
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

var Execution = Top.extend({
  get: function(vertex, key) {
    var entry = this.buf_[vertex.key];
    return entry ? entry[key] : undefined;
  },
  put: function(vertex, key, value) {
    var index = vertex.key;
    var entry = this.buf_[index];
    if (!entry) {
      entry = {};
      this.buf_[index] = entry;
    }
    entry[key] = value;
  },
  continueFrom: function(t) {
    var execution = this;
    this.completed_.push(t);
    pump();

    function next(t) {
      var output = u_.toArray(arguments).slice(1);
      if (output.length === 0)
        output = [null];
      execution.put(t, 'output', output);
      execution.continueFrom(t);
    }

    function pump() {
      if (execution.pumpOn_)
        return;

      execution.pumpOn_ = true;
      try {
        while (execution.completed_.length > 0) {
          var curr = execution.completed_.pop();
          execution.put(curr, 'completed', true);

          var ts = curr.targets();
          if (ts.length === 0) {
            return execution.callback.apply(null, execution.get(curr, 'output'));
          }
          ts.forEach(function(t) {
            var outgoingArgs = [].concat(execution.get(curr, 'output'));
            var nextOfT = next.bind(null, t);
            outgoingArgs.push(nextOfT);
            try {
              if (t.merge) {
                outgoingArgs.push(execution);
                t.payloadWithExecution.apply(null, outgoingArgs);
              } else {
                t.payload.apply(null, outgoingArgs);
              }
            } catch (err) {
              nextOfT(err);
            }
          });
        }
      } finally {
        execution.pumpOn_ = false;
      }
    }
  },
  toString: function() {
    return '\n' + show(this.node, {connect: true, downArrows: true, forkArrows: true});
  },
  inspect: function() {
    console.log('retrospecting from ' + this.v0_);
    var self = this;
    dfs(this.v0_, function(v) {
      console.log('output of ' + v.key + ' is ' + JSON.stringify(self.buf_[v.key]));
    });
  }
}, function(defs, callback, root, v0) {
  return { buf_: [], callback: callback, root_: root, v0_: v0, completed_: [v0], pumpOn_: false }
});



function compile(dsl) {
  var node = treeFromDsl(dsl);
  var v0 = graphFromTree(node);

  var ids = [];
  dfs(v0, function(v) { ids.push(v.key) });
  ids.forEach(function(curr) {
    check(curr >= 0);
    check(curr < ids.length);
    check(u_.isNumber(curr));
  });
  check(u_.uniq(ids).length === ids.length);

  dfs(v0, normalize);

  return {
    asFunction: function() {
      return function(e) {
        var args = u_.toArray(arguments);
        var next = args.pop();
        if (e) return next(e);
        var execution = Execution.new_(next, node, v0);
        execution.put(v0, 'output', args);
        execution.continueFrom(v0);
        return execution;
      };
    },
    run: function() {
      return this.asFunction().apply(null, arguments);
    },
    toString: function() {
      return '\n' + show(node, {connect: true, downArrows: true, forkArrows: true});
    },
    retrospect: function() {
      console.log('retrospecting from ' + v0);
      dfs(v0, function(v) {
        console.log('output of ' + v.key + ' is ' + JSON.stringify(v.output));
      });
    }
  };
}

function prepare(dsl) {
  return compile(dsl).asFunction();
}

exports.prepare = prepare;
exports.compile = compile;


