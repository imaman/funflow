var spawn = require('../lib/top').spawn;
var Top = require('../lib/top').Top;

describe('Top', function() {
  describe('object', function() {
    it('offers a create method', function() {
      var s = Top.create({a: 'A', b: 'B' });
      expect(s.a).toEqual('A');
      expect(s.b).toEqual('B');
    });
    it('allows new objects to be created from previously .create()-ed objects', function() {
      var s = Top.create({a: 'A'});
      var t = s.create({b: 'B' });
      expect(t.a).toEqual('A');
      expect(t.b).toEqual('B');
    });
    it('allows each new objects to be initialized with its own data', function() {
      var s = Top.create(function() { return { arr: []}});
      var t1 = s.create();
      t1.arr.push('t1');

      var t2 = s.create();
      t2.arr.push('t2');

      expect(t1.arr).toEqual(['t1']);
      expect(t2.arr).toEqual(['t2']);
    });
    it('allows an object to be defined with both properties and an init function', function() {
      var s = Top.create({a: 'A', b: 'B'}, function() { return { arr: []}});
      var t1 = s.create();
      t1.arr.push('t1');

      var t2 = s.create();
      t2.arr.push('t2');

      expect(t1.arr).toEqual(['t1']);
      expect(t1.a).toEqual('A');
      expect(t1.b).toEqual('B');

      expect(t2.arr).toEqual(['t2']);
      expect(t2.a).toEqual('A');
      expect(t2.b).toEqual('B');
    });
    it('allows the init function to access an already initialized this', function() {
      var s = Top.create({a: 'A'}, function() { this.c = this.a + this.b; });
      var t = s.create({b: 'B'});

      expect(t.a).toEqual('A');
      expect(t.b).toEqual('B');
      expect(t.c).toEqual('AB');
    });
    it('init function wins when it conflicts with the defs', function() {
      var s = Top.create({a: 'A_FROM_DEFS'}, function() { this.a = 'A_FROM_INIT'; });
      var t = s.create();
      expect(t.a).toEqual('A_FROM_INIT');
    });
    it('init function is not applied to the template object', function() {
      var s = Top.create({a: 'A_FROM_DEFS'}, function() {
        this.a = 'A_FROM_INIT';
        this.b = 'B_FROM_INIT';
      });
      expect(s.a).toBe('A_FROM_DEFS');
      expect(s.b).toBe(undefined);
    });
  });
  describe('spawn function', function() {
    it('has sll props of parents', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p);
      expect(s.a).toEqual('A');
      expect(s.b).toEqual('B');
    });
    it('is affected by a prop-mutation on the parent', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p);
      p.a = 'SOME_NEW_VALUE';
      expect(s.a).toEqual('SOME_NEW_VALUE');
    });
    it('does not affect parent', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 'C', d: 'D'});
      expect(p.c).toBe(undefined);
      expect(p.d).toBe(undefined);
    });
    it('does not show parent props in its JSON representation', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p);
      expect(JSON.stringify(s)).toEqual('{}');
    });
    it('can be created with its own props', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 'C', d: 'D'});
      expect(s.c).toEqual('C');
      expect(s.d).toEqual('D');
    });
    it('contains its own props in its JSON representation', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 'C', d: 'D'});
      expect(JSON.stringify(s)).toEqual('{"c":"C","d":"D"}');
    });
    it('can have own functions', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 5, f: function(n) { return n + this.c }});
      expect(s.f(2)).toEqual(7);
    });
    it('does not show own methods in its JSON representation', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 5, f: function(n) { return n + this.c }});
      expect(JSON.stringify(s)).toEqual('{"c":5}');
    });
    it('inherits methods from parent', function() {
      var p = { a: 'A', b: 'B', f: function(v) { return this.a + this.b + this.c + v}};
      var s = spawn(p, { c: 'C' });
      expect(s.f('D')).toEqual('ABCD');
    });
    it('allows a parent method to call overriding method', function() {
      var p = { f: function(v) { return '_' + this.g() + '_' }, g: function() { return 'p' } };
      var s = spawn(p, { g: function() { return 's' }});
      expect(s.f()).toEqual('_s_');
    });
  });
});

