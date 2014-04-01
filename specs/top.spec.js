var spawn = require('../lib/top').spawn;
var Top = require('../lib/top').Top;

describe('Top', function() {
  describe('object', function() {
    it('offers a extend method', function() {
      var s = Top.extend({a: 'A', b: 'B' });
      expect(s.a).toEqual('A');
      expect(s.b).toEqual('B');
    });
    it('allows new objects to be extendd from previously .extend()-ed objects', function() {
      var s = Top.extend({a: 'A'});
      var t = s.extend({b: 'B' });
      expect(t.a).toEqual('A');
      expect(t.b).toEqual('B');
    });
    describe('inherited fields', function() {
      it('reference the same object as those in the template object', function() {
        var s = Top.extend({a: []});
        var t = s.extend();
        s.a.push('added to s.a');
        expect(t.a).toEqual(['added to s.a']);
      });
      it('can be overriden at which case they reference a separate object', function() {
        var s = Top.extend({a: []});
        var t = s.extend({a: []});
        s.a.push('added to s.a');
        t.a.push('added to t.a');
        expect(s.a).toEqual(['added to s.a']);
        expect(t.a).toEqual(['added to t.a']);
      });
    });
    describe('methods defined at the template', function() {
      it('made available to all object extendd from that template', function() {
        var t = Top.extend({sum: function(a,b) { return a + b; }});
        var u1 = t.extend();
        var u2 = t.extend();
        expect(u1.sum(5,3)).toEqual(8);
        expect(u2.sum(5,3)).toEqual(8);
      });
      it('are this-bounded to the concrete object, not to the template', function() {
        var t = Top.extend({name_: 't', name: function() { return this.name_ }});
        var u1 = t.extend({name_: 'u1'});
        var u2 = t.extend({name_: 'u2'});

        expect(t.name()).toEqual('t');
        expect(u1.name()).toEqual('u1');
        expect(u2.name()).toEqual('u2');
      });
      it('can be overridden', function() {
        var t = Top.extend({store: function(v) { this.v = 't:' + v; }});
        var u1 = t.extend({store: function(v) { this.v = 'u1:' + v; }});

        t.store('A');
        u1.store('A');

        expect(t.v).toEqual('t:A');
        expect(u1.v).toEqual('u1:A');
      });
      it('overriding method is in effect for all object extendd from its object', function() {
        var t = Top.extend({f: function(v) { return 't:' + v }});
        var u1 = t.extend({f: function(v) { return 'u1:' + v }});
        var u2 = u1.extend();

        expect(t.f('A')).toEqual('t:A');
        expect(u1.f('A')).toEqual('u1:A');
        expect(u2.f('A')).toEqual('u1:A');
      });
      it('allows access to template object via .up()', function() {
        var t = Top.extend({f: function(v) { return '<' + v + '>' }});
        var u = t.extend({f: function(v) { return '*' + this.up().f(v) + '*' }});

        expect(u.f('A')).toEqual('*<A>*');
      });
    });
    it('allows each new object to be initialized with its own data', function() {
      var s = Top.extend(function() { return { arr: []}});
      var t1 = s.extend();
      t1.arr.push('t1');

      var t2 = s.extend();
      t2.arr.push('t2');

      expect(t1.arr).toEqual(['t1']);
      expect(t2.arr).toEqual(['t2']);
    });
    it('allows .extend() to take defs and an init function at the same time', function() {
      var s = Top.extend({a: 'A', b: 'B'}, function() { return { arr: []}});
      var t1 = s.extend();
      t1.arr.push('t1');

      var t2 = s.extend();
      t2.arr.push('t2');

      expect(t1.arr).toEqual(['t1']);
      expect(t1.a).toEqual('A');
      expect(t1.b).toEqual('B');

      expect(t2.arr).toEqual(['t2']);
      expect(t2.a).toEqual('A');
      expect(t2.b).toEqual('B');
    });
    it('treats _init_ as a reserved key', function() {
      expect(function() { Top.extend({ _init_: 'something' }) }).toThrow();
    });
    describe('init function', function() {
      it('receives a combination of the template and creation defs', function() {
        var s = Top.extend({a: 'A'}, function(defs) { return { c: defs.a + defs.b }});
        var t = s.extend({b: 'B'});

        expect(t.a).toEqual('A');
        expect(t.b).toEqual('B');
        expect(t.c).toEqual('AB');
      });
      it('wins when it conflicts with the parent (template) defs', function() {
        var s = Top.extend({a: 'TEMPLATE'}, function() { return { a: 'INIT' }});
        var t = s.extend();
        expect(t.a).toEqual('INIT');
      });
      it('wins when it conflicts with the creation defs', function() {
        // Discussion: if s has an init function and we call s.extend(creationDefs)
        // then who should win: the init function or creationDefs?
        // On the one hand, creationDefs is specific to the instantiation point
        // whereas init is generic to all instansitation of s so it makes sense to
        // give higher priority to creationDefs.
        // On the other hand, guven that client code can change the extendd
        // object as he see fit (immediatley after creation), there is no added
        // value in letting it achieve the same via creationDefs. There is
        // certainly great value in letting the init() function gain full access to
        // creationDefs as it can run some logic that is affected by creationDefs.
        //
        // Bottom line: init function wins.
        //
        // Continued: After some more thinking changed the init function such that
        // it takes the object to be extendd as a parameter (thus avoiding
        // confusion regarding 'what is the value of this when the init function
        // runs?'. This make the 'init should win' argument even stronger.
        var s = Top.extend({a: 'TEMPLATE'}, function() { return { a: 'INIT' }});
        var t = s.extend({a: 'CHILD'});
        expect(t.a).toEqual('INIT');
      });
      it('is not applied to the template object', function() {
        var s = Top.extend({a: 'A_FROM_DEFS'}, function() {
          this.a = 'A_FROM_INIT';
          this.b = 'B_FROM_INIT';
        });
        expect(s.a).toBe('A_FROM_DEFS');
        expect(s.b).toBe(undefined);
      });
      it('runs with "this" bound to an empty object', function() {
        var capturedThis = 'NOT_AN_EMPTY_OBJECT';
        var s = Top.extend(function() { capturedThis = this; });
        s.extend();
        expect(capturedThis).toEqual({});
      });
      it('is inherited if not overridden', function() {
        var t = Top.extend({name: 't'}, function(defs) { return { upper: defs.name.toUpperCase() }});

        var u = t.extend({name: 'u'});
        expect(u.upper).toEqual('U');

        var v = u.extend({name: 'v'});
        expect(v.upper).toEqual('V');
      });
    });
    describe('new_', function() {
      it('can crate an object with var. args', function() {
        var s = Top.extend(function(defs, a, b) { return { a: a, b: b }});
        var t = s.new_('A', 'B');
        expect(t.a).toEqual('A');
        expect(t.b).toEqual('B');
      });
      it('recevies defs as first parameter', function() {
        var t = Top.extend({a: 'A', b: 'B' }, function(defs, sep) { return { c: defs.a + sep + defs.b }});
        var u = t.new_('_');
        expect(u.a).toEqual('A');
        expect(u.b).toEqual('B');
        expect(u.c).toEqual('A_B');
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
    it('can be extendd with its own props', function() {
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

