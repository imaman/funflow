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
  create: function(defs) {
    return spawn(this, defs);
  }
});

module.exports.spawn = spawn;
module.exports.Top = Top;


