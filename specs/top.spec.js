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
    it('allows .create() to take defs and an init function at the same time', function() {
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
    it('treats _init_ as a reserved key', function() {
      expect(function() { Top.create({ _init_: 'something' }) }).toThrow();
    });
    describe('init function', function() {
      it('receives a combination of the template and creation defs', function() {
        var s = Top.create({a: 'A'}, function(defs) { return { c: defs.a + defs.b }});
        var t = s.create({b: 'B'});

        expect(t.a).toEqual('A');
        expect(t.b).toEqual('B');
        expect(t.c).toEqual('AB');
      });
      it('wins when it conflicts with the parent (template) defs', function() {
        var s = Top.create({a: 'TEMPLATE'}, function() { return { a: 'INIT' }});
        var t = s.create();
        expect(t.a).toEqual('INIT');
      });
      it('wins when it conflicts with the creation defs', function() {
        // Discussion: if s has an init function and we call s.create(creationDefs)
        // then who should win: the init function or creationDefs?
        // On the one hand, creationDefs is specific to the instantiation point
        // whereas init is generic to all instansitation of s so it makes sense to
        // give higher priority to creationDefs.
        // On the other hand, guven that client code can change the created
        // object as he see fit (immediatley after creation), there is no added
        // value in letting it achieve the same via creationDefs. There is
        // certainly great value in letting the init() function gain full access to
        // creationDefs as it can run some logic that is affected by creationDefs.
        //
        // Bottom line: init function wins.
        //
        // Continued: After some more thinking changed the init function such that
        // it takes the object to be created as a parameter (thus avoiding
        // confusion regarding 'what is the value of this when the init function
        // runs?'. This make the 'init should win' argument even stronger.
        var s = Top.create({a: 'TEMPLATE'}, function() { return { a: 'INIT' }});
        var t = s.create({a: 'CHILD'});
        expect(t.a).toEqual('INIT');
      });
      it('is not applied to the template object', function() {
        var s = Top.create({a: 'A_FROM_DEFS'}, function() {
          this.a = 'A_FROM_INIT';
          this.b = 'B_FROM_INIT';
        });
        expect(s.a).toBe('A_FROM_DEFS');
        expect(s.b).toBe(undefined);
      });
      it('runs with "this" bound to an empty object', function() {
        var capturedThis = 'NOT_AN_EMPTY_OBJECT';
        var s = Top.create(function() { capturedThis = this; });
        s.create();
        expect(capturedThis).toEqual({});
      });
      it('runs after init function of template has been run', function() {
        var s = Top.create(function() { return { a: 's' }});
        var t = s.create(function(defs) { return { a: defs.a + 't' }});
        var u = t.create(function(defs) { return { a: defs.a + 'u' }});
        var v = u.create();
        expect(v.a).toEqual('stu');
      });
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

