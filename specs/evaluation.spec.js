var Graph = require('../lib/graph');
var rootFromDsl = require('../lib/dsl').rootFromDsl;
var show = require('../lib/visualization').show;
var u_ = require('underscore');

describe('funflow compilation', function() {
  describe('of a function', function() {
    it('turns an (arg, ..., next) function into an (e, arg, ..., next) callback', function() {
      var root = rootFromDsl(
        function sum(x, y, next) { next(null, x + y) }
      );
      var flow = compile(root);
      var args;
      flow(null, 3, 7, function(e, v) {
        args = [e, v];
      });
      expect(args).toEqual([null, 10]);
    });
    it('supports incoming var. args', function() {
      var root = rootFromDsl(
        function sum(w, x, y, z, next) { next(null, w + x + y + z) }
      );
      var flow = compile(root);
      var args;
      flow(null, 'a', 'b', 'c', 'd', function(e, v) {
        args = [e, v];
      });
      expect(args).toEqual([null, 'abcd']);
    });
    it('supports outgoing var. args', function() {
      var root = rootFromDsl(
        function sumDiffProd(x1, x2, next) { next(null, x1 + x2, x1 - x2, x1 * x2) }
      );
      var flow = compile(root);
      var args;
      flow(null, 20, 4, function() {
        args = u_.toArray(arguments);
      });
      expect(args).toEqual([null, 24, 16, 80]);
    });
    it('does not call the function if the outside caller passed in an error value', function() {
      var called = false;
      var root = rootFromDsl(
        function f(next) { called = true }
      );
      var flow = compile(root);
      var args;
      flow('SOME_ERROR', function() {
        args = u_.toArray(arguments);
      });
      expect(called).toBe(false);
    });
    it('passes an error value from the outside caller directly to the trap function', function() {
      var root = rootFromDsl(
        function f(next) {}
      );
      var flow = compile(root);
      var args;
      flow('SOME_ERROR', function() {
        args = u_.toArray(arguments);
      });
      expect(args).toEqual(['SOME_ERROR']);
    });
    it('passes an exception thrown by the function to the error argument of the trap function', function() {
      var error = new Error('THROWN_ERROR');
      var flow = compile(rootFromDsl(
        function f(next) { throw error }
      ));
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0]).toBe(error);
    });
    it('yells if no "next" argument was passed-in', function() {
      var root = rootFromDsl(
        function f(next) {}
      );
      var flow = compile(root);
      expect(function() { flow(null) }).toThrow('No next() argument was passed in');
    });
    it('yells if no "error" argument was passed-in', function() {
      var root = rootFromDsl(
        function f(next) {}
      );
      var flow = compile(root);
      expect(function() { flow() }).toThrow('No error argument was passed in');
    });
    it('yells on number-of-argument mismatch', function() {
      var root = rootFromDsl(
        function trenaryFunction(a1, a2, a3, next) {}
      );
      var flow = compile(root);
      function trap() {}
      expect(function() { flow(null, 'a', 'b', trap) }).toThrow('trenaryFunction() expects 3 arguments but 2 were passed');
    });
  });
  describe('of a sequence', function() {
    it('passes outside inputs to the first function', function() {
      var root = rootFromDsl([
        function plus(v1, v2, next) { next(null, v1 + v2) }
      ]);
      var flow = compile(root);
      var args;
      flow(null, 'a', 'b', function() {
        args = u_.toArray(arguments);
      });
      expect(args).toEqual([null, 'ab']);
    });
    it('passes outputs of first function to inputs of second one', function() {
      var root = rootFromDsl([
        function ab(next) { next(null, 'a', 'b') },
        function plus(v1, v2, next) { next(null, v1 + v2) }
      ]);
      var flow = compile(root);
      var args;
      flow(null, function() {
        args = u_.toArray(arguments);
      });
      expect(args).toEqual([null, 'ab']);
    });
    it('supports incoming args', function() {
      var root = rootFromDsl([
        function ab(x, next) { next(null, 'a', x, 'b') },
        function plus(v1, v2, v3, next) { next(null, v1 + v2 + v3) }
      ]);
      var flow = compile(root);
      var args;
      flow(null, 'X', function() {
        args = u_.toArray(arguments);
      });
      expect(args).toEqual([null, 'aXb']);
    });
    it('supports arbitrarily long sequences', function() {
      var flow = compile(rootFromDsl([
        function a(x, next) { next(null, x + 'a') },
        function b(x, next) { next(null, x + 'b') },
        function c(x, next) { next(null, x + 'c') },
        function d(x, next) { next(null, x + 'd') },
        function e(x, next) { next(null, x + 'e') }
      ]));
      var args;
      flow(null, '', function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, 'abcde']);
    });
    it('does not run subsequent functions after a failure', function() {
      called = '';
      var flow = compile(rootFromDsl([
        function a(next) { called += 'a'; next(null) },
        function b(next) { called += 'b'; next('some_error') },
        function c(next) { called += 'c'; next(null) },
        function d(next) { called += 'd'; next(null) },
        function e(next) { called += 'e'; next(null) },
      ]));
      flow(null, function() {});
      expect(called).toEqual('ab');
    });
    it('does not run subsequent functions after a thrown error', function() {
      called = '';
      var flow = compile(rootFromDsl([
        function a(next) { called += 'a'; next(null) },
        function b(next) { called += 'b'; new Error('some_error') },
        function c(next) { called += 'c'; next(null) },
        function d(next) { called += 'd'; next(null) },
        function e(next) { called += 'e'; next(null) },
      ]));
      flow(null, function() {});
      expect(called).toEqual('ab');
    });
    it('propagates a thrown error all the way to the trap function', function() {
      var error = new Error('THROWN_ERROR');
      var flow = compile(rootFromDsl([
        function a(next) { next(null) },
        function b(next) { next(error) },
        function c(next) { next(null) },
        function d(next) { next(null) },
        function e(next) { next(null) },
      ]));
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0]).toBe(error);
    });
  });
  describe('of a split', function() {
    it('passes output to the trap function, keyed by the property name', function() {
      var flow = compile(rootFromDsl({
        key: function ab(next) { next(null, 'AB') }
      }));
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {key: 'AB'}]);
    });
  });
  function compile(v) {
    var compiled = v.targets().map(compile);
    if (v.type === 'conc') {
      var edges = v.outgoing();
      return function(e, next) {
        compiled[0](null, function(e, v) {
          var obj = {};
          obj[edges[0].name] = v;
          next(null, obj);
        })
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
});


