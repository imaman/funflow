var compile = require('../lib/compilation').compile;
var Compiler = require('../lib/compilation').Compiler;

describe('compilation', function() {
  describe('options', function() {
    it('yells if an illegal option was passed in', function() {
      expect(function() {
        Compiler.new_({'ILLEGAL_OPTION': 'dont_care'})
      }).toThrow('Unrecognized option(s): ILLEGAL_OPTION in {"ILLEGAL_OPTION":"dont_care"}');
    });
    it('does not yell if all options are recorgnized', function() {
      Compiler.new_({'translateErrors': true, branchOp: ''});
    });
  });
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
  describe('static checking', function() {
    it('yells on name conflict when require-unique-names flag is specified', function() {
      expect(function() {
        Compiler.new_({ requireUniqueNames: true }).compile(
          function f1() {},
          function f1() {}
        );
      }).toThrow('Found 2 functions named "f1"');
    });
    it('specifies the number of times the function has been used', function() {
      expect(function() {
        Compiler.new_({ requireUniqueNames: true }).compile(
          function fa() {},
          function fb() {},
          function fc() {},
          function fb() {},
          function fb() {},
          function fd() {}
        );
      }).toThrow('Found 3 functions named "fb"');
    });
  });
  describe('optimizations', function() {
    it('inlines nested sequences', function() {
      var flow = compile('A', ['B', ['C', ['D', 'E'], ['F']]]);
      var execution = flow(null, function() {});


      function traverse(v) {
        var acc = [];
        var visited = {};
        var q = [v];
        while(q.length > 0) {
          var curr = q.pop();
          curr.targets().forEach(function(t) {
            if (visited[t])
              return;

            visited[t] = true;
            acc.push(curr + '->' + t);
            q.push(t);
          });
        }
        acc.sort();
        return acc;
      }

      var acc = traverse(execution.realV0_);
      expect(acc).toEqual([
        '0->1',
        '1->2',
        '2->3',
        '3->4',
        '4->5'
      ]);
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
        '    B1#2 |',
        '    |    B21#3',
        '    |    |',
        '    |    B22#4',
        '    v    |',
        '    |    |',
        '+-<-+----+',
        'C#6',
        '|'
      ].join('\n'));
    });
  });
});

