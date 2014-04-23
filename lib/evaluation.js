var u_ = require('underscore');

function compile(node) {
  return node.accept({
    fork: function(v) {
      var zipped = v.map(function(current) {
        return [current.slot(), compile(current)];
      });
      return function() {
        var args = u_.toArray(arguments);
        var next = args.pop();

        var countdown = zipped.length;
        var result = {};
        function merge(k, e) {
          if (countdown === 0)
            return;

          if (e) {
            countdown = 0;
            return next(e);
          }
          result[k] = u_.toArray(arguments).slice(2);
          --countdown;
          if (countdown === 0)
            next(null, result);
        }
        zipped.forEach(function(current) {
          var key = current[0];
          var func = current[1];

          var bounded = merge.bind(null, key);
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
    terminal: function(v) {
      return function() {
        var args = u_.toArray(arguments);
        var e = args[0];
        var trap = u_.last(args);
        if (e) return trap(e);
        try {
          v.payload().apply(null, args.slice(1));
        } catch (exception) {
          trap(exception);
        }
      }
    },
    rescue: function(v) {
      return function() {
        var args = u_.toArray(arguments);
        var e = args[0];
        var trap = u_.last(args);
        var payload = v.payload();
        if (e) {
          args = u_.range(payload.length).map(function(index) {
            if (index === 0) return e;
            if (index === payload.length - 1) return trap;
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
