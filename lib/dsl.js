var Top = require('../lib/top').Top;
require('util-is');
var util = require('util');

var Node = Top.extend({
  forEach: function() {},
  setSlot: function(arg) { this.slot_ = arg; return this },
  slot: function() { return this.slot_; },
  key: function() { return this.id_ },
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

var Terminal = Node.extend({
  payload: function() { return this.payload_ },
  displayName: function() {
    return (this.payload_ && this.payload_.name) || this.id_;
  },
  accept: function(v) { return v.terminal(this) },
}, function(defs, id, payload) {
  return {
    kids_: undefined,
    id_: id,
    payload_: payload
}});

var Rescue = Node.extend({
  isRescue: true,
  displayName: function() {
    return (this.payload_ && this.payload_.name) || this.id_;
  },
  payload: function() { return this.payload_ },
  accept: function(v) { return v.rescue(this) }
}, function(defs, f) {
  return { payload_: f}
});

function rescue(f) {
  return Rescue.new_(f);
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
      return Terminal.new_(nextId(), dsl);
    }

    return Terminal.new_(dsl.toString());
  }
  return translate(dsl);
}


exports.rescue = rescue;
exports.rootFromDsl = rootFromDsl;

