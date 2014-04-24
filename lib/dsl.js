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
  accept: function(v) { return v.sequence(this) }
});

var Fork = Composite.extend({
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
  },
  isRescue: true,
}, function(defs, payload, inArity, name) {
  return { payload_: payload, inArity_: inArity === undefined ? payload.length : inArity, name_: name };
});

function rescue(f) {
  return Computation.new_(f);
}


function rootFromDsl(dsl, prefix) {
  prefix = prefix || '_temp_';
  var n = 0;

  function nextId() {
    var result = prefix + n;
    n += 1;
    return result;
  }

  function translate(dsl) {
    if (dsl.isRescue) {
      dsl.setId(nextId());
      return dsl;
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
      var wrapper = function() {
        var args = u_.toArray(arguments);
        var e = args[0];
        var trap = u_.last(args);
        if (e) return trap(e);
        try {
          dsl.apply(null, args.slice(1));
        } catch (exception) {
          trap(exception);
        }
      }
      return Computation.new_(wrapper, dsl.length + 1, dsl.name).setId(nextId());
    }

    return Computation.new_(function(next) { next(null, dsl) },
        2, dsl.toString()).setId(dsl.toString());
  }
  return translate(dsl);
}


exports.rescue = rescue;
exports.rootFromDsl = rootFromDsl;

