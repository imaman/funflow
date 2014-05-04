var compile = require('../lib/compilation').compile;
var Compiler = require('../lib/compilation').Compiler;

describe('flow', function() {
  describe('execution', function() {
    xit('creates an Execution', function() {
      var flow = Compiler.new_().compile('A', 'B');
      var execution = flow.newExeuction();
      execution.run(function(e, v) {
        expect(e).toBe(null);
        expect(v).toEqual('B');
        exepct(execution.outputOf(0)).toEqual('A');
        exepct(execution.outputOf(1)).toEqual('B');
      });
    });
  });
});

