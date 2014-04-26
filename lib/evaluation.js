var u_ = require('underscore');
var treeFromDsl = require('./dsl').treeFromDsl;
var Graph = require('./graph');


function compile(root) {
  var g = Graph.new_();

  function translate(root) {
    return root.accept({
      computation: function(node) {
        var v = g.vertex(node.key());
        v.dsl = node;
        return {b: v, e: v};
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

  return translate(root).b;
}

function prepare(dsl) {
  var node = treeFromDsl(dsl);
  var s = compile(node);
  return function(e, next) {
    node.accept({
      computation: function() {
        node.payload()(e, next);
      },
      sequence: function() {
        var curr = s;
        curr.dsl.payload()(null, seqNext);

        function seqNext() {
          var args = u_.toArray(arguments);
          var targets = curr.targets();
          if (targets.length === 1) {
            curr = targets[0];
            curr.dsl.payload()(null, seqNext);
          } else {
            next.apply(null, args);
          }
        }
      }
    });
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

