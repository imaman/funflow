var u_ = require('underscore');

function compile(node) {
  return node.accept({
    fork: function(v) {
      var zipped = v.map(function(current) {
        return [current, compile(current)];
      });
      return function() {
        var args = u_.toArray(arguments);
        var next = args.pop();

        var countdown = zipped.length;
        var result = {};
        function merge(node, e) {
          if (countdown === 0)
            return;

          if (e) {
            countdown = 0;
            return next(e);
          }
          var output = u_.toArray(arguments).slice(2);
          if (node.outArity() === 1) {
            output = output[0];
          }
          result[node.slot()] = output;

          --countdown;

          if (v.merge()) {
            v.merge()(result, function() {
              var args = u_.toArray(arguments);
              next.apply(null, args);
            });
            if (countdown === 0)
              return;
          }
          if (countdown === 0)
            next(null, result);
        }
        zipped.forEach(function(current) {
          var func = current[1];

          var bounded = merge.bind(null, current[0]);
          func.apply(null, args.concat(bounded));
        });
      }
    },
    sequence: function(v) {
      var compiled = v.map(compile);
      return function() {
        var args = u_.toArray(arguments);
        var next = args.pop();

        var reduced = compiled.reduceRight(function(soFar, current) {
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
          payload.apply(null, args);
        } catch (e) {
          trap(e);
        }
      }
    }
  });
}

exports.compile = compile;
