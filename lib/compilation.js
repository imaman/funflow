var u_ = require('underscore');
var treeFromDsl = require('./dsl').treeFromDsl;
var Graph = require('./graph');
var Top = require('./top').Top;
var extend = require('node.extend');
var flow = require('./flow');
var createDispatchable = require('./execution').createDispatchable;


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
        v.inArity = node.inArity();
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
  var isMerge = v.type === 'MERGE';
  v.dispatchable = createDispatchable(isMerge);

  var sources = v.sources();
  if (v.payload && sources.length === 1) {
    return;
  }


  if (!isMerge) {
    check(sources.length === 1);
    v.payload = function() {
      var args = u_.toArray(arguments);
      var next = args.pop();
      next.apply(null, args);
    };
  }
}

function checkUniquenessOfIds(v0) {
  var ids = [];
  preOrder(v0, function(v) { ids.push(v.key); });
  ids.forEach(function(curr) {
    check(curr >= 0);
    check(curr < ids.length);
    check(u_.isNumber(curr));
  });
  check(u_.uniq(ids).length === ids.length);
}

function checkUniquenessOfNames(v0) {
  var countByName = {};
  preOrder(v0, function(v) {
    var name = v.dsl.name();
    var curr = countByName[name];
    curr = curr || 0;
    countByName[name] = curr + 1;
  });

  Object.keys(countByName).forEach(function(name) {
    var count = countByName[name];
    if (count === 1)
      return;

    throw new Error('Found ' + count + ' computations named "' + name + '". Each computation should have a unique name.');
  });
}

var Compiler = Top.extend({
  compile: function(dsl) {
    if (arguments.length > 1)
      dsl = u_.toArray(arguments);

    var root = treeFromDsl(dsl);
    transform(this.options_, root);
    var v0 = graphFromTree(root);

    checkUniquenessOfIds(v0);
    if (this.options_.requireUniqueNames)
      checkUniquenessOfNames(v0);

    preOrder(v0, normalize);

    var vertexById = {};
    var max = -1;
    function traverse() {
      var q = [v0];
      while(q.length > 0) {
        var s = q.pop();
        if (vertexById[s])
          continue;

        vertexById[s.key] = s;
        max = Math.max(max, s.key);
        s.targets().forEach(function(t) { q.push(t) });
      }
    }

    traverse();
    var orderedVertices = u_.range(max + 1).map(function(key) {
      return vertexById[key];
    });

    return flow.create(root, v0, orderedVertices, this.options_);
  }
}, function(defs, options) {
  if (options) {
    var notAllowed = Object.keys(options).filter(function(k) {
      return ['requireUniqueNames', 'translateErrors', 'branchOp'].indexOf(k) < 0;
    });
    if (notAllowed.length)
      throw new Error('Unrecognized option(s): ' + notAllowed.join(',') + ' in ' + JSON.stringify(options));
  }

  var temp = extend({ branchOp: 'SINGLE' }, options);
  return { options_: temp }
});

function compile(dsl) {
  if (arguments.length > 1)
    dsl = u_.toArray(arguments);
  return Compiler.new_().compile(dsl);
}


function newFlow(dsl) {
  if (arguments.length > 1)
    dsl = u_.toArray(arguments);
  return compile(dsl);
}

exports.newFlow = newFlow;
exports.compile = compile;
exports.Compiler = Compiler;

