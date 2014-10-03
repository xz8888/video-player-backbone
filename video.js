var video = require('CGAVideoPlayer.video');
var players = require('CGAVideoPlayer.video.players');
var utils = require('CGAVideoPlayer.utils');
var videoPlugins = require('CGAVideoPlayer.videoPlugins');
var settings = require('CGAVIdeoPlayer.settings');

video.VideoPlugin = utils.BaseView.extend({
  videoEvents: {},

  attachVideo: function(videoView) {
    this.video = videoView;
    this.attachVideoEvents();
    this.pluginReady();
  },

  attachVideoEvents: function() {
    _.each(this.videoEvents, function(callback, eventName) {
      // bind events
      this.video.bind(eventName, callback, this);
      // bind this so it doesn't use the 'videoEvents' object as this
      this.videoEvents[eventName] = _.bind(callback, this);
    }, this);
  },

  pluginReady: function() {
    // pass
  }
});

video.VideoView = utils.BaseView.extend({
  el: $('#video'),

  plugins: {},
  videoFiles: [],
  startTime: 0,
  autoStart: false,
  position: 0,
  duration: 0,
  loadingItem: false,
  // use 16/9 as the default aspect ratio
  aspectRatio: 16 / 9,
  playerType: 'JWPlayer',
  playing: false,
  error: false,

  initialize: function() {
    _.bindAll(this, 'onEmbed', 'onError', 'onTick', 'seek');
    this.bind('error', this.onError);
    this.bind('embed', this.onEmbed);

    this.render();
    this.initializePlugins();
    
    this.trigger('ready');
    this.bind('tick', this.onTick);
  },

  onTick: function() {
    if(!this.seeking) {
      this.bufferPercent = this.getBuffer();
      this.bufferedPosition = this.bufferPercent * this.getDuration();
    }
  },

  initializePlugins: function() {
    var thisRef = this;
    _.each(videoPlugins, function(PluginClass, pluginName) {
      var plugin = new PluginClass();
      plugin.attachVideo(thisRef);

      thisRef.plugins[pluginName] = plugin;
    });
  },

  selectPlayer: function(playerType) {
    if(this.playerType != playerType) {
      this.playerType = playerType;
      this.autoStart = this.playing;
      this.render();
    }
  },

  render: function() {
    this.el.html('');

    this.player = new players[this.playerType](this);
    this.player.embedPlayer(this.el);
    this.Dialog = new views.Dialog();
    this.Dialog.render();

    return this;
  },

  onError: function() {
    this.error = true;
  },

  onEmbed: function() {
    if(this.error) {
      this.error = false;
    }
  },

  // API
  seek: function(position, play) {
    if(!this.player) return;

    // check to make sure the position is buffered
    if(this.bufferedPosition < position) {
      this.player.seek(this.bufferedPosition);
      return;
    }

    // store the seek position in case of an error
    this.position = position;
    this.player.seek(position);
    /*
    if(play) {
      setTimeout(_.bind(function() {
        this.player.play();
      }, this), 500);
    }
    */
  },

  pause: function() {
    this.playing = false;
    if(!this.player) return;

    this.player.pause();
  },

  play: function() {
    this.playing = true;
    if(!this.player) return;

    this.player.play();
  },

  next: function() {
    this.player.next();
  },

  previous: function() {
    this.player.previous();
  },

  setVolume: function(volume) {
    if(!this.player) return;

    this.player.setVolume(volume);
  },

  loadPlaylist: function(playlist) {
    if(!this.player) return;

    this.player.loadPlaylist(playlist);
  },

  nextSource: function() {
    this.player.nextSource();
  },

  getPlaylistItem: function(index) {
    if(!this.player) return null;

    return this.player.getPlaylistItem(index);
  },

  setPlaylistItem: function(index) {
    if(!this.player) return;

    this.player.setPlaylistItem(index);
  },
  
  setSize: function(width, height) {
    if(!this.player || !this.player.setSize) return;

    this.player.setSize(width, height);
  },

  isPlaying: function() {
    return this.player.isPlaying();
  },

  isLastPlaylistItem: function() {
    return this.player.isLastPlaylistItem();
  },

  getBuffer: function() {
    return this.player.getBuffer();
  },

  getPosition: function() {
    return this.player.getPosition();
  },

  getDuration: function() {
    return this.player.getDuration();
  }
});

