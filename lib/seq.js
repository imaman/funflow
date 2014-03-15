require('util-is');
var util = require('util');

function Seq(a) {
  if (!util.isArray(a)) {
    throw new Error('a is not an array: ' + a);
  }
  this.kids = a;
}

Seq.prototype.wrap = function() {
  var self = this;
  return function() {
    self.kids[0].wrap().apply(null, arguments);    
  }
}

module.exports = Seq;


