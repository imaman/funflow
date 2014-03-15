require('util-is');
var util = require('util');

function Seq(a) {
  if (!util.isArray(a)) {
    throw new Error('a is not an array: ' + a);
  }
}

Seq.prototype.wrap = function() {
}

module.exports = Seq;


