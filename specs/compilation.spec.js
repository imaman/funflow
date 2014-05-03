var compile = require('../lib/compilation').compile;
var Compiler = require('../lib/compilation').Compiler;

describe('compilation', function() {
  describe('translation of DSL into Flow', function() {
    it('creates a flow when .compile() is called', function() {
      var flow = Compiler.new_().compile(['A', 'B']);
      expect('\n' + flow.toString()).toEqual(['',
        '',
        '|',
        'A#0',
        '|',
        'B#1',
        '|'
      ].join('\n'));
    });
    it('treats var args as a sequence', function() {
      var seqFlow = Compiler.new_().compile(['A', 'B']);
      var varArgflow = Compiler.new_().compile('A', 'B');
      expect(varArgflow.toString()).toEqual(seqFlow.toString());
    });
    it('treats var args as a sequence when the compile() function is used', function() {
      var seqFlow = compile(['A', 'B']);
      var varArgflow = compile('A', 'B');
      expect(varArgflow.toString()).toEqual(seqFlow.toString());
    });
  });
  describe('diagram of a fully compiled flow', function() {
    it('shows IDs', function() {
      var executable = compile([
        'A',
        'B'
      ]);
      expect('\n' + executable.toString()).toEqual(['',
        '',
        '|',
        'A#0',
        '|',
        'B#1',
        '|'
      ].join('\n'));
    });
    it('shows IDs in a complex graph', function() {
      var executable = compile([
        'A',
        {b1: 'B1', b2: ['B21', 'B22']},
        'C']);
      expect('\n' + executable.toString()).toEqual(['',
        '',
        '|',
        'A#0',
        '|',
        '|',
        '+->-+----+',
        '    |    |',
        '    B1#3 |',
        '    |    B21#4',
        '    |    |',
        '    |    B22#5',
        '    v    |',
        '    |    |',
        '+-<-+----+',
        'C#6',
        '|'
      ].join('\n'));
    });
  });
});

