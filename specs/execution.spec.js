var comp = require('../lib/dsl').comp;
var timer = require('../lib/dsl').timer;
var fork = require('../lib/dsl').fork;
var u_ = require('underscore');
var newFlow = require('../lib/compilation').newFlow;
var compile = require('../lib/compilation').compile;
var Compiler = require('../lib/compilation').Compiler;
var util = require('util');

describe('Execution:', function() {
  it('reports the IDs of all computation nodes', function() {
    var execution = compile('A', 'B', 'C').newExecution();
    expect(execution.ids()).toEqual([0, 1, 2]);
  });
  describe('inspection of outputs of computations', function() {
    it('looksup the output by function name', function() {
      var flow = newFlow(
        function fa(v, next) { next(null, v +'A') },
        function fb(v, next) { next(null, v +'B') },
        function fc(v, next) { next(null, v +'C') });
      var execution = flow(null, '_', function() {});
      expect(execution.outputOf('fa')).toEqual([null, '_A']);
      expect(execution.outputOf('fb')).toEqual([null, '_AB']);
      expect(execution.outputOf('fc')).toEqual([null, '_ABC']);
    });
    it('can lookup unnamed function if the enclosing comp() specifies a name', function() {
      var flow = newFlow(
        comp('fa', function (e, v, next) { next(null, v +'A') }),
        comp('fb', function (e, v, next) { next(null, v +'B') }));
      var execution = flow(null, '_', function() {});
      expect(execution.outputOf('fa')).toEqual([null, '_A']);
      expect(execution.outputOf('fb')).toEqual([null, '_AB']);
    });
    it('can lookup output of a timer', function(done) {
      var flow = newFlow({
        a: function a(next) { next(null, 'A') },
        t: timer('aTimer', 1)
      });
      var execution = flow.newExecution();
      execution.run(null, function() {
        expect(execution.outputOf('a')).toEqual([null, 'A']);
        var timerOutput = execution.outputOf('aTimer');
        expect(timerOutput.length).toEqual(2);
        expect(timerOutput[0]).toBe(null);
        expect(timerOutput[1]).toBeGreaterThan(0);
        expect(util.isNumber(timerOutput[1])).toBe(true);
        done();
      });
    });
    it('of forks', function() {
      var flow = newFlow({
        a: function fa(v, next) { next(null, v + 'A') },
        b: function fb(v, next) { next(null, v + 'B') }
      });
      var execution = flow(null, '_', function() {});
      expect(execution.outputOf('fa')).toEqual([null, '_A']);
      expect(execution.outputOf('fb')).toEqual([null, '_B']);
    });
    it('of forks with custom merge function', function() {
      var flow = newFlow(fork({
        a: function fa(v, next) { next(null, v + 'A') },
        b: function fb(v, next) { next(null, v + 'B') }
      }, function x(v, next) {
        if (v.a && v.b)  {
          v.both = v.a + v.b;
          next(null, v)
        }
      }));
      var execution = flow(null, '_', function(e, v) {});
      expect(execution.outputOf('fa')).toEqual([null, '_A']);
      expect(execution.outputOf('fb')).toEqual([null, '_B']);
      expect(execution.outputOf('x')).toEqual([null, {a: '_A', b: '_B', both: '_A_B'}]);
    });
  });
  it('it yells if vertex name was not found', function() {
    var flow = newFlow(function fa(v, next) { next(null, v +'A') }) ;
    var execution = flow(null, '_', function() {});
    expect(function() { execution.outputOf('NON_EXISTING_NAME') }).toThrow();
  });
  describe('introspection', function() {
    it('provides human-readable representation of the current execution', function() {
      var flow = compile(
        function fa(v, next) { next(null, v +'A') },
        {
          b1: function fb1(v, next) { next(null, v +'B1') },
          b2: function(v, next) { next(null, v +'B2') },
        },
        function fc(v, next) { next(null, v.b1 + '_' + v.b2) }
      );
      var execution = flow.newExecution();
      execution.run(null, '*', function() {});
      expect(execution.toString()).toEqual(['',
        '|',
        'fa#0',
        '|',
        '|',
        '+->--+-----+',
        '     |     |',
        '     fb1#2 #3',
        '     |     |',
        '     |     |',
        '+-<--+-----+',
        'fc#5',
        '|',
        'Outputs:',
        '  - 0 => [null,"*A"]',
        '  - 1 => [null,"*A"]',
        '  - 2 => [null,"*AB1"]',
        '  - 3 => [null,"*AB2"]',
        '  - 4 => [null,{"b1":"*AB1","b2":"*AB2"}]',
        '  - 5 => [null,"*AB1_*AB2"]',
      ].join('\n'));
    });
    it('handles circular outputs', function() {
      var cyclicJson = {};
      cyclicJson.a = cyclicJson;
      cyclicJson.b = 'B';

      var flow = compile(
        function fa(v, next) { cyclicJson.v = v; next(null, cyclicJson) },
        function fc(v, next) { next(null, v, 'XYZ') }
      );
      var execution = flow.newExecution();
      execution.run(null, '*', function() {});
      expect(execution.toString()).toEqual(['',
        '|',
        'fa#0',
        '|',
        'fc#1',
        '|',
        'Outputs:',
        '  - 0 => [ null, { a: [Circular], b: \'B\', v: \'*\' } ]',
        '  - 1 => [ null, { a: [Circular], b: \'B\', v: \'*\' }, \'XYZ\' ]'
      ].join('\n'));
    });
    it('contains no outputs before the flow runs', function() {
      var flow = compile(
        function fa(v, next) {},
        function fb(v, next) {}
      );
      var execution = flow.newExecution();
      expect(execution.toString()).toEqual(['',
        '|',
        'fa#0',
        '|',
        'fb#1',
        '|'
      ].join('\n'));
    });
    it('can inspect the execution in flight', function() {
      var captured = {};
      var flow = Compiler.new_({translateErrors: true}).compile(
        function fa(next) { next(null, 'A') },
        function fb(v, next) { next(null, v + 'B') },
        function fc(v, next) { next('PROBLEM') },
        comp(function fd(e, v, next) {
          captured.fa = execution.outputOf('fa');
          captured.fb = execution.outputOf('fb');
          next(null, 'Y')
        }),
        function fe(v, next) { next(null, v + 'Z') }
      );
      var execution = flow.newExecution();
      var args;
      execution.run(null, function() { args = u_.toArray(arguments); });
      if (args[0]) throw args[0];
      expect(args).toEqual([null, 'YZ']);
      expect(captured).toEqual({fa: [null, 'A'], fb: [null, 'AB']});
    });
    describe('failure indication', function() {
      it('capures the current state when the failure occurred', function() {
        var flow = Compiler.new_({translateErrors: true}).compile(
          'A',
          function fb(v, next) { next(null, v + 'B') },
          function fc(v, next) { next('PROBLEM') },
          function fd(v, next) { next(null, v + 'D') },
          function fe(v, next) { next(null, v + 'E') }
        );
        var execution = flow.newExecution();
        var args;
        execution.run(null, function() {
          args = u_.toArray(arguments);
        });
        expect(args.length).toBe(1);
        expect(args[0].flowTrace).toEqual(['',
          '|',
          'A#0',
          '|',
          'fb#1',
          '|',
          'fc#2',
          '|',
          'fd#3',
          '|',
          'fe#4',
          '|',
          'Outputs:',
          '  - 0 => [null,"A"]',
          '  - 1 => [null,"AB"]',
          '  - 2 => ["PROBLEM"]',
        ].join('\n'));
      });
      it('provides access to the execution', function() {
        var captured = {};
        var flow = Compiler.new_({translateErrors: true}).compile(
          function fa(next) { next(null, 'A') },
          function fb(v, next) { next(null, v + 'B') },
          function fc(v, next) { next('PROBLEM') },
          comp(function fd(e, v, next) {
            captured.fa = e.execution.outputOf('fa');
            captured.fb = e.execution.outputOf('fb');
            next(null, 'Y')
          }),
          function fe(v, next) { next(null, v + 'Z') }
        );
        var execution = flow.newExecution();
        var args;
        execution.run(null, function() { args = u_.toArray(arguments); });
        if (args[0]) throw args[0];
        expect(args).toEqual([null, 'YZ']);
        expect(captured).toEqual({fa: [null, 'A'], fb: [null, 'AB']});
      });
    });
  });
});
