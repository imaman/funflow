var Graph = require('../lib/graph');
var Screen = require('../lib/screen').Screen;

describe('tree representation', function() {
  describe('quick dump', function() {
    function dump(v) {
      var lines = [];
      function preOrder(v, screen) {
        screen.putAt(0, 0, v.key);

        var row = 0;
        v.targets().forEach(function(t) {
          ++row;
          var dim = preOrder(t, screen.nested(row, 1));
          row += dim.s;
        });

        return { s: row };
      }

      var screen = Screen.new_();
      preOrder(v, screen);
      return screen.render(0);
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
    it('nests as needed', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'b1');
      g.connect('r1', 'b2');
      g.connect('r1', 'r2');
      g.connect('r2', 'b3');
      g.connect('r2', 'r3');
      g.connect('r3', 'b4');
      g.connect('r3', 'b5');
      g.connect('r3', 'b6');
      g.connect('r2', 'b7');
      g.connect('r0', 'c');
      g.connect('r0', 'd');

      expect(dump(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '  a',
        '  r1',
        '    b1',
        '    b2',
        '    r2',
        '      b3',
        '      r3',
        '        b4',
        '        b5',
        '        b6',
        '      b7',
        '  c',
        '  d']);
    });
    xit('children of a "conc" node are indented horizontally', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'b1').from.type = 'conc';
      g.connect('r1', 'b2');

      expect(dump(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '  a',
        '  r1',
        '    b1 b2']);
    });
  });
});
