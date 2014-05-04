var compile = require('../lib/compilation').compile;
var Compiler = require('../lib/compilation').Compiler;

describe('flow', function() {
  describe('execution', function() {
    it('creates an Execution', function() {
      var flow = Compiler.new_().compile('A', 'B');
      var execution = flow.newExecution();
      execution.run(null, function(e, v) {
        expect(e).toBe(null);
        expect(v).toEqual('B');
        expect(execution.outputOf(0)).toEqual([null, 'A']);
        expect(execution.outputOf(1)).toEqual([null, 'B']);
      });
    });
    it('an execution can only be run() once', function() {
      var flow = Compiler.new_().compile('A', 'B');
      var execution = flow.newExecution();
      execution.run(null, function() {});
      expect(function() { execution.run() }).toThrow('An Execution can only run once.');
    });
  });
});

