var u_ = require('underscore');
var treeFromDsl = require('./dsl').treeFromDsl;
var Graph = require('./graph');
var Top = require('./top').Top;
var extend = require('node.extend');
var Flow = require('./flow').Flow;
var createPayloadWithExecution = require('./execution').createPayloadWithExecution;


function transform(options, root) {
  var visitor = {
    computation: function(node) {},
    fork: function(node) {
      node.forEach(function(k) { k.accept(visitor) });
      node.forEach(function(k) {
        if (k.outArity() === undefined)
          k.setOutArity((options.branchOp === 'SINGLE') ? 1 : -1);
      });
    },
    sequence: function(node) {
      node.forEach(function(k) { k.accept(visitor) });
    }
  }
  root.accept(visitor);
}

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
        node.setSuffix(v.key);
        return {b: v, e: v};
      },
      fork: function(node) {
        var s = newVertex(node.key());
        var arr = node.map(translate);
        var t = newVertex('MERGE OF ' + node.key());
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
        t.outArity = node.outArity();
        return {b: s, e: t}
      },
      sequence: function(node) {
        var arr = node.map(translate);
        arr.reduce(function(prev, curr) {
          if (prev)
            prev.e.connectTo(curr.b);
          return curr;
        });
        var b = arr[0].b;
        var e = arr[arr.length-1].e;
        e.outArity = node.outArity();
        return {b: b, e: e};
      },
    });
  }

  var result = translate(root).b;
  var artificialRoot = newVertex('_SYNTHETIC_');
  artificialRoot.connectTo(result);
  return result;
}

function check(cond, message) {
  if (!cond)
    throw new Error(message || 'inconceivable');
}

function preOrder(v, callback) {
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
  if (v.payload && sources.length === 1) {
    return;
  }

  var isMerge = v.type === 'MERGE';
  if (isMerge) {
    v.payloadWithExecution = createPayloadWithExecution(v, isMerge);
    return;
  }

  check(sources.length === 1);
  v.payload = function() {
    var args = u_.toArray(arguments);
    var next = args.pop();
    next.apply(null, args);
  };
}

var Compiler = Top.extend({
  compile: function(dsl) {
    if (arguments.length > 1)
      dsl = u_.toArray(arguments);

    var root = treeFromDsl(dsl);
    transform(this.options_, root);
    var v0 = graphFromTree(root);

    var ids = [];
    preOrder(v0, function(v) { ids.push(v.key) });
    ids.forEach(function(curr) {
      check(curr >= 0);
      check(curr < ids.length);
      check(u_.isNumber(curr));
    });
    check(u_.uniq(ids).length === ids.length);

    preOrder(v0, normalize);

    return Flow.new_(root, v0);
  }
}, function(defs, options) {
  return { options_: extend({ branchOp: 'SINGLE' }, options) }
});

function compile(dsl) {
  if (arguments.length > 1)
    dsl = u_.toArray(arguments);
  return Compiler.new_().compile(dsl);
}


function newFlow(dsl) {
  if (arguments.length > 1)
    dsl = u_.toArray(arguments);
  return compile(dsl).asFunction();
}

exports.newFlow = newFlow;
exports.compile = compile;
exports.Compiler = Compiler;

