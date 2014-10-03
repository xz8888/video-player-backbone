var toc = require('CGAVideoPlayer.tableOfContents');
var data = require('CGAVideoPlayer.data');
var videoPlugins = require('CGAVideoPlayer.videoPlugins');
var video = require('CGAVideoPlayer.video');
var utils = require('CGAVideoPlayer.utils');
var settings = require('CGAVideoPlayer.settings');
var debug = require('CGAVideoPlayer.debug');

toc.TableOfContents = utils.SimpleModel.extend({
  currentSectionIndex: 0,
  sections: [],
  chapters: [],

  initialize: function() {
    this.data = data.tableOfContents;
    this.annotateData();
  },

  annotateData: function() {
    var chapters = this.data.chapters;
    var sections = this.sections;
    var startTime = 0;
    var endTime = 0;
    var chapterNumber = 1;

    _.each(chapters, function(chapter, chapterNum) {
      var chapterStartTime = startTime;
      if(!chapter.number) {
        chapter.number = chapterNumber + '.&nbsp;';
        chapterNumber++;
      }

      // loop through this chapter's sections and add time ranges
      _.each(chapter.sections, function(section, i) {
        section.id = sections.length;
        section.chapter = chapter;

        if(section.duration) {
          // video section
          section.duration = utils.parseTime(section.duration);
          section.videos = this.getSectionVideos(section.id);
        } else {
          section.survey = true;
          this.survey = section;
        }

        sections.push(section);
      }, this);
      chapter.duration = endTime - chapterStartTime;
      chapter.timeRange = new utils.TimeRange(chapterStartTime, endTime);
    }, this);
  },

  getSurvey: function() {
    return this.survey;
  },

  getSectionVideos: function(sectionIndex) {
    return _.map(data.videoSources, function(source) {
      if(source.segments[sectionIndex]) {
        return source.segments[sectionIndex].files[0];
      }
    });
  },

  getSection: function(sectionId) {
    debug.debug('toc getSection', sectionId);
    return this.sections[sectionId];
  },

  getTotalTime: function(sectionId, sectionTime) {
    // add up durations of previous sections
    var prevTime = _.reduce(this.sections, function(memo, section, index) {
      if(index < sectionId) {
        return memo + section.duration;
      } else {
        return memo;
      }
    }, 0);

    return prevTime + sectionTime;
  }
});

videoPlugins.TOCPlaylist = video.VideoPlugin.extend({
  pluginName: 'tocPlaylist',
  timedOut: false,

  videoEvents: {
    'error': function(error, playlistItem) {
      if(error.message.match(/(File could not be played|File not found)/)) {
        debug.warn('Current source unplayable. Trying next source.');
        this.video.nextSource();
      }
    }
  },

  debug: function(message, arg) {
    if(settings.debugVideoEvents) {
      console.log(message, arg);
    }
  },

  pluginReady: function() {
    this.tableOfContents = new toc.TableOfContents();
    this.loadVideoPlaylist();
  },

  getSection: function(sectionId) {
    var playlistItem = this.video.getPlaylistItem(sectionId);
    var section = this.tableOfContents.getSection(playlistItem.mediaid);
    debug.debug('get section', playlistItem, section, sectionId);
    return section || this.tableOfContents.getSection(0);
  },

  playSection: function(section, play) {
    var play = play === false ? false : true; // we need to disable play on startup for mobile devices
    var index = _.isObject(section) ? section.id : Number(section);
    this.video.setPlaylistItem(index);
    if(play) {
      this.video.play();
    } else {
      this.video.pause();
    }
    debug.debug('playSection', section, play);
  },

  loadVideoPlaylist: function() {
    var playlist = this.getPlaylist();
    debug.debug('loading playlist', playlist);
    this.video.loadPlaylist(playlist);
  },

  getPlaylist: function() {
    // filter out videos
    var sections = _.filter(this.tableOfContents.sections, function(section) {
      return section.videos;
    });
    var playlist = _.map(sections, this.convertSectionToPlaylistItem);
    return playlist;
  },

  convertSectionToPlaylistItem: function(section) {
    return {
      mediaid: section.id,
      sources: _.map(section.videos, function(video) {
        return { file: video };
      })
    };
  }
});

