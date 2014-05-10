var timer = require('../lib/dsl').timer;
var single = require('../lib/dsl').single;
var fork = require('../lib/dsl').fork;
var newFlow = require('../lib/compilation').newFlow;

describe('timers', function() {
  it('fires a result for its slot', function(done) {
    var flow = newFlow(fork({
      a: single(function(v, next) { next(null, v + 'A') }),
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
