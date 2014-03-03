var funflow = require('../lib/funflow');
var flow = funflow.flow;

describe('FunFlow', function() {
  describe('seq', function() {
    it('is not allowed if no functions are specified', function(done) {
      expect(flow().seq).toThrow();
      done();
    });
    describe('of a single function', function() {
      it('does not fail', function(done) {
        flow().seq(function(err) {
          expect(err).toBeFalsy();  
          done();
        }).run();
      });
      it('passes no arguments if none were specified externally', function(done) {
        flow().seq(function(err) {
          expect(err).toBeFalsy();  
          expect(arguments.length).toEqual(1);
          done();
        }).run();
      });
      it('passes external arguments to that function', function(done) {
        flow().seq(function(err, first, second) {
          expect(err).toBeFalsy();  
          expect(first).toEqual('first external argument');
          expect(second).toEqual('second one');
          expect(arguments.length).toEqual(3);
          done();
        }).run('first external argument', 'second one');
      });
    });
    describe('of two functions', function() {
      it('passes the value emitted by the first one to the value argument of the second one', function(done) {
        flow().seq(function(next) { next(null, 'Lincoln') }, function(err, value) {
          expect(err).toBeFalsy();  
          expect(value).toEqual('Lincoln');
          expect(arguments.length).toEqual(2);
          done();
        }).run();
      });
      it('passes multiple values from the first to the second', function(done) {
        flow().seq(
          function(next) { next(null, 'Four scores', 'and', 'seven years ago') }, 
          function(err, part1, part2, part3) {
            expect(err).toBeFalsy();  
            expect([part1, part2, part3]).toEqual(['Four scores', 'and', 'seven years ago']);
            expect(arguments.length).toEqual(4);
            done();
        }).run();
      });
      it('passes multiple external args to the first function', function(done) {
        flow().seq(
          function(prefix, suffix, next) { next(null, prefix + '$' + suffix) },
          function(err, value) {
            expect(err).toBeFalsy();  
            expect(value).toEqual('<$>');
            expect(arguments.length).toEqual(2);
            done();
        }).run('<', '>');
      });
      it('passes the error emitted by the first one to the error argument of the second one', function(done) {
        var failure = new Error('some problem');
        flow().seq(function(next) { next('WE HAVE A PROBLEM') }, function(err) {
          expect(err).toEqual('WE HAVE A PROBLEM');
          done();
        }).run();
      });
      it('does not pass a value (even if it is specifed) when a failure is emitted', function(done) {
        var failure = new Error('some problem');
        flow().seq(function(next) { next(failure, 'some value') }, function(err) {
          expect(arguments.length).toEqual(1);
          done();
        }).run();
      });
      it('transform exceptions thrown by the first function into an error value (passed to the second)', function(done) {
        var failure = new Error('some problem');
        flow().seq(function() { throw failure }, function(err) {
          expect(err).toBe(failure);
          expect(arguments.length).toEqual(1);
          done();
        }).run();
      });
    });

    describe('of multiple functions', function() {
      it('can be shortened via funflow.seq()', function(done) {
        function trap(err, v) {
          expect(err).toBe(null);
          expect(v).toEqual(30);
          done();
        }
        funflow.seq(trap,
          function (a, b, next) { next(null, a + b); },
          function (a, next) { next(null, a / 2); },
          function (a, next) { next(null, a - 10); }
        ).run(60, 20);
      });
    });

    describe('trap function', function() {
      it('can be passed to the ctor', function(done) {
        var captured;
        flow(function trap(e, v) { captured = Array.prototype.slice.call(arguments, 0) }).seq(
            function(next) { next(null, 3) },
            function(value, next) { next(null, value * value) }
        ).run();

        expect(captured).toEqual([null, 9]);
        done();
      });
      it('can be the sole target', function(done) {
        var captured;
        flow(function trap(e, v) { captured = Array.prototype.slice.call(arguments, 0) }).
        seq().run(50);

        expect(captured).toEqual([null, 50]);
        done();
      });
    });

    describe('error reporting', function() {
      it('generates a trace with meaningful function names', function(done) {
        flow().seq(
          function first(next) { next() }, 
          function second(next) { next() },
          function third(next) { throw new Error('ABORT') },
          function fourth(next) { next() },
          function final(e, v) {
            expect(e.stack).toContain('Error: ABORT');
            expect(e.stack).toContain('at third()');
            expect(e.stack).toContain('at second()');
            expect(e.stack).toContain('at first()');
            done();
          }).run();
      });
      it('handles unnamed function', function(done) {
        flow().seq(
          function (next) { next() }, 
          function second(next) { next() },
          function (next) { throw new Error('ABORT') },
          function (next) { next() },
          function final(e, v) {
            expect(e.stack).toContain('Error: ABORT');
            expect(e.stack).toContain('at ?()');
            expect(e.stack).toContain('at second()');
            expect(e.stack).toContain('at ?()');
            done();
          }).run();
      });
    });
  });

  describe('conc', function() {
    describe('with object of functions', function() {
      it('emits an object with the result of a function stored in the same key as the function', function(done) {
        function trap(err, result) {
          expect(err).toBe(null);
          expect(result).toEqual({a: [ 'value from a' ]});
          expect(arguments.length).toEqual(2);
          done();
        }
        flow(trap).conc(
          {a: function (next) { next(null, 'value from a') }}
        ).run();
      });
      it('supports multiple functions', function(done) {
        function trap(err, result) {
          expect(err).toBe(null);
          expect(result).toEqual({
            a: [ 'value from a' ], 
            b: [ 'value', 'from', 'b' ]
          });
          expect(arguments.length).toEqual(2);
          done();
        }
        flow(trap).conc({
          a: function (next) { next(null, 'value from a') },
          b: function (next) { next(null, 'value', 'from', 'b') },
        }).run();
      });
    });
  });

  describe('graph', function() {
    it('treats an object as concurrent flows', function(done) {
      function trap(err, result) {
        expect(err).toBe(null);
        expect(result).toEqual({
          a: [ 'value from a' ], 
          b: [ 'value', 'from', 'b' ]
        });
        expect(arguments.length).toEqual(2);
        done();
      }
      flow(trap).graph({
        a: function (next) { next(null, 'value from a') },
        b: function (next) { next(null, 'value', 'from', 'b') },
      }).run();
    });
    it('treats an array as sequential flows', function(done) {
      function trap(err, result) {
        expect(err).toBe(null);
        expect(result).toEqual('this is coming from the first function, and this one from the second');
        expect(arguments.length).toEqual(2);
        done();
      }
      flow(trap).graph([
        function (next) { next(null, 'this is coming from the first function') },
        function (v, next) { next(null, v + ', and this one from the second') },
      ]).run();
    });
    it('array of with a single object is just like an object', function(done) {
      function trap(err, result) {
        expect(err).toBe(null);
        expect(result).toEqual({
          a: [ 'value from a' ], 
          b: [ 'value', 'from', 'b' ]
        });
        expect(arguments.length).toEqual(2);
        done();
      }
      flow(trap).graph([{
        a: function (next) { next(null, 'value from a') },
        b: function (next) { next(null, 'value', 'from', 'b') },
      }]).run();
    });
    it('array of two objects is two concurrent flows running sequentailly', function(done) {
      function trap(err, result) {
        expect(err).toBe(null);
        expect(result).toEqual({
          c: [ 'In c: a=A, b=B' ],
          d: [ 'In d: a=A, b=B' ]
        });
        expect(arguments.length).toEqual(2);
        done();
      }
      flow(trap).graph([{
        a: function (next) { next(null, 'A') },
        b: function (next) { next(null, 'B') },
      },
      {
        c: function (v, next) { next(null, 'In c: a=' + v.a + ', b=' + v.b) },
        d: function (v, next) { next(null, 'In d: a=' + v.a + ', b=' + v.b) }
      }]).run();
    });
    xit('object with array value is a sequential flow running concurrently', function(done) {
      function trap(err, result) {
        expect(err).toBe(null);
        expect(result).toEqual('a=A1_A2, b=B1_B2');
        expect(arguments.length).toEqual(1);
        done();
      }
      flow(trap).graph([
        {
          a: [ function (next) { next(null, 'A1') }, function(v, next) { next(null, v + '_A2') } ],
          b: [ function (next) { next(null, 'B1') }, function(v, next) { next(null, v + '_B2') } ]
        },
        function(v, next) { next(null, 'a=' + v.a + ', b=' + v.b) }
      ]).run();
    });
  });
});

