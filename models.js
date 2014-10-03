var models = require('CGAVideoPlayer.models');

models.ButtonModel = Backbone.Model.extend({
  defaults: {
    text: '',
    icon: ''
  }
});

models.ProgressBarModel = Backbone.Model.extend({
  defaults: {
    duration: 0,
    position: 0
  }
});

models.VideoSourceModel = Backbone.Model.extend({
  defaults: {
    url: '',
    thumbnail: '',
    timeout: 5, 
    startPosition: 0
  }
});
