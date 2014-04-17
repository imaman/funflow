var Graph = require('../lib/graph');
var Screen = require('../lib/screen').Screen;
var extend = require('node.extend');
var u_ = require('underscore');

describe('tree representation', function() {
  describe('quick dump', function() {
    function dump(v, options) {
      options = extend({seqShift: 1, branchShift: 1}, options);
      function preOrder(v, screen) {
        screen.putAt(0, 0, v.key);

        var row = 1;
        var col = 1;
        if (v.type === 'conc') {
          v.targets().forEach(function(t) {
            var dim = preOrder(t, screen.nested(options.branchShift, col));
            col += dim.p;
            row = Math.max(row, dim.s);
          });
          if (v.targets().length) {
            row += options.branchShift;
          }
        } else {
          v.targets().forEach(function(t) {
            var dim = preOrder(t, screen.nested(row, options.seqShift));
            row += dim.s;
            col = Math.max(col, dim.p);
          });
          if (v.targets().length) {
            col += options.seqShift;
          }
        }

        return { s: row, p: col };
      }

      var screen = Screen.new_();
      preOrder(v, screen);
      return screen.render(1);
    }
    it('is a string with horizontal indentation', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'b1');
      g.connect('r1', 'b2');

      expect(dump(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '   a',
        '   r1',
        '      b1',
        '      b2']);
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
        '   a',
        '   r1',
        '      b1',
        '      b2',
        '      r2',
        '         b3',
        '         r3',
        '            b4',
        '            b5',
        '            b6',
        '         b7',
        '   c',
        '   d']);
    });
    it('children of a "conc" node are indented horizontally', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'b1').from.type = 'conc';
      g.connect('r1', 'b2');

      expect(dump(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '   a',
        '   r1',
        '      b1 b2']);
    });
    it('two-level concurrency', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'r2').from.type = 'conc';
      g.connect('r1', 'b3');
      g.connect('r2', 'b1').from.type = 'conc';
      g.connect('r2', 'b2');

      expect(dump(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '   a',
        '   r1',
        '      r2       b3',
        '         b1 b2'
      ]);
    });
    it('concurrency at root', function() {
      var g = Graph.new_();
      g.connect('r0', 'a').from.type = 'conc';
      g.connect('r0', 'b');

      expect(dump(g.vertex('r0'))).toEqual([
        'r0',
        '   a b'
      ].join('\n'));
    });
    it('concurrency with inner sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';

      g.connect('r1', 'b1');
      g.connect('r1', 'b2');

      expect('\n' + dump(g.vertex('r0'))).toEqual(['',
        'r0',
        '   r1',
        '      b1',
        '      b2'
      ].join('\n'));
    });
    it('sequence inside a concurrent branch', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'b2');

      g.connect('r1', 'b1');

      expect('\n' + dump(g.vertex('r0'))).toEqual(['',
        'r0',
        '   r1    b2',
        '      b1'
      ].join('\n'));
    });
    it('concurrent branch inside a sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r0', 'b');

      g.connect('r1', 'c1').from.type = 'conc';
      g.connect('r1', 'c2');

      expect('\n' + dump(g.vertex('r0'))).toEqual(['',
        'r0',
        '   a',
        '   r1',
        '      c1 c2',
        '   b'
      ].join('\n'));
    });
    it('two concurrent sequences', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'r2');

      g.connect('r1', 'b1');
      g.connect('r1', 'b2');

      g.connect('r2', 'b3');
      g.connect('r2', 'b4');
      g.connect('r2', 'b5');

      expect(dump(g.vertex('r0'))).toEqual([
        'r0',
        '   r1    r2',
        '      b1    b3',
        '      b2    b4',
        '            b5'
      ].join('\n'));
    });
    it('two level concurrency with nested sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');

      g.connect('r1', 'r2').from.type = 'conc';
      g.connect('r1', 'r3');
      g.connect('r2', 'r4').from.type = 'conc';
      g.connect('r2', 'b1');

      g.connect('r4', 'b3');
      g.connect('r4', 'b4');
      g.connect('r4', 'b5');

      g.connect('r3', 'b6');
      g.connect('r3', 'b7');

      expect('\n' + dump(g.vertex('r0'))).toEqual(['',
        'r0',
        '   a',
        '   r1',
        '      r2          r3',
        '         r4    b1    b6',
        '            b3       b7',
        '            b4',
        '            b5'
      ].join('\n'));
    });
    it('allows sequences to be laid out vertically', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r0', 'b');

      g.connect('r1', 'c1').from.type = 'conc';
      g.connect('r1', 'c2');

      expect('\n' + dump(g.vertex('r0'), {seqShift: 0})).toEqual(['',
        'r0',
        'a',
        'r1',
        '   c1 c2',
        'b'
      ].join('\n'));
    });
    it('concurrent branch inside a no-shift sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r0', 'b');

      g.connect('r1', 'c1').from.type = 'conc';
      g.connect('r1', 'c2');

      expect('\n' + dump(g.vertex('r0'), {seqShift: 0})).toEqual(['',
        'r0',
        'a',
        'r1',
        '   c1 c2',
        'b'
      ].join('\n'));
    });
    it('no shift sequence inside a concurrent branch', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'b1');

      g.connect('r1', 'b2');
      g.connect('r1', 'b3');

      expect('\n' + dump(g.vertex('r0'), {seqShift: 0})).toEqual(['',
        'r0',
        '   r1 b1',
        '   b2',
        '   b3'
      ].join('\n'));
    });
    it('no-shift branch', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'r2');

      g.connect('r1', 'b1');
      g.connect('r2', 'b2');

      expect('\n' + dump(g.vertex('r0'), {branchShift: 0})).toEqual(['',
        'r0 r1    r2',
        '      b1    b2'
      ].join('\n'));
    });
    it('no-shift branch inside a sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1');
      g.connect('r0', 'c');
      g.connect('r0', 'd');

      g.connect('r1', 'r2').from.type = 'conc';
      g.connect('r1', 'r3');

      g.connect('r2', 'b1');
      g.connect('r3', 'b2');

      expect('\n' + dump(g.vertex('r0'), {branchShift: 0})).toEqual(['',
        'r0',
        '   r1 r2    r3',
        '         b1    b2',
        '   c',
        '   d'
      ].join('\n'));
    });
    it('no-shifting of both sequences and branches', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'r2');

      g.connect('r1', 'b1');
      g.connect('r1', 'b2');

      g.connect('r2', 'b3');
      g.connect('r2', 'b4');
      g.connect('r2', 'b5');

      expect('\n' + dump(g.vertex('r0'), {seqShift: 0, branchShift: 0})).toEqual(['',
        'r0 r1 r2',
        '   b1 b3',
        '   b2 b4',
        '      b5'
      ].join('\n'));
    });
  });
});
