var Graph = require('../lib/graph');
var Top = require('../lib/top').Top;

describe('tree representation', function() {
  describe('quick dump', function() {
    var Screen = Top.extend({
        putAt: function(row, col, value) {
          this.entries.push({r: row, c: col, v: value});
        },
        render: function() {
          var max = this.entries.reduce(function(soFar, current) {
            var maxR = Math.max(soFar.r, current.r);
            var maxC = Math.max(soFar.c, current.c);
            return {r: maxR, c: maxC};
          }, {r: 0, c: 0});

          var r;
          var c;

          var lines = [];
          for (r = 0; r <= max.r; ++r) {
            var line = [];
            for (c = 0; c <= max.c; ++c) {
              var es = this.entries.filter(function(current) { return current.r === r && current.c === c });
              if (es.length > 1)
                throw new Error('Colliding entries at ' + r + 'x' + c);
              if (es.length === 0) {
                line.push('');
                continue;
              }

              line.push(es[0].v);
            }
            lines.push(line.join(' ').replace(/[ ]+$/, ''));
          }
          return lines.join('\n');
        }
      },
      function() {
        return { entries: [] }
      });
    function dump(v) {
      var lines = [];
      var screen = Screen.new_();
      var ln = 0;
      function preOrder(v, depth) {
        var arr = [];
        var nextDepth = depth + 2;
        screen.putAt(ln, depth, v);
        ln += 1;

        v.targets().forEach(function(t) {
          preOrder(t, nextDepth);
        });
      }
      preOrder(v, 0);
      return screen.render();
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
  });
});