players.JWPlayer = utils.BaseView.extend({
  plugins: {},
  videoFiles: [],
  startTime: 0,
  autoStart: false,
  position: 0,
  duration: 0,
  loadingItem: false,
  seekToAfterLoad: 0,
  // use 16/9 as the default aspect ratio
  aspectRatio: 16 / 9,
  lastPlaylistItem: false,
  currentItem: null,
  initialLoad: true,

  initialize: function(video) {
    this.video = video;
    // setup event tracing
    _.each(this.jwplayerEvents, function(event, name) {
      this.jwplayerEvents[name] = _.bind(function() {
        debug.event.apply(debug, ['[jw] ' + name].concat(_.toArray(arguments)));
        event.apply(this, arguments);
      }, this);
    }, this);
  },

  jwplayerEvents: {
    'onTime': function(event) {
      if(this.video.playing && !this.video.seeking) {
        this.video.position = event.position;
        this.video.trigger('change:position', event.position);
        this.video.trigger('tick');
      }
    },
    'onMeta': function(metadata) {
      this.debug('onMeta', event);
      if(metadata.duration) {
        this.video.duration = this.player.getDuration();
        this.video.trigger('change:duration', this.video.duration);
        this.video.trigger('tick');
      }
      if(metadata.height) {
        this.video.aspectRatio = metadata.width / metadata.height;
        this.video.trigger('change:aspectRatio');
      }
    },
    'onPause': function() {
      this.debug('onPause');
      this.video.playing = false;
      this.video.trigger('pause');
    },
    'onPlay': function() {
      this.player.setControls(false);
      this.debug('onPlay');
      this.video.playing = true;
      this.video.trigger('play');
      this.loadingItem = false;
    },
    'onVolume': function(volume) {
      this.debug('onVolume');
      this.video.trigger('change:volume', volume);
    },
    'onPlaylist': function(playlist) {
      this.debug('onPlaylist', playlist);
      if(playlist.id != 'jwplayer-wrapper') {
        this.video.trigger('change:playlist', playlist);
      }
    },
    'onPlaylistItem': function(item) {
      this.debug('onPlaylistItem', item);
      if(item.id != 'jwplayer-wrapper') {
        this.video.trigger('change:section', this.getPlaylistItem());
      }
    },
    'onError': function(error) {
      this.debug('onError', error);
      if (error.message == 'Error loading media: File could not be played')
          this.video.Dialog.open();
      this.video.trigger('error', error, this.video.getPlaylistItem());
    },
    'onComplete': function() {
      this.debug('onComplete');
      this.video.playing = false;
      this.video.trigger('complete');
    },
    'onBufferChange': function() {
      this.video.trigger('tick');
    }
  },

  debug: function(message, arg) {
    //settings.debug.debug(message, arg);
  },

  embedPlayer: function(el) {
    // create a div to house the player
    el.html('<div id="jwplayer-wrapper"></div>');
    // jwplayer needs a file in during embed, which sucks
    var file = data.videoSources[0].segments[0].files[0];
    this.player = jwplayer('jwplayer-wrapper').setup({
      file: file,
      controls: true
    });
    this.setupEvents();

    this.video.trigger('embed');
  },

  setupEvents: function() {
    _.each(this.jwplayerEvents, function(event, name) {
      // manually set the event with the onMyEvent function call
      this.player[name](event);
    }, this);
  },

  bufferFixed: false,
  bufferCheck: function() {
    // this should fix a buffering issue in FF and IE.
    // In some cases, JWPlayer will get stuck in a buffering loop.
    // This checks to see if that's the case, and plays the video.
    // This is a last minute hack, not a proper fix.
    if(!this.bufferFixed && settings.enableBufferCheckHack) {
      if(this.player.getState() == 'BUFFERING' ||
         this.player.getState() == 'PAUSED') {
        this.debug('bufferFix start', this.player.getState());
        this.player.play(false);
        setTimeout(_.bind(function() {
          this.debug('bufferFix complete');
          this.player.play(true);
        }, this), settings.bufferCheckPlayDelay);
      }

      if(this.player.getState() == 'PLAYING') {
        this.bufferFixed = true;
      }
    }
  },

  isPlaying: function() {
    return this.player && this.player.getState() == 'PLAYING';
  },

  setSize: function(width, height) {
    this.player.resize(width, height);
  },

  seek: function(position) {
    if(this.player) {
      //this.video.seeking = true;
      this.player.seek(position);
    }
  },

  pause: function() {
    if(this.player) {
      this.player.pause(true);
    }
  },

  play: function() {
    if(this.player) {
      this.player.play(true);
    }
  },

  next: function() {
    if(this.isLastPlaylistItem()) {
      this.player.seek(this.player.getDuration());
    } else {
      this.player.playlistNext();
    }
  },

  previous: function() {
    this.player.playlistPrev();
  },

  setVolume: function(volume) {
    if(this.player) {
      this.player.setVolume(volume);
    }
  },

  loadPlaylist: function(playlist) {
    debug.debug(playlist);
    this.player.load(playlist);
    this.player.setCurrentQuality(0);
    this.currentPlaylist = playlist;
    this.loadingItem = true;
  },

  nextSource: function() {
    var playlistItem = this.player.getPlaylistItem();
    var currentSource = this.player.getCurrentQuality();
    debug.debug('Switching sources', currentSource, playlistItem.sources);
    if(currentSource >= this.player.getPlaylistItem().sources.length) {
      debug.error('Unable to find any playable media');
      return;
    }

    this.player.setCurrentQuality(currentSource + 1);
  },

  getPlaylistItem: function(index) {
    if(this.lastPlaylistItem) {
      return this.player.getPlaylistItem(this.player.getPlaylist().length - 1);
    } else {
      return this.player.getPlaylistItem(index);
    }
  },

  setPlaylistItem: function(index) {
    this.debug('setPlaylistItem check', index);
    if(this.currentItem == null || this.currentItem != index) {
      this.debug('setPlaylistItem', index);
      this.currentItem = index;
      this.player.playlistItem(index);
    }
  },
  
  isLastPlaylistItem: function() {
    if(!this.player) return false;
    var playlist = this.player.getPlaylist();
    return playlist && playlist.length - 1 == this.getPlaylistItem().mediaid;
  },

  getBuffer: function() {
    return this.player.getBuffer() / 100.0;
  },

  getDuration: function() {
    return this.player.getDuration();
  },

  getPosition: function() {
    return this.player.getPosition();
  }
});
