var rootFromDsl = require('../lib/dsl').rootFromDsl;
var u_ = require('underscore');
var compile = require('../lib/evaluation').compile;

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
      expect(args).toEqual([null, {key: ['AB']}]);
    });
    it('supports multiple outputs', function() {
      var flow = compile(rootFromDsl({
        key: function f(v1, v2, next) { next(null, v1 + v2, v1 * v2) }
      }));
      var args;
      flow(null, 20, 4, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {key: [24, 80]}]);
    });
    it('passes inputs to the function at the branch', function() {
      var flow = compile(rootFromDsl({
        key: function ab(v1, v2, next) { next(null, v1 + v2) }
      }));
      var args;
      flow(null, 'X', 'Y', function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {key: ['XY']}]);
    });
    it('handles a two-way split', function() {
      var flow = compile(rootFromDsl({
        sum: function plus(v1, v2, next) { next(null, v1 + v2) },
        product: function star(v1, v2, next) { next(null, v1 * v2) }
      }));
      var args;
      flow(null, 5, 8, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {sum: [13], product: [40]}]);
    });
    it('ivnokes the trap function exactly once', function() {
      var flow = compile(rootFromDsl({
        f0: function f0(next) { next(null) },
        f1: function f1(next) { next(null) },
        f2: function f2(next) { next(null) },
        f3: function f3(next) { next(null) }
      }));
      var count = 0;
      flow(null, function() { ++count });
      expect(count).toEqual(1);
    });
    it('propagates a thrown error to the trap function', function() {
      var error = new Error('THROWN_ERROR');
      var flow = compile(rootFromDsl({
        sum: function plus(v1, v2, next) { next(null, v1 + v2) },
        product: function star(v1, v2, next) { throw error }
      }));
      var args;
      flow(null, 5, 8, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0]).toBe(error);
    });
    it('propagates a failure to the trap function', function() {
      var flow = compile(rootFromDsl({
        sum: function plus(v1, v2, next) { next(null, v1 + v2) },
        product: function star(v1, v2, next) { next('SOME_PROBLEM') }
      }));
      var args;
      flow(null, 5, 8, function() { args = u_.toArray(arguments) });
      expect(args).toEqual(['SOME_PROBLEM']);
    });
    it('it reports a failure only once, even if multiple brnahces fail', function() {
      var flow = compile(rootFromDsl({
        f0: function f0(v1, v2, next) { next(null, v1 + v2) },
        f1: function f1(v1, v2, next) { next('some_problem') },
        f2: function f2(v1, v2, next) { next('some_problem') },
        f3: function f3(v1, v2, next) { next(null, v1 * v2) },
      }));
      var count = 0;
      var args;
      flow(null, 0, 0, function() { ++count; args = u_.toArray(arguments) });
      expect(count).toEqual(1);
    });
    it('propagates an outside failure directly to the trap function', function() {
      var flow = compile(rootFromDsl({
        f0: function f0(next) { next(null) },
        f1: function f1(next) { next(null) }
      }));
      var args;
      var error = new Error('some_problem');
      flow(error, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0]).toBe(error);
    });
  });
});


