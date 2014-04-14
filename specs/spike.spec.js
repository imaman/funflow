var Graph = require('../lib/graph');

describe('tree representation', function() {
  describe('quick dump', function() {
    function dump(v) {
      var lines = [];
      function preOrder(v, depth) {
        var arr = [];
        var nextDepth = depth + 2;
        while (depth > 0) {
          arr.push(' ');
          depth -= 1;
        }

        arr.push(v);
        lines.push(arr.join(''));
        v.targets().forEach(function(t) {
          preOrder(t, nextDepth);
        });
      }
      preOrder(v, 0);
      return lines.join('\n');
    }
    it('is a string with horizontal indentation', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'b1');
      g.connect('r1', 'b2');

      expect(dump(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '  a',
        '  r1',
        '    b1',
        '    b2']);
    });
  });
});
