var videoPlugins = require('CGAVideoPlayer.videoPlugins')
var video = require('CGAVideoPlayer.video');
var utils = require('CGAVideoPlayer.utils');
var settings = require('CGAVideoPlayer.settings');

videoPlugins.PlayPauseButtonView = video.VideoPlugin.extend({
  pluginName: 'playPauseButton',
  el: $("#player-playpause"),

  events: {
    'click': 'click'
  },

  videoEvents: {
    'play': function(clickEvent) {
      var clickEvent = clickEvent || false;
      this.trigger('click:play');

      // show the pause button
      this.el.addClass('pause');

      if(clickEvent) {
        this.video.play();
      }
    },

    'pause': function(clickEvent) {
      var clickEvent = clickEvent || false;
      this.trigger('click:pause');

      // show the play button
      this.el.removeClass('pause');

      if(clickEvent) {
        this.video.pause();
      }
    }
  },

  click: function() {
    if(this.el.hasClass('pause')) {
      this.videoEvents.pause(true);
    } else {
      this.videoEvents.play(true);
    }
  }
});

videoPlugins.PreviousButton = video.VideoPlugin.extend({
  el: $('#player-previous'),

  events: {
    'click': 'click'
  },
  
  click: function() {
    this.video.previous();
  }
});

videoPlugins.NextButton = video.VideoPlugin.extend({
  el: $('#player-next'),

  events: {
    'click': 'click'
  },
  
  click: function() {
    this.video.next();
  }
});

videoPlugins.VolumeView = video.VideoPlugin.extend({
  name: 'volume',
  el: $("#player-volume"),

  selectors: {
    'volumeBar': '#volume-bar',
    'volumeButton': '#volume-controls'
  },

  events: {
    'click #volume-controls': 'onVolumeClick'
  },

  lastVolume: 100,

  pluginReady: function() {
    // Volume functions aren't supported on mobile :(
    if(!settings.isMobile) {
      this.video.setVolume(this.lastVolume);
      this.render();
    }
  },

  onSliderChange: function(event, ui) {
    this.video.setVolume(ui.value, true);
  },

  onVolumeClick: function() {
    if(this.getVolume() > 0) {
      this.lastVolume = this.getVolume();

      this.setVolume(0);
    } else {
      this.setVolume(this.lastVolume);
    }
  },

  getVolume: function() {
    return this.select('volumeBar').slider('option', 'value');
  },

  setVolume: function(volume, sliderEvent) {
    var sliderEvent = sliderEvent || false;

    this.video.setVolume(volume);
    if(!sliderEvent) {
      this.select('volumeBar').slider('option', 'value', volume);
    }

    if(volume <= 0) {
      this.select('volumeButton').addClass('mute'); // show the muted icon 
    } else {
      this.select('volumeButton').removeClass('mute');
    }
  },

  render: function() {
    this.select('volumeBar').slider({
      range: 'min',
      value: 100,
      min: 0,
      max: 100,

      // events
      change: _.bind(this.onSliderChange, this)
    });

    return this;
  }
});