videoPlugins.TableOfContentsPlugin = video.VideoPlugin.extend({
  el: $('#sidebar-content'),

  holdingSectionHighlight: false,

  selectors: {
    sections: 'li',
    chapters: '.accordion-row',
    chapterLinks: '.accordion-row a.section-title',
    survey: '#survey',
    surveyLinks: '#survey-links',
    surveyUnsupported: '#survey-unsupported',
    video: '#video_wrapper, #video',
    toggleButton: '#toc-toggle',
    chapterTitle: '#presentation-section-title',
    sectionTitle: '#presentation-title',
    sidebar: '#content-left'
  },

  templates: {
    chapter: $('#template-TableOfContentsChapter'),
    section: $('#template-TableOfContentsSection')
  },

  videoEvents: {
    'ready': function() {
      this.playlist = this.video.plugins.TOCPlaylist;
      this.tableOfContents = this.playlist.tableOfContents;
      this.videoSource = this.tableOfContents.videoSource;

      var hash = window.location.hash;
      if(hash) { 
        var sectionId = hash.substring(1);
        var play = !settings.isMobile; // don't try and autoplay on mobile devices
        this.playlist.playSection(sectionId, play);
        this.highlightSection(sectionId);
      }
    },

    'change:section': function(playlistItem) {
      var section = this.playlist.getSection(playlistItem.index);
      debug.debug('new section', section, playlistItem.index);
      this.highlightSection(section);

      // pause the video if this is a quiz
      if(section.surveyUrl) {
        this.showSurvey(section);
        // update last section
        this.playlist.lastSection = section;
      }
    },
    
    'survey': function(section) {
      this.highlightSection(section);
    },

    'play': function() {
      this.hideSurvey();
      this.highlightSection(this.playlist.getSection());
    },

    'complete': function() {
      if(this.video.isLastPlaylistItem()) {
        var section = this.tableOfContents.getSurvey();
        this.highlightSection(section);
        this.showSurvey(section);
      }
    }
  },

  debug: function(message, arg) {
    if(settings.debugVideoEvents) {
      console.log(message, arg);
    }
  },

  renderData: function() {
    this.data = data.tableOfContents;
    this.courseTitle = this.data.title;
    this.chapters = this.data.chapters;

    return _.reduce(this.chapters, this.reduceChapter, '');
  },

  reduceChapter: function(html, chapter) {
    html += this.renderTemplate('chapter', {
      chapter: chapter,
      sections: _.reduce(chapter.sections, this.reduceSection, '')
    });

    return html;
  },

  reduceSection: function(html, section) {
    html += this.renderTemplate('section', {
      section: section
    });

    return html;
  },

  onChapterClick: function(event) {
    var chapter = $(event.currentTarget).parents(this.selectors.chapters);
    $(chapter).toggleClass('closed');
  },

  onSectionClick: function(event) {
    var sectionId = Number($(event.currentTarget).attr('rel'));
    var section = this.tableOfContents.getSection(sectionId);
    if(section.survey) {
      this.showSurvey(section);
    } else {
      this.playlist.playSection(section);
      this.hideSurvey();
    }
  },

  showSurvey: function(section) {
    this.video.trigger('survey', section);
    // pause the video
    this.video.pause();

    var surveyEl = $(this.selectors.survey);
    if(settings.hasFlash) {
      surveyEl.find('p').html(section.description);
      surveyEl.find('a').html(section.surveyLinkText).attr('href', section.surveyUrl);
    } else {
      $(this.selectors.surveyLinks).hide();
      $(this.selectors.surveyUnsupported).show();
    }

    //$(this.selectors.video).hide();
    surveyEl.show();
    CGAVideoPlayer.videoPlayerView.updateSize();
  },

  hideSurvey: function() {
    $(this.selectors.video).show();
    $(this.selectors.survey).hide();
  },

  highlightSection: function(section) {
    var section = _.isObject(section) ? section : this.tableOfContents.getSection(section);
    var sectionEl = this.$('li[rel=' + section.id + ']');
    this.select('sections').removeClass('selected');
    this.select('chapterTitle', true).html(section.chapter.title);
    this.select('sectionTitle', true).html(section.title);
    sectionEl.addClass('selected');
  },

  pluginReady: function() {
    _.bindAll(this, 'reduceSection', 'reduceChapter', 'onChapterClick', 'onSectionClick');

    this.el.html(this.renderData());
    this.select('chapterLinks').click(this.onChapterClick);
    this.select('sections').click(this.onSectionClick);

    var toggleButton = $(this.selectors.toggleButton);
    var sidebar = $(this.selectors.sidebar);
    toggleButton.toggle(function() {
      toggleButton.addClass('show');
      sidebar.hide();
      CGAVideoPlayer.videoPlayerView.updateSize();
    }, function() {
      toggleButton.removeClass('show');
      sidebar.show();
      CGAVideoPlayer.videoPlayerView.updateSize();
    });


    return this;
  }
});
