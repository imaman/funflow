require('util-is');
var util = require('util');
var extend = require('node.extend');

function spawn(parent, props) {
  var defs = {}, key;
  for (key in props) {
    if (props.hasOwnProperty(key)) {
      defs[key] = {value: props[key], enumerable: true};
    }
  }
  return Object.create(parent, defs);
}

var Top = spawn({
  _init_: function() { return {}; },
  create: function(defs) {
    if (!util.isFunction(defs)) {
      var delta = extend(this._init_(), defs);
      return spawn(this, delta);
    }

    return this.create({ _init_: defs });
  }
});

module.exports.spawn = spawn;
module.exports.Top = Top;


