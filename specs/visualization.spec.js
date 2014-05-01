var Graph = require('../lib/graph');
var treeFromDsl = require('../lib/dsl').treeFromDsl;
var comp = require('../lib/dsl').comp;
var show = require('../lib/visualization').show;
var compile = require('../lib/evaluation').compile;

describe('visualization', function() {
  describe('diargam', function() {
    it('connects sequence vertices', function() {
      var g = treeFromDsl(['a', 'b', 'c', 'd']);
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        'a',
        '|',
        'b',
        '|',
        'c',
        '|',
        'd',
        '|'
      ].join('\n'));
    });
    it('uses function name when present', function() {
      var g = treeFromDsl([function f1(){}, function f2(){}]);
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        'f1',
        '|',
        'f2',
        '|'
      ].join('\n'));
    });
    it('defaults to a unique ID for unnamed functions', function() {
      var g = treeFromDsl([function (){}, function (){}], 't');
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        't1',
        '|',
        't2',
        '|'
      ].join('\n'));
    });
    it('uses the inner function name for comp functions', function() {
      var g = treeFromDsl([comp(function INNER(){})], 't');
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        'INNER',
        '|'
      ].join('\n'));
    });
    it('defaults to a unique ID if the inner function name is unnamed', function() {
      var g = treeFromDsl([comp(function (){})], 't');
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        't1',
        '|'
      ].join('\n'));
    });
    it('connects fork vertices', function() {
      var g = treeFromDsl({a: 'A', b: 'B', c: 'C'});
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        '+-+-+-+',
        '  | | |',
        '  A B C',
        '  | | |',
        '  | | |',
        '+-+-+-+'
      ].join('\n'));
    });
    it('can add left/right arrows', function() {
      var g = treeFromDsl({a: 'A', b: 'B', c: 'C'});
      expect('\n' + show(g, {forkArrows: true, connect: true})).toEqual(['',
        '|',
        '+->-+-+-+',
        '    | | |',
        '    A B C',
        '    | | |',
        '    | | |',
        '+-<-+-+-+',
      ].join('\n'));
    });
    it('extends vertical connector all the way down', function() {
      var g = treeFromDsl({a: 'A', b: ['B1', 'B2', 'B3']});
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        '+-+-+',
        '  | |',
        '  A |',
        '  | B1',
        '  | |',
        '  | B2',
        '  | |',
        '  | B3',
        '  | |',
        '  | |',
        '+-+-+'
      ].join('\n'));
    });
    it('can add a down-arrow after three bars', function() {
      var g = treeFromDsl({a: 'A', b: ['B1', 'B2', 'B3']});
      expect('\n' + show(g, {connect: true, downArrows: true})).toEqual(['',
        '|',
        '+-+-+',
        '  | |',
        '  A |',
        '  | B1',
        '  | |',
        '  | B2',
        '  v |',
        '  | B3',
        '  | |',
        '  | |',
        '+-+-+'
      ].join('\n'));
    });
    it('connects deeply nested graph', function() {
      var g = treeFromDsl([
        'a',
        {b1: 'B1', b2: 'B2', b3: {b4: 'B4', b5: 'B5'}},
        {c1: 'C1', c2: ['C3', 'C4']},
        'd']);
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        'a',
        '|',
        '|',
        '+-+--+--+',
        '  |  |  |',
        '  B1 B2 |',
        '  |  |  +-+--+',
        '  |  |    |  |',
        '  |  |    B4 B5',
        '  |  |    |  |',
        '  |  |    |  |',
        '  |  |  +-+--+',
        '  |  |  |',
        '+-+--+--+',
        '|',
        '+-+--+',
        '  |  |',
        '  C1 |',
        '  |  C3',
        '  |  |',
        '  |  C4',
        '  |  |',
        '  |  |',
        '+-+--+',
        'd',
        '|'
      ].join('\n'));
    });
  });
  describe('diagram of a fully compiled flow', function() {
    it('shows IDs', function() {
      var executable = compile([
        'A',
        {b1: 'B1', b2: ['B21', 'B22']},
        'C']);
      expect('\n' + executable.toString()).toEqual(['',
        '',
        '|',
        'A',
        '|',
        '|',
        '+->-+--+',
        '    |  |',
        '    B1 |',
        '    |  B21',
        '    |  |',
        '    |  B22',
        '    v  |',
        '    |  |',
        '+-<-+--+',
        'C',
        '|'
      ].join('\n'));
    });
  });
});



