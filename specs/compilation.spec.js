var compile = require('../lib/compilation').compile;

describe('compilation', function() {
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
