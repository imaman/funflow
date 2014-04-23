var Top = require('../lib/top').Top;
require('util-is');
var util = require('util');

var Node = Top.extend({
  forEach: function() {},
  map: function() {},
  setSlot: function(arg) { this.slot_ = arg; return this },
  slot: function() { return this.slot_; },
  key: function() { return this.key_ },
//  isFork: function() { return false },
//  isSequence: function() { return false },
  toString: function() { return this.key_ }
}, function(defs, id) {
  return { key_: id }
});

var Composite = Node.extend({
  forEach: function(f) { this.kids_.forEach(f) },
  map: function(f) { return this.kids_.map(f) }
}, function(defs, id, kids) {
  return { kids_: kids, key_: id }
});

var Sequence = Composite.extend({
//  isFork: function() { return false },
//  isSequence: function() { return true },
  accept: function(v) { return v.sequence(this) }
});

var Fork = Composite.extend({
  isFork: function() { return true },
  isSequence: function() { return false },
  accept: function(v) { return v.fork(this) }
});

var Terminal = Node.extend({
  payload: function() { return this.payload_ },
  displayName: function() {
    return (this.payload_ && this.payload_.name) || this.key_;
  },
  accept: function(v) { return v.terminal(this) },
}, function(defs, id, payload) {
  return {
    kids_: undefined,
    key_: id,
    payload_: payload
}});

function rootFromDsl(dsl, prefix) {
  prefix = prefix || '_temp_';
  var n = 0;

  function nextId() {
    var result = prefix + n;
    n += 1;
    return result;
  }

  function translate(dsl) {
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

exports.rootFromDsl = rootFromDsl;

