var u_ = require('underscore');
var funflow = require('../lib/funflow');

var comp = funflow.comp;
var single = funflow.single;
var fork = funflow.fork;
var compile = funflow.compile;
var Compiler = funflow.Compiler;

describe('funflow compilation', function() {
  function newFlow() {
    var compiler = Compiler.new_({ requireUniqueNames: false, translateErrors: true });
    return compiler.compile.apply(compiler, arguments);
  }
  describe('of a literal', function() {
    it('evaulautes to itself', function() {
      var flow = newFlow('SOME_LITERAL');
      var args;
      flow(null, function() { args = u_.toArray(arguments); });
      expect(args).toEqual([null, 'SOME_LITERAL']);
    });
    it('is skipped if an external error is present', function() {
      var flow = newFlow('some_literal');
      var args;
      flow('EXTERNAL_ERROR', function() { args = u_.toArray(arguments); });
      expect(args).toEqual(['EXTERNAL_ERROR']);
    });
  });
  describe('of a function', function() {
    it('turns an (arg, ..., next) function into an (e, arg, ..., next) callback', function() {
      var flow = newFlow(function sum(x, y, next) { next(null, x + y) }
      );
      var args;
      flow(null, 3, 7, function(e, v) { args = u_.toArray(arguments); });
      if (args[0]) throw args[0];
      expect(args).toEqual([null, 10]);
    });
    it('supports incoming var. args', function() {
      var flow = newFlow(
        function sum(w, x, y, z, next) { next(null, w + x + y + z) }
      );
      var args;
      flow(null, 'a', 'b', 'c', 'd', function() { args = u_.toArray(arguments); });
      expect(args).toEqual([null, 'abcd']);
    });
    it('supports outgoing var. args', function() {
      var flow = newFlow(
        function sumDiffProd(x1, x2, next) { next(null, x1 + x2, x1 - x2, x1 * x2) }
      );
      var args;
      flow(null, 20, 4, function() { args = u_.toArray(arguments); });
      expect(args).toEqual([null, 24, 16, 80]);
    });
    it('does not call the function if the outside caller passed in an error value', function() {
      var called = false;
      var flow = newFlow(
        function f(next) { called = true }
      );
      var args;
      flow('SOME_ERROR', function() { args = u_.toArray(arguments); });
      expect(called).toBe(false);
    });
    it('passes an error value from the outside caller directly to the trap function', function() {
      var flow = newFlow(
        function f(next) {}
      );
      var args;
      flow('SOME_ERROR', function() {
        args = u_.toArray(arguments);
      });
      expect(args).toEqual(['SOME_ERROR']);
    });
    it('passes an exception thrown by the function to the error argument of the trap function', function() {
      var error = new Error('THROWN_ERROR');
      var flow = Compiler.new_({translateErrors: false}).compile(
        function f(next) { throw error }
      );
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0]).toBe(error);
    });
  });
  describe('of a sequence', function() {
    it('passes outside inputs to the first function', function() {
      var flow = newFlow([
        function plus(v1, v2, next) { next(null, v1 + v2) }
      ]);
      var args;
      flow(null, 'a', 'b', function() {
        args = u_.toArray(arguments);
      });
      expect(args).toEqual([null, 'ab']);
    });
    it('passes outputs of first function to inputs of second one', function() {
      var flow = newFlow([
        function ab(next) { next(null, 'a', 'b') },
        function plus(v1, v2, next) { next(null, v1 + v2) }
      ]);
      var args;
      flow(null, function() {
        args = u_.toArray(arguments);
      });
      expect(args).toEqual([null, 'ab']);
    });
    it('supports incoming args', function() {
      var flow = newFlow([
        function ab(x, next) { next(null, 'a', x, 'b') },
        function plus(v1, v2, v3, next) { next(null, v1 + v2 + v3) }
      ]);
      var args;
      flow(null, 'X', function() {
        args = u_.toArray(arguments);
      });
      expect(args).toEqual([null, 'aXb']);
    });
    it('supports arbitrarily long sequences', function() {
      var flow = newFlow([
        function a(x, next) { next(null, x + 'a') },
        function b(x, next) { next(null, x + 'b') },
        function c(x, next) { next(null, x + 'c') },
        function d(x, next) { next(null, x + 'd') },
        function e(x, next) { next(null, x + 'e') }
      ]);
      var args;
      flow(null, '', function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, 'abcde']);
    });
    it('does not run subsequent functions after a failure', function() {
      var called = '';
      var flow = newFlow([
        function a(next) { called += 'a'; next(null) },
        function b(next) { called += 'b'; next('some_error') },
        function c(next) { called += 'c'; next(null) },
        function d(next) { called += 'd'; next(null) },
        function e(next) { called += 'e'; next(null) },
      ]);
      flow(null, function() {});
      expect(called).toEqual('ab');
    });
    it('does not run subsequent functions after a thrown error', function() {
      var called = '';
      var flow = newFlow([
        function a(next) { called += 'a'; next(null) },
        function b(next) { called += 'b'; throw new Error('some_error') },
        function c(next) { called += 'c'; next(null) },
        function d(next) { called += 'd'; next(null) },
        function e(next) { called += 'e'; next(null) },
      ]);
      flow(null, function() {});
      expect(called).toEqual('ab');
    });
    it('propagates a thrown error all the way to the trap function', function() {
      var error = new Error('THROWN_ERROR');
      var flow = Compiler.new_({translateErrors: false}).compile([
        function a(next) { next(null) },
        function b(next) { next(error) },
        function c(next) { next(null) },
        function d(next) { next(null) },
        function e(next) { next(null) },
      ]);
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0]).toBe(error);
    });
  });
  describe('of a fork', function() {
    it('passes output to the trap function, keyed by the property name', function() {
      var flow = newCustomFlow({
        key: function ab(next) { next(null, 'AB') }
      });
      var args;
      var exec = flow(null, function() { args = u_.toArray(arguments) });
      console.log(exec.toString());
      if (args[0]) throw args[0];
      expect(args).toEqual([null, {key: ['AB']}]);
    });
    it('supports multiple outputs', function() {
      var flow = newCustomFlow({
        key: function f(v1, v2, next) { next(null, v1 + v2, v1 * v2) }
      });
      var args;
      flow(null, 20, 4, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {key: [24, 80]}]);
    });
    it('does not output an array when the function is marked as single output', function() {
      var flow = newFlow({
        key: single(function f(v, next) { next(null, '*' + v + '*' )})
      });
      var args;
      flow(null, 'A', function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {key: '*A*'}]);
      if (args[0]) throw args[0];
    });
    it('passes inputs to the function at the branch', function() {
      var flow = newCustomFlow({
        key: function ab(v1, v2, next) { next(null, v1 + v2) }
      });
      var args;
      flow(null, 'X', 'Y', function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {key: ['XY']}]);
    });
    it('handles a two-way fork', function() {
      var flow = newCustomFlow({
        sum: function plus(v1, v2, next) { next(null, v1 + v2) },
        product: function star(v1, v2, next) { next(null, v1 * v2) }
      });
      var args;
      flow(null, 5, 8, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {sum: [13], product: [40]}]);
    });
    it('ivnokes the trap function exactly once', function() {
      var flow = newFlow({
        f0: function f0(next) { next(null) },
        f1: function f1(next) { next(null) },
        f2: function f2(next) { next(null) },
        f3: function f3(next) { next(null) }
      });
      var count = 0;
      flow(null, function() { ++count });
      expect(count).toEqual(1);
    });
    it('propagates a thrown error to the trap function', function() {
      var error = new Error('THROWN_ERROR');
      var flow = newFlow({
        sum: function plus(v1, v2, next) { next(null, v1 + v2) },
        product: function star(v1, v2, next) { throw error }
      });
      var args;
      flow(null, 5, 8, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0].cause).toBe(error);
    });
    it('propagates a failure to the trap function', function() {
      var flow = newFlow({
        sum: function plus(v1, v2, next) { next(null, v1 + v2) },
        product: function star(v1, v2, next) { next('SOME_PROBLEM') }
      });
      var args;
      flow(null, 5, 8, function() { args = u_.toArray(arguments) });
      expect(args[0].cause).toEqual('SOME_PROBLEM');
      expect(args.length).toEqual(1);
    });
    it('it reports a failure only once, even if multiple brnahces fail', function() {
      var flow = newFlow({
        f0: function f0(v1, v2, next) { next(null, v1 + v2) },
        f1: function f1(v1, v2, next) { next('some_problem') },
        f2: function f2(v1, v2, next) { next('some_problem') },
        f3: function f3(v1, v2, next) { next(null, v1 * v2) },
      });
      var count = 0;
      var args;
      flow(null, 0, 0, function() { ++count; args = u_.toArray(arguments) });
      expect(count).toEqual(1);
    });
    it('propagates an outside failure directly to the trap function', function() {
      var flow = newFlow({
        f0: function f0(next) { next(null) },
        f1: function f1(next) { next(null) }
      });
      var args;
      var error = new Error('some_problem');
      flow(error, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0]).toBe(error);
    });
    describe('with custom merge', function() {
      it('passes the result object to the merge function', function() {
        var flow = newFlow(fork({
          plusOne: single(function (v, next) { next(null, v + 1) }),
          plusTwo: single(function (v, next) { next(null, v + 2) })
        }, function(result, next) {
          if (result.plusOne && result.plusTwo) {
            next(null, result.plusOne + ',' + result.plusTwo);
          }
        }));
        var args;
        flow(null, 100, function() { args = u_.toArray(arguments) });
        expect(args).toEqual([null, '101,102']);
        if (args[0]) throw args[0];
      });
      it('invokes the merge function once for each branch', function() {
        var count = 0;
        var flow = newFlow(fork({
          a: single(function (next) { next(null) }),
          b: single(function (next) { next(null) }),
          c: single(function (next) { next(null) }),
        }, function(result, next) {
          ++count;
          if (Object.keys(result).length === 3) {
            next(null, count);
          }
        }));
        var args;
        flow(null, function() { args = u_.toArray(arguments) });
        expect(args).toEqual([null, 3]);
        if (args[0]) throw args[0];
      });
      it('does not re-invoke the merge after it called next()', function() {
        var count = 0;
        var flow = newFlow(fork({
          a: single(function (next) { next(null, 'A') }),
          b: single(function (next) { next(null, 'B') }),
          c: single(function (next) { next(null, 'C') }),
        }, function(result, next) {
          ++count;
          if (Object.keys(result).length === 2)
            next(null, 'count=' + count);
        }));
        var args;
        flow(null, function() { args = u_.toArray(arguments) });
        expect(count).toEqual(2);
        expect(args).toEqual([null, 'count=2']);
        if (args[0]) throw args[0];
      });
      it('does not re-invoke merge after it called next() - more sophisticated', function(done) {
        var mergeCount = 0;
        var count = 0;
        var acc = [];
        var flow = newFlow([
          fork({
            a: single(function (next) { next(null, 'A') }),
            b: single(function (next) { next(null, 'B') }),
            c: single(function (next) { next(null, 'C') }),
          }, function(result, next) {
            ++mergeCount;
            next(null, Object.keys(result), mergeCount);
          }),
          function(keys, n, next) {
            acc.push(n + '=>[' + keys.length + ']');
            count += 1;
            if (keys.length === 1) process.nextTick(next);
          }
        ]);
        var args;
        flow(null, function() {
          args = u_.toArray(arguments);
          if (args[0]) return done(args[0]);

          expect(count).toEqual(1);
          expect(mergeCount).toEqual(1);
          expect(acc.join(' ')).toEqual('1=>[1]');
          done();
        });
      });
      it('invokes the merge function with partial results', function() {
        var flow = newFlow(fork({
          a: single(function (next) { next(null, 'A') }),
          b: single(function (next) {}),
          c: single(function (next) { next(null, 'C') }),
        }, function(result, next) {
          if (result.a && result.c)
            next(null, result.a + '_' + result.c);
        }));
        var args;
        flow(null, function() { args = u_.toArray(arguments) });
        expect(args).toEqual([null, 'A_C']);
        if (args[0]) throw args[0];
      });
      it('invokes the merge function with partial results', function() {
        var acc = [];
        var flow = newFlow(fork({
          A: single(function (next) { next(null, 'a') }),
          B: single(function (next) { next(null, 'b') }),
          C: single(function (next) { next(null, 'c') }),
        }, function(result, next) {
          var keys = Object.keys(result);
          keys.sort();
          acc.push(keys.join(''));
          if (acc.length === 3) {
            acc.sort();
            next(null, acc);
          }
        }));
        var args;
        flow(null, function() { args = u_.toArray(arguments) });
        expect(args).toEqual([null, ['ABC', 'BC', 'C']]);
        if (args[0]) throw args[0];
      });
      it('propagates errors from the merge function', function() {
        var acc = [];
        var flow = newFlow(fork({
          a: single(function (next) { next(null) }),
          b: single(function (next) { next(null) }),
          c: single(function (next) { next(null) }),
        }, function(result, next) {
          if (Object.keys(result).length === 2) {
            next('WE HAVE A PROBLEM');
          }
        }));
        var args;
        flow(null, function() { args = u_.toArray(arguments) });
        expect(args[0].cause).toEqual('WE HAVE A PROBLEM');
        expect(args.length).toEqual(1);
      });
    });
  });
  describe('of a computation', function() {
    it('takes an err argument', function() {
      var flow = newFlow(
        comp(function f(e, v, next) { next(null, {e: e, v: v}) })
      );
      var args;
      flow(null, 100, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {e: null, v: 100}]);
    });
    it('receives whichever err that was produced earlier', function() {
      var flow = newFlow([
        function f0(v, next) { next(null, v + '0') },
        function f1(v, next) { next(null, v + '1') },
        function f2(v, next) { next('F2 FAILED') },
        function f3(v, next) { next(null, v + '2') },
        comp(function f(e, next) { next(null, e.cause + ', AND RESCUED')})
      ]);
      var args;
      flow(null, '', function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, 'F2 FAILED, AND RESCUED']);
    });
    it('receives whichever err that was produced earlier or a value', function() {
      var flow = compile(
        function f0(v, next) { next(null, v + '0') },
        function f1(v, next) { next(null, v + '1') },
        function f2(v, next) {
          if (v[0] == '-') return next('F2 FAILED')
          next(null, v + '2', '!!!');
        },
        function f3(v, suffix, next) { next(null, v + '3', suffix) },
        comp(function f4(e, v, suffix, next) {
          next(null, e ? ('e=' + e.cause) : ('v=' + v + suffix))
        })
      );
      var exec = flow.newExecution();
      var args;
      exec.run(null, '-', function() { args = u_.toArray(arguments) });
      if (args[0]) throw args[0];
      expect(args).toEqual([null, 'e=F2 FAILED']);

      flow.newExecution().run(null, '+', function() { args = u_.toArray(arguments) });
      if (args[0]) throw args[0];
      expect(args).toEqual([null, 'v=+0123!!!']);
    });
    it('an exception thrown from a computation is propagated to the trap function', function() {
      var err = new Error();
      var flow = newFlow([
        function f0(next) { next('f0 failed') },
        comp(function f(e, next) { throw err })
      ]);
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0].cause).toBe(err);
    });
    it('a comp function in a branch does not rescue other branches', function() {
      var err = new Error();
      var flow = newFlow({
          a: function f0(next) { next('PROBLEM') },
          b: comp(function f(e, next) { next(null, 'ok') })
      });
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0].cause).toEqual('PROBLEM');
    });
  });
  it('continues to the subsequent computation when next() is invoked with no args', function() {
    var count = 0;
    var flow = compile([
      function fa(a, next) { ++count; next() },
      function fb(next) { ++count; next(null, count) }
    ]);
    var args;
    flow(null, 5, function() { args = u_.toArray(arguments) });
    expect(args).toEqual([null, 2]);
  });
  it('can evaluate a sequence where all computations take no arguments and produce no results', function() {
    var count = 0;
    var flow = newFlow([
      function(next) { ++count; next() },
      function(next) { ++count; next() },
      function(next) { ++count; next() }
    ]);
    var args;
    flow(null, function() { args = u_.toArray(arguments) });
    if (args[0]) throw args[0];
    expect(args).toEqual([null]);
    expect(count).toEqual(3);
  });
  it('can be evaluated multiple times', function() {
    var flow = newCustomFlow([
      function f1(a, next) { next(null, a, 10) },
      {
        sum: function sum(a, b, next) { next(null, a + b) },
        prod: function sum(a, b, next) { next(null, a * b) }
      },
      function f2(acc, next) {
        next(null, acc.sum[0] + ',' + acc.prod[0]);
      }
    ]);
    var args;
    flow(null, 5, function() { args = u_.toArray(arguments) });
    expect(args).toEqual([null, '15,50']);

    flow(null, 7, function() { args = u_.toArray(arguments) });
    expect(args).toEqual([null, '17,70']);
  });
  it('can be recursive', function(done) {
    var fib = newFlow([
      {
        a: single(function(n, next) { n < 2 ? next() : fib(null, n - 2, next) }),
        b: single(function(n, next) { n < 2 ? next() : fib(null, n - 1, next) }),
        n: single(function(n, next) { next(null, n) }),
      },
      function sum(r, next) {
        return next(null, r.n < 2 ? r.n : r.a + r.b);
      }
    ]);
    fib(null, 11, function(e, v) {
      expect(v).toEqual(89);
      done();
    });
  });
  it('example: async unit test', function(done) {
    var pith = newFlow([
      function cube(a, b, next) { next(null, a*a, b*b) },
      function add(aa, bb, next) { next(null, aa + bb) },
      function square(cc, next) { next(null, Math.sqrt(cc)) }
    ]);
    var test = newFlow([
      function gen3_4(next) { pith(null, 3, 4, next) },
      function check5(v, next) { expect(v).toEqual(5); next() },
      function gen6_8(next) { pith(null, 6, 8, next) },
      function check10(v, next) { expect(v).toEqual(10); next() },
      function gen12_5(next) { pith(null, 12, 5, next) },
      function check13(v, next) { expect(v).toEqual(13); next() }
    ]);
    test(null, done);
  });
  it('invokes every function exactly once', function(done) {
    var counts = { a: 0, b1: 0, b2: 0, c: 0 };
    var flow = newFlow([
      function a(v, next) { counts.a += 1; next(null, v + '+a') },
      {
        b1: function b1(v, next) { counts.b1 += 1; next(null, '(' + v + ')*b1') },
        b2: function b2(v, next) { counts.b2 += 1; next(null, '(' + v + ')*b2') }
      },
      function c(v, next) {
        counts.c += 1;
        process.nextTick(next.bind(null, null, v.b1 + '/' + v.b2));
      }
    ]);
    flow(null, 'x', function(e, v) {
      if (e) throw e;
      expect(v).toEqual('(x+a)*b1/(x+a)*b2');
      expect(counts).toEqual({ a: 1, b1: 1, b2: 1, c: 1 });
      done();
    });
  });
  describe('evaluation context', function() {
    // non-null this
    // same this within an execution
    // unique this across executions
    // value assigned to a field of this can be subsequently read by a
    // downstream function.
    it('a computation has a (non null) this variable', function() {
      var flow = newFlow(function a(next) { next(null, this) })
      var args;
      flow(null, function(e, v) { args = u_.toArray(arguments) });
      if (args[0]) throw args[0];
      expect(args[1]).toBeTruthy();
    });
    it('the this varialbe is not the global scope', function() {
      var flow = newFlow(function a(next) { next(null, this) })
      var args;
      flow(null, function(e, v) { args = u_.toArray(arguments) });
      if (args[0]) throw args[0];
      expect(args[1]).not.toBe(global);
    });
  });
  describe('newFlow', function() {
    it('handles function literal', function() {
      var flow = newFlow(function(next) { next(null, 8) });
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      if (args[0]) throw args[0];
      expect(args).toEqual([null, 8]);
    });
    it('handles sequences', function() {
      var flow = newFlow([1, 2, 4, 8, 16, 32]);
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, 32]);
    });
    it('three literal example', function() {
      var flow = newFlow(['A', 'B', 'C']);
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, 'C']);
    });
    it('passes the output to the subsequent function', function() {
      var flow = newFlow(['A',
        function(v, next) { next(null, v + 'B') },
        function(v, next) { next(null, v + 'C') }]);
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, 'ABC']);
    });
    it('evaluates async functions', function(done) {
      var flow = newFlow(['A',
        function(v, next) { process.nextTick(function() {next(null, v + 'B') })}
      ]);
      var args;
      flow(null, function(e, v) {
        expect(e).toBe(null);
        expect(v).toEqual('AB');
        done();
      });
    });
    it('passes on the output of an async function', function(done) {
      var flow = newFlow(['A',
        function(v, next) { process.nextTick(function() {next(null, v + 'B') })},
        function(v, next) { next(null, v + 'C') }
      ]);
      var args;
      flow(null, function(e, v) {
        expect(e).toBe(null);
        expect(v).toEqual('ABC');
        done();
      });
    });
    it('handles long sequences', function() {
      var arr = u_.times(1570, function() { return 'A' });
      arr.push(function(v, next) {
        next(null, v.toLowerCase());
      });

      var flow = newFlow(arr);
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      if (args[0]) throw args[0];
      expect(args).toEqual([null, 'a']);
    });
    it('handles a sequence of identical literals', function() {
      var flow = newFlow([100, 100]);
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, 100]);
    });
    it('newFlow() treats var. args as a seq', function() {
      var flow = newFlow(
        function(v, next) { next(null, v + 'A') },
        function(v, next) { next(null, v + 'B') });
      var args;
      flow(null, '_', function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, '_AB']);
    });
    it('passes the external input to the first computation', function() {
      var flow = newFlow([
        function(v, next) { next(null, v + 'A') },
        function(v, next) { next(null, v + 'B') }
      ]);
      var args;
      flow(null, 'ab', function() { args = u_.toArray(arguments) });
      if (args[0]) throw args[0];
      expect(args).toEqual([null, 'abAB']);
    });
    it('handles forks', function() {
      var flow = Compiler.new_({branchOp: 'SINGLE'}).compile({ a: 1, b: 2, d: 4});
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {a: 1, b: 2, d: 4}]);
    });
    it('by default, it treats fork branches as if they were "single()"', function() {
      var flow = compile({ a: 1, b: 2, d: 4});
      var args;
      var exec = flow(null, function() { args = u_.toArray(arguments) });
      console.log(exec.toString());
      expect(args).toEqual([null, {a: 1, b: 2, d: 4}]);
    });
    it('applies single also to sequences inside a fork', function() {
      var flow = newFlow({b1: 'B1', b2: ['B2']});
      var args;
      var exec = flow(null, function() { args = u_.toArray(arguments) });
      console.log(exec.toString());
      expect(args).toEqual([null, {b1: 'B1', b2: 'B2'}]);
    });
    it('applies single also to forks inside a fork', function() {
      var flow = newFlow({b1: 'B1', b2: {b21: 'B21', b22: 'B22'}});
      var args;
      flow(null, function() { args = u_.toArray(arguments) });
      expect(args).toEqual([null, {b1: 'B1', b2: {b21: 'B21', b22: 'B22'}}]);
    });
    it('wraps the client code\'s err value with an exception when translateErrors is true', function() {
      var flow = Compiler.new_({ translateErrors: true }).compile(
        function fa(v, next) { next(null, v + 'A') },
        function fb(v, next) { next('PROBLEM') },
        function fc(v, next) { next(null, v + 'C') }
      );
      var args;
      flow(null, 'Z', function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0].message).toEqual('PROBLEM');
    });
    it('keeps the client code\'s err value as-is when translateErrors is false', function() {
      var flow = Compiler.new_({ translateErrors: false, requireUniqueNames: true }).compile(
        function fa(v, next) { next(null, v + 'A') },
        function fb(v, next) { next('PROBLEM') },
        function fc(v, next) { next(null, v + 'C') }
      );
      var args;
      flow(null, 'Z', function() { args = u_.toArray(arguments) });
      expect(args.length).toEqual(1);
      expect(args[0]).toEqual('PROBLEM');
    });
  });
  function newCustomFlow(dsl) {
    return Compiler.new_({ branchOp: 'MULTI', requireUniqueNames: false }).compile(dsl);
  }
});


