var Top = require('../lib/top').Top;
require('util-is');
var util = require('util');
var u_ = require('underscore');

var Node = Top.extend({
  forEach: function() {},
  setSlot: function(arg) { this.slot_ = arg; return this },
  slot: function() { return this.slot_; },
  key: function() { return this.id_ },
  setId: function(arg) { this.id_ = arg; return this; },
  setOutArity: function(arg) { this.outArity_ = arg; return this },
  outArity: function() { return this.outArity_ },
  toString: function() { return this.id_ }
}, function(defs, id) {
  return { id_: id }
});

var Composite = Node.extend({
  forEach: function(f) { this.kids_.forEach(f) },
  map: function(f) { return this.kids_.map(f) }
}, function(defs, id, kids) {
  return { kids_: kids, id_: id }
});

var Sequence = Composite.extend({
  accept: function(v) { return v.sequence(this) },
});

var Fork = Composite.extend({
  setMerge: function(arg) { this.merge_ = arg; return this },
  merge: function() { return this.merge_ },
  accept: function(v) { return v.fork(this) }
});

var Computation = Node.extend({
  payload: function() { return this.payload_ },
  accept: function(v) { return v.computation(this) },
  inArity: function() { return this.inArity_ },
  displayName: function() {
    if (this.name_)
      return this.name_;
    return (this.payload_ && this.payload_.name) || this.id_;
  }
}, function(defs, payload, inArity, name) {
  return { payload_: payload, inArity_: inArity === undefined ? payload.length : inArity, name_: name };
});

function wrap(f) {
  return function() {
    var args = u_.toArray(arguments);
    var e = args[0];
    var trap = u_.last(args);
    if (e) return trap(e);
    try {
      f.apply(null, args.slice(1));
    } catch (exception) {
      trap(exception);
    }
  }
}

var ForkOperator = Top.extend({
}, function(defs, dsl, merge) {
  return { branches: dsl, merge: merge }
});

function fork(dsl, merge) {
  return ForkOperator.new_(dsl, merge);
}

function timer(frequencyIsMillis, timeoutInMillis) {
  timeoutInMillis = timeoutInMillis || 60*1000;
  var active = false;
  return single(function() {
    var t0 = process.hrtime();
    var next = u_.last(u_.toArray(arguments));

    function recurse() {
      setTimeout(function() {
        var diff = process.hrtime(t0);
        var nanos = diff[0] * 1e9 + diff[1];
        var millis = nanos / 1e6;
        if (millis > timeoutInMillis) {
          var error = new Error('Timeout');
          error.duration = millis;
          return next(error);
        }

        next(null, millis);
        recurse();
      }, frequencyIsMillis).unref();
    }
    recurse();
  });
}

function single(f) {
  return Computation.new_(wrap(f)).setOutArity(1);
}

function comp(f) {
  return Computation.new_(f);
}

function treeFromDsl(dsl, prefix) {
  prefix = prefix || '_temp_';
  var n = 0;

  function nextId() {
    var result = prefix + n;
    n += 1;
    return result;
  }

  function translate(dsl) {
    if (dsl.up && dsl.up() === Computation) {
      return dsl.setId(nextId());
    }
    if (dsl.up && dsl.up() === ForkOperator) {
      return Fork.new_(nextId(), Object.keys(dsl.branches).map(function(k) {
        return translate(dsl.branches[k]).setSlot(k);
      })).setMerge(dsl.merge);
    }

    if (util.isArray(dsl)) {
      return Sequence.new_(nextId(), dsl.map(function(current) {
        return translate(current);
      }));
    }

    if (util.isPureObject(dsl)) {
      return Fork.new_(nextId(), Object.keys(dsl).map(function(k) {
        return translate(dsl[k]).setSlot(k);
      }));
    }

    if (util.isFunction(dsl)) {
      return Computation.new_(wrap(dsl), dsl.length + 1, dsl.name).setId(nextId());
    }

    return Computation.new_(wrap(function() {
      var args = u_.toArray(arguments);
      var next = u_.last(args);
      next(null, dsl)
    }), 2, dsl.toString()).setId(nextId());
  }
  return translate(dsl);
}


exports.timer = timer;
exports.comp = comp;
exports.single = single;
exports.fork = fork;
exports.treeFromDsl = treeFromDsl;

