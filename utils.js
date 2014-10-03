require = function(modulePath, obj) {
  if(typeof modulePath == 'string') {
    // split up the path into its components
    return require(modulePath.split('.'), this);
  } else {
    var nextObj = obj[modulePath[0]];
    if(!nextObj) {
      nextObj = obj[modulePath[0]] = {};
    }
    modulePath.splice(0, 1);

    if(modulePath.length > 0) {
      return require(modulePath, nextObj);
    } else {
      return nextObj;
    }
  }
}

var utils = require('CGAVideoPlayer.utils');
var debug = require('CGAVideoPlayer.debug');

utils.BaseView = Backbone.View.extend({
  appendControls: function(selector, controls) {
    _.each(controls, function(control) {
      $(selector).append(control);
    });
  },
  bindFunctions: function(obj, context) {
    // bind 'this' on all the given object's functions to context
    _.each(obj, function(func, name) {
      obj[name] = _.bind(func, context);
    });
  },
  select: function(selectorName, global) {
    if(global) {
      return $(this.selectors[selectorName]);
    } else {
      return this.$(this.selectors[selectorName]);
    }
  },
  renderTemplate: function(templateName, context) {
    return _.template(this.templates[templateName].html(), context);
  },
  // override trigger function to trace events
  trigger: function(event) {
    debug.event(event, arguments);
    if(!debug.pauseEvents) {
      return Backbone.Events.trigger.apply(this, arguments);
    }
  }
});

utils.SimpleModel = function() {
  this.initialize.apply(this, arguments);
};

_.extend(utils.SimpleModel.prototype, {
  initialize: function() {}
});

// borrow the extend function from Backbone.js
utils.SimpleModel.extend = Backbone.View.extend;

utils.TimeRange = utils.SimpleModel.extend({
  initialize: function(start, end) {
    this[0] = start;
    this[1] = end;
  },

  within: function(time) {
    return this[0] <= time && time <= this[1];
  },

  before: function(time) {
    return this[1] < time;
  },

  after: function(time) {
    return this[0] > time;
  }
});

utils.findTimeRangeIndex = function(objects, time, i) {
  if(!i) var i = 0;

  var currentObject = objects[i];
  var lastObject = objects[i > 0 ? i - 1 : 0];

  if(!currentObject.timeRange) return null;

  if(objects.length <= 1) {
    return currentObject.timeRange.within(time) ? 0 : null;
  }

  if(currentObject.timeRange.within(time)) {
    return i;
  
  } else if(currentObject.timeRange.after(time) && i > 0) {
    // check to see if the time is in a gap between this timeRange and the last one
    if(lastObject.timeRange.before(time)) {
      return null;
    }

    return utils.findTimeRangeIndex(objects, time, i - 1);

  } else if(currentObject.timeRange.before(time) && i < objects.length - 1) {
    return utils.findTimeRangeIndex(objects, time, i + 1);
  }

  // we couldn't find a timeRange, so return null
  return null;
}

utils.parseTime = function(timeStr) {
  var componentMultipliers = [60 * 60, 60, 1];
  // parse a timecode using the hh:mm:ss format
  var timeComponents = String(timeStr).split(':');
  var seconds = 0;

  // loop backward through the time components and pop off the multipliers
  for(var i = timeComponents.length - 1; i >= 0; i--) {
    var component = timeComponents[i];
    var multiplier = componentMultipliers.pop();

    seconds += Number(timeComponents[i]) * multiplier;
  }

  return seconds;
}

utils.formatTime = function(time) {
  var format = 'mm:ss';
  if(time == NaN || time == undefined || time == null) {
    return '00:00';
  }

  // only add the hours if they are needed
  if(time > 60 * 60) {
    format = 'HH:mm:ss';
  }
    
  return (new Date).clearTime().addSeconds(time).toString(format);
}
