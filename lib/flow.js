var Execution = require('./execution').Execution;
var show = require('./visualization').show;

function create(root, realV0, orderedVertices, options) {
  function newExecution() {
    return Execution.new_(null, root, null, realV0, orderedVertices, options);
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