videoPlugins.ProgressBarView = video.VideoPlugin.extend({
  name: 'progressBar',
  el: $("#player-controls-top"),

  selectors: {
    slider: '#progress-bar',
    bufferProgress: '#progress-bar .buffer-progress',
    label: '#player-time'
  },

  videoEvents: {
    'change:position': function() {
      // update slider
      this.select('slider').slider('option', {
        value: this.getPosition(),
        max: this.getDuration()
      });

      // update label
      var position = (this.getPosition() / 10000) * this.video.getDuration();
      var label = utils.formatTime(position);
      this.select('label').html(label);
    },

    'tick': function() {
      // update buffer progress
      var bufferPercent = this.video.bufferPercent * 100;
      this.select('bufferProgress').width(bufferPercent + '%');
    }
  },

  pluginReady: function() {
    // setup the slider
    this.select('slider').slider({
      range: 'min',
      value: 0,
      min: 1,
      max: 100,

      // events
      slide: _.bind(this.onSliderSlide, this),
      stop: _.bind(this.onSliderStop, this)
    });

    // duplicate the .ui-slider-range div to create a slider for the buffer progress
    var rangeDiv = this.select('slider').find('.ui-slider-range');
    rangeDiv.clone().addClass('buffer-progress').insertBefore(rangeDiv);

    this.videoEvents.tick();

    return this;
  },

  getPosition: function() {
    if(this.sliding) {
      var sliderPercent = this.select('slider').slider('option', 'value');
      return sliderPercent;
    } else {
      // convert position to percent
      var videoPosition = Number(this.video.getPosition());
      var videoDuration = Number(this.video.getDuration());
      return (videoPosition / videoDuration) * 10000;
    }
  },

  getDuration: function() {
    //return this.video.getDuration();
    return 10000;
  },

  // slider events
  onSliderSlide: function(event, ui) {
    var newVal = ui.value;
    var clickedPositionPercent = newVal / this.getDuration();
    if(clickedPositionPercent > this.video.bufferPercent) {
      return false;
    }

    debug.debug('Starting slide');

    this.video.seeking = true;
    this.sliding = true;
    this.videoEvents.tick();
  },

  onSliderStop: function(event, ui) {
    if(this.sliding) {
      //this.video.sectionSeek(this.getPosition());
      var videoPosition = (this.getPosition() / 10000) * this.video.getDuration();
      this.video.seek(videoPosition);
      debug.debug('Sliding', 'videoPosition: ' + videoPosition);
      // stop the ui from updating to avoid a flash
      if(!this.seeking) {
        this.seeking = true;
        setTimeout(_.bind(function() {
          this.seeking = false;
          this.video.seeking = false;
        }, this), settings.progressBar.seekingFreezeTime);
      }
      
      this.sliding = false;
    }
  }
});

videoPlugins.ResourceView = video.VideoPlugin.extend({
  el: $('#action-button'),

  selectors: {
    'link': 'a',
    'label': 'span'
  },

  videoEvents: {
    'ready': function() {
      this.hide();
      this.data = data.resources;
      this.annotateData();
    },
    'change:position': function(position) {
      var resourceId = utils.findTimeRangeIndex(this.data, this.getTotalTime());
      if(resourceId != null) {
        this.resource = this.data[resourceId];
        this.show();
      } else {
        this.hide();
      }
    }
  },

  annotateData: function() {
    _.each(this.data, function(resource) {
      resource.timeRange = new utils.TimeRange(resource.time, resource.time + resource.duration);
    });
  },

  getTotalTime: function() {
    var toc = this.video.plugins.TableOfContentsPlugin;
    var section = toc.playlist.getSection();
    var time = this.video.getPosition();

    return toc.tableOfContents.getTotalTime(section.id, time);
  },

  hide: function() {
    if(this.visible) {
      this.visible = false;
      this.el.animate({
        opacity: '0',
        top: '-100px'
      }, settings.resourceView.slideAnimationTime);
    }
  },

  show: function() {
    this.select('link').attr('href', this.resource.url);
    this.select('label').html(this.resource.title);

    if(!this.visible) {
      this.visible = true;
      this.el.animate({
        opacity: '1',
        top: '0px'
      }, settings.resourceView.slideAnimationTime, _.bind(function () {
        this.flash(settings.resourceView.flashTimes);
      }, this));
    }
  },

  flash: function(flashesLeft) {
    if(flashesLeft > 0) {
      this.el.animate({
        opacity: '0'
      }, settings.resourceView.flashAnimationTime, _.bind(function() {
        this.el.animate({
          opacity: '1'
        }, settings.resourceView.flashAnimationTime, _.bind(function() {
          this.flash(flashesLeft - 1);
        }, this));
      }, this));
    }
  }
});
