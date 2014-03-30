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

var Top = spawn({
  _init_: function() { return {}; },
  create: function(defs, init) {
    if (arguments.length === 2) {
      var delta = extend({}, { _init_: init }, defs);
      return this.create(delta);
    }

    if (!util.isFunction(defs)) {
      var base = spawn(this, defs);
      var override = this._init_.call(null, base);
      var finalResult = extend(base, override);
      return finalResult;
    }

    return this.create({ _init_: defs });
  }
});

module.exports.spawn = spawn;
module.exports.Top = Top;


