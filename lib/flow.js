var u_ = require('underscore');
var Top = require('./top').Top;
var Execution = require('./execution').Execution;
var show = require('./visualization').show;

function create(root, realV0, options) {
  function newExecution(deprecate) {
    if (deprecate)
      throw new Error('no arg. should be passed here');
    return Execution.new_(null, root, null, realV0, options);
  }

  var result = function(e) {
    var exec = newExecution();
    exec.run.apply(exec, arguments);
    return exec;
  };

  result.newExecution = newExecution;
  result.toString = function() {
    return '\n' + show(root, {connect: true, downArrows: true, forkArrows: true});
  };


  return result;
}

exports.create = create;

