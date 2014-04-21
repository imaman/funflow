var u_ = require('underscore');

function compile(v) {
  var compiled = v.targets().map(compile);
  if (v.type === 'conc') {
    var edges = v.outgoing();
    return function() {
      var args = u_.toArray(arguments);
      var next = args.pop();

      var countdown = edges.length;
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
      var zipped = u_.zip(edges.map(function(e) { return e.name }), compiled);
      zipped.forEach(function(current) {
        var key = current[0];
        var func = current[1];

        var bounded = merge.bind(null, key);
        func.apply(null, args.concat(bounded));
      });
    }
  }
  if (compiled.length > 0) {
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
  }
  return function() {
    var args = u_.toArray(arguments);
    if (args.length === 0)
      throw new Error('No error argument was passed in');
    if (args.length === 1)
      throw new Error('No next() argument was passed in');

    var numPassed = args.length - 2;
    var func = v.payload;
    var numExpected = func.length - 1;
    if (numExpected !== numPassed)
      throw new Error(v.payload.name + '() expects ' + numExpected + ' arguments but ' + numPassed + ' were passed');
    var e = args[0];
    var trap = u_.last(args);
    if (e) return trap(e);
    try {
      v.payload.apply(null, args.slice(1));
    } catch (exception) {
      trap(exception);
    }
  }
}

exports.compile = compile;
