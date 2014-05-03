var newFlow = require('../lib/compilation').newFlow;

describe('Execution', function() {
  it('reports the IDs of all computation nodes', function() {
    var flow = newFlow('A', 'B', 'C');
    var execution = flow(null, function() {});
    expect(execution.ids()).toEqual([0, 1, 2, 3]);
  });
  describe('after the fact inspection', function() {
    var flow = newFlow(
      function(v, next) { next(null, v +'A') },
      function(v, next) { next(null, v +'B') },
      function(v, next) { next(null, v +'C') });
    var execution = flow(null, '_', function() {});
    expect(execution.outputOf(0)).toEqual([null, '_A']);
    expect(execution.outputOf(1)).toEqual([null, '_AB']);
    expect(execution.outputOf(2)).toEqual([null, '_ABC']);
  });
});
