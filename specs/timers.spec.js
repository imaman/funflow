var timer = require('../lib/dsl').timer;
var fork = require('../lib/dsl').fork;
var funflow = require('../lib/funflow');
var Compiler = funflow.Compiler;
var multi = funflow.multi;


describe('timer:', function() {
  function newFlow() {
    var compiler = Compiler.new_({ requireUniqueNames: false });
    return compiler.compile.apply(compiler, arguments);
  }
  it('fires a result for its slot', function(done) {
    var flow = newFlow(fork({
      a: function(v, next) { next(null, v + 'A') },
      b: function(v, next) {},
      elapsed: timer(1),
    }, function(result, next) {
      if (result.a && result.elapsed > 10)
        next(null, result);
    }));

    flow(null, '**', function(e, v) {
      expect(arguments.length).toEqual(2);
      expect(e).toBe(null);
      expect(v.a).toEqual('**A');
      expect(v.b).toBe(undefined);
      expect(v.elapsed).toBeGreaterThan(10);

      done();
    });
  });
  it('fires several times, each time reporting the elapsed time', function(done) {
    var acc = [];
    var flow = newFlow(fork({
      elapsed: timer(1)
    }, function(result, next) {
      acc.push(result.elapsed);
      if (result.elapsed >= 20)
        next(null, result);
    }));

    flow(null, '**', function() {
      // a 1-ms frequency for 20 ms, should (conservatively) fire at least
      // three times.
      expect(acc.length).toBeGreaterThan(3);

      var n = 0;
      acc.reduce(function(prev, curr) {
        if (curr > prev)
          ++n;
        return curr;
      }, -1);
      // As time is ever-increasing at least three of these values should
      // be greater than the previous values.
      expect(n).toBeGreaterThan(3);
      done();
    });
  });
  it('fires an excpetion after the specified timeout duration', function(done) {
    var acc = [];
    var flow = newFlow(fork({
      elapsed: timer(1, 10)
    }, function(result, next) {
      acc.push(result.elapsed);
    }));

    flow(null, function(e) {
      expect(arguments.length).toEqual(1);
      expect(e.message).toEqual('Timeout');
      expect(e.duration).toBeGreaterThan(10);
      done();
    });
  });
  it('fires only the timeout error when timeout value equals to the frequecny', function(done) {
    var flow = newFlow({
      a: timer(10, 10)
    });

    var args;
    var exec = flow(null, function(e) {
      expect(e.message).toEqual('Timeout');
      expect(arguments.length).toEqual(1);
      done();
    });
  });
  it('when a custom error is specified, it fired instead of the default Timeout error', function(done) {
    var flow = newFlow({
      a: timer(10, 10, 'GIVING_UP')
    });

    flow(null, function(e) {
      expect(e).toEqual('GIVING_UP');
      expect(arguments.length).toEqual(1);
      done();
    });
  });
  it('when specified, it fires a result value upon timeout', function(done) {
    var flow = newFlow({
      a: timer(10, 10, null, 'SOME_RESULT')
    });

    flow(null, function(e, v) {
      expect(e).toBe(null);
      expect(v).toEqual({a: 'SOME_RESULT'});
      done();
    });
  });
  it('can translate the custom error value', function(done) {
    var flow = Compiler.new_({translateErrors: true}).compile({
      a: timer(10, 10, 'SOME_PROBLEM')
    });

    flow(null, function(e) {
      expect(arguments.length).toEqual(1);
      expect(e.message).toEqual('SOME_PROBLEM');
      done();
    });
  });
  it('can be used inside a seq', function(done) {
    var acc = [];
    var flow = newFlow([
      timer(15),
      function (millis, next) { next(null, millis / 1000.0) }
    ]);

    flow(null, function(e, v) {
      expect(arguments.length).toEqual(2);
      expect(e).toBe(null);
      done();
    });
  });
});
