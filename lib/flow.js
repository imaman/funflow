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

  function asFunction() {
    return function(e) {
      var exec = newExecution();
      exec.run.apply(exec, arguments);
      return exec;
    };
  }


  function run() {
    return asFunction().apply(null, arguments);
  }

  function toS() {
    return '\n' + show(root, {connect: true, downArrows: true, forkArrows: true});
  }

  var result = asFunction();
  result.asFunction = asFunction;
  result.newExecution = newExecution;
  result.run = run;
  result.toString = toS;

  return result;
}

exports.create = create;

