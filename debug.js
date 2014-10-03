var debug = require('CGAVideoPlayer.debug');

debug.levels = {
  'event': 0,
  'debug': 1,
  'info': 2,
  'warn': 3,
  'error': 4,
  'silent': 5
}
debug.level = debug.level || 'error';

debug.colors = {
  'event': 'green',
  'debug': 'blue',
  'info': 'black',
  'warn': 'orange',
  'error': 'red'
}
debug.pauseEvents = false;
debug.pauseEventsKeycode = 68;
debug.ignoreEvents =  ['tick', 'change:position', '[jw] onBufferChange', '[jw] onTime'];
debug.infoStyle = 'font-style: italic; font-size: 85%; color: grey';
debug.stackDepth = 2;
debug.init = function() {
  // create helper functions for each debug level
  _(debug.levels).forEach(function(num, levelName) {
    if(!debug[levelName]) {
      debug[levelName] = _.partial(debug._debug, levelName);
    }
  });

  // setup keyboard event to pause events
  $(document).bind('keyup', function(e) {
    if(e.shiftKey && e.keyCode == debug.pauseEventsKeycode) {
      debug.pauseEvents = !debug.pauseEvents;
    }
  });
}
debug._parseCallerLine = function(line) {
  var data = {};
  // try matching the long version of a line, with the filename and caller name
  var longMatch = line.match(/.* at ([\W\w]+) \(([\w\W]+):(\d*):(\d*)\)/);
  // try matching a line with an anonymous caller
  var shortMatch = line.match(/.* at ([\w\W]+):(\d*):(\d*)/);
  if(longMatch) {
    var data = {
      caller: longMatch[1],
      file: longMatch[2],
      line: longMatch[3],
      column: longMatch[4]
    }
  } else if(shortMatch) {
    var data = {
      caller: shortMatch[1],
      file: null,
      line: shortMatch[2],
      column: shortMatch[3]
    }
  }

  return data;
}
debug._findCallers = function() {
  var error = new Error('');
  if(error.stack) {
    var stackStr = error.stack;
    var callerLines = stackStr.split('\n');
    var callers = [];
    var stackStart = 4;
    for(var i = 0; i < debug.stackDepth; i++) {
      var line = callerLines[stackStart + i];
      if(line) {
        callers.push(debug._parseCallerLine(line));
      }
    }
    return callers;
  } else {
    return [];
  }
}
debug._buildInfoString = function(callers) {
  var info = '';
  var tabs = '';
  _.each(callers, function(caller) {
    info += tabs + ' ' + caller.caller + ' (line: ' + caller.line + ')\n\t';
    tabs += '\t';
  });
  return info;
}
debug._debug = function(level) {
  var info = debug._buildInfoString(debug._findCallers());
  // check to see if we should print this message
  if(debug._checkLevel(level)) {
    var color = debug.colors[level];
    var style = 'color: ' + color;
    Array.prototype.splice.call(arguments, 0, 1); // remove level from arguments
    var argsFormat = debug._buildArgsFormat.apply(this, arguments);

    debug._styledLog(style, argsFormat, arguments, color, 2);
    debug._styledLog(debug.infoStyle, '%s', [info], 'white', 0);
  }
}
debug._checkLevel = function(level) {
  // return true if we should print messages from this level
  return debug.levels[level] >= debug.levels[debug.level];
}
debug._buildArgsFormat = function() {
  var format = '';
  for(var i = 0; i < arguments.length; i++) {
    if(typeof arguments[i] == 'string') {
      format += '%s ';
    } else {
      format += '%o ';
    }
  }
  return format;
}
debug._styledLog = function(style, format, args, borderColor, borderSize) {
  if(window.console && console.log && console.log.apply) {
    var size = borderSize || 0;
    var color = borderColor || 'white';
    var borderStyle = 'border-left: ' + size + 'px solid ' + color;

    var newFormat = '%c %c' + format;
    var newArgs = Array.prototype.concat.apply([newFormat, borderStyle, style], args);

    console.log.apply(console, newArgs);
  } else if(window.console && console.log) {
    console.log(args[0], args[1]);
  }
}
debug.event = function(event) {
  if(!_.contains(debug.ignoreEvents, event)) {
    Array.prototype.splice.call(arguments, 0, 0, 'event');
    debug._debug.apply(this, arguments);
  }
}

debug.init();
