require('util-is');
var util = require('util');
var extend = require('node.extend');

function spawn(parent, props) {
  var defs = {}, key;
  for (key in props) {
    if (props.hasOwnProperty(key)) {
      defs[key] = {value: props[key], enumerable: true, writable: true};
    }
  }
  return Object.create(parent, defs);
}

/**
 * TOP: Transparent Object Platform.
 */
var Top = spawn({
  _init_: function() { return {}; },
  create: function(defs_, init) {
    var defs = defs_;
    if (!init && util.isFunction(defs_)) {
      init = defs;
      defs = {};
    }
    defs = defs || {};

    if (defs._init_)
      throw new Error('creation defs cannot contain the "_init_" key');

    var up = this;
    defs = extend({}, defs, { _init_: init, up: function() { return up }});
    var base = spawn(this, defs);
    var override = this._init_.call({}, base);
    return extend(base, override);
  }
});

module.exports.spawn = spawn;
module.exports.Top = Top;


