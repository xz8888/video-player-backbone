var views = require('CGAVideoPlayer.views');
var utils = require('CGAVideoPlayer.utils');
var video = require('CGAVideoPlayer.video');
var data = require('CGAVideoPlayer.data');
var toc = require('CGAVideoPlayer.tableOfContents');
var settings = require('CGAVideoPlayer.settings');

// 
// ButtonView
// This view shows a simple button using a ButtonModel to store its data. The values
// passed to the contructor will be used to populate the ButtonModel.
//
views.ButtonView = utils.BaseView.extend({
  tagName: 'button',
  className: 'ui-button',
  events: {
    'click': 'click'
  },
  initialize: function(modelValues) {
    _.bindAll(this, 'click', 'render');

    this.model = new CGAVideoPlayer.models.ButtonModel(modelValues);
    this.render();
  },
  render: function() {
    // construct our button options
    var options = {};
    // show an icon if it was set
    if(this.model.get('icon') != '') {
      options.icons = {
        primary: this.model.get('icon')
      };
    }
    // populate the text only if it is set
    if(this.model.get('text') != '') {
      $(this.el).html(this.model.get('text')).button(options);
    } else {
      options.text = false;
      $(this.el).button(options);
    }

    return this;
  },
  html: function() {
    return this.el.outerHTML;
  },
  click: function() {
  }
});

views.Dialog = Backbone.View.extend({

  render: function(){
    $('#dialog').dialog({
      autoOpen: false,
      height: 220, 
      width: 500,
      title: "Your browser is not compatible with the video player", 
      closeText: "hide",
      modal: true, 
      buttons: [{text: "Go to System Test Page", click: function(){window.open("http://www.cga-pdnet.org/Videos/SystemTest.htm")}}]
    });

    this.el = $('#dialog');
    this.delegateEvents(this.events);

    return this;
  }, 

  initialize: function(){
    _.bindAll(this, "render");
    this.template = _.template($('#dialog').html());

  }, 
    
  open: function(){
      this.el.dialog("open");
  }
})

views.TableOfContentsView = utils.BaseView.extend({
  el: $('#table-of-contents'),

  selectors: {
    chapters: '#chapters',
    links: 'a.section',
    title: 'title'
  },

  templates: {
    chapter: $('#template-TableOfContentsChapter'),
    section: $('#template-TableOfContentsSection'),
    survey: $('#template-TableOfContentsSurvey')
  },

  initialize: function() {
    _.bindAll(this, 'reduceChapter', 'reduceSection');
    this.toc = new toc.TableOfContents();
    this.render();
  },

  renderData: function() {
    return _.reduce(this.toc.data.chapters, this.reduceChapter, '');
  },

  reduceChapter: function(html, chapter) {
    html += this.renderTemplate('chapter', {
      title: chapter.title,
      time: chapter.timeRange[0],
      sections: _.reduce(chapter.sections, this.reduceSection, ''),
      number: chapter.number,
      course: settings.courseDataUrl
    });

    return html;
  },

  reduceSection: function(html, section) {
    if(section.surveyUrl) {
      html += this.renderTemplate('survey', {
        survey: section
      });
    } else {
      html += this.renderTemplate('section', {
        title: section.title,
        duration: utils.formatTime(section.duration),
        url: settings.playerUrl + '?' + settings.courseDataUrl + '#' + section.id
      });
    }

    return html;
  },

  render: function() {
    var size = settings.videoPopupSize;
    var left = (screen.width - size.width) / 2;
    var top = (screen.height - size.height) / 2;

    this.el.html(this.renderData());
    this.select('links').popupWindow({
      height: size.height,
      width: size.width,
      top: 50,
      left: 50,
      //top: top,
      //left: left,
      resizable: 1
    });
    return this;
  }
});

views.MaximizeButtonView = utils.BaseView.extend({
  el: $('#maximize-button'),

  events: {
    'click': 'click'
  },

  state: 'maximize',

  click: function() {
    if(this.state == 'maximize') {
      this.trigger('maximize');
      this.state = 'minimize';
      this.el.addClass('minimize');
    } else {
      this.trigger('minimize');
      this.state = 'maximize';
      this.el.removeClass('minimize');
    }
  }
});

views.VideoPlayerView = utils.BaseView.extend({
  el: $('#video-player'),
  selectors: {
    playbackControls: '#playback-controls',
    progressBar: '#progress-bar',
    header: '#content-main-top',
    controls: '#content-main-bottom',
    video: '#video, #video_wrapper, #survey, #video object',
    mainResizeContainers: '#content-main .resize-container, #video, #video_wrapper, #survey, #video object',
    disableScroll: '#content-main, #sidebar-header, #content-main-middle',
    videoContainers: '#jwplayer-wrapper_video, #jwplayer-wrapper_video_wrapper, #jwplayer-wrapper',
    sidebar: '#content-left',
    sidebarHeader: '#sidebar-header',
    sidebarContent: '#sidebar-content',
    sidebarHandle: '#sidebar-resizer',
    sidebarResizeContainers: '#content-left, #content-left .resize-container',
    surveyLinks: '#survey-links, #survey-unsupported',
    fullscreenKey: '.fullscreen-key .key',
    fullscreenText: '.fullscreen-key',
    title: 'title'
  },

  sidebarMinWidth: 200,
  sidebarMaxWidth: 700,
  sidebarContentWidthPadding: 10,
  sidebarContentHeightPadding: 41,
  // this is a rough estimate based on Google Chrome for OSX. It will be updated when window maximized
  chromeSize: false,

  initialize: function() {
    _.bindAll(this, 'render', 'updateSize', 'onSidebarHandleMouseDown', 'onMouseUp', 'onMouseMove', 'onMaximize', 'onMinimize');

    this.video = new video.VideoView();
    this.maximizeButton = new views.MaximizeButtonView();

    $('body').addClass(settings.isMobile ? 'mobile' : 'no-mobile');
    // handle the sidebar resize
    this.resizingSidebar = false;

    // setup events
    this.video.bind('embed', this.updateSize);
    this.maximizeButton.bind('maximize', this.onMaximize);
    this.maximizeButton.bind('minimize', this.onMinimize);
    $(window).resize(this.updateSize);

    // stop scrolling on iPads
    var stopScrolling = function(e) {
      e.preventDefault();
    }
    if(settings.isMobile) {
      $(this.selectors.disableScroll).each(function() {
        this.addEventListener('touchmove', stopScrolling);
      });
    }

    $(this.selectors.sidebarHandle).bind('mousedown touchstart', this.onSidebarHandleMouseDown);
    $(document).bind('mouseup touchend touchcancel touchleave', this.onMouseUp);
    $(document).bind('mousemove touchmove', this.onMouseMove);

    this.updateFullscreenKey();

    this.render();

    setTimeout(_.bind(function() {
      this.updateSize();
    }, this), 1000);
  },

  updateFullscreenKey: function() {
    var platform = navigator.platform;
    var vendor = navigator.vendor;
    var key = 'F11';

    if(platform.indexOf('Mac') != -1) {
      key = 'Cmd+Shift+F';
    }

    this.select('fullscreenKey', true).html(key);

    if(settings.isMobile) {
      this.select('fullscreenText', true).hide();
    }
  },

  onSidebarHandleMouseDown: function(event) {
    this.sidebarHandleMouseX = event.pageX;
    this.sidebarWidth = $(this.selectors.sidebar).width();
    this.resizingSidebar = true;
    // disable selection
    $(document).disableSelection();
  },

  onMouseUp: function(event) {
    this.resizingSidebar = false;
    $(document).enableSelection();
  },

  onMouseMove: function(event) {
    if(this.resizingSidebar) {
      var pageX = event.pageX == 0 ? event.originalEvent.touches[0].pageX : event.pageX + this.sidebarWidth;
      debug.debug('Resizing sidebar', pageX, event);
      var newSidebarWidth = pageX - this.sidebarHandleMouseX;
      if(newSidebarWidth < this.sidebarMinWidth) {
        newSidebarWidth = this.sidebarMinWidth;
      } else if(newSidebarWidth > this.sidebarMaxWidth) {
        newSidebarWidth = this.sidebarMaxWidth;
      }

      $(this.selectors.sidebar).css({width: newSidebarWidth});
      $(this.selectors.sidebarHeader).css({width: newSidebarWidth});
      $(this.selectors.sidebarContent).css({width: newSidebarWidth - this.sidebarContentWidthPadding});
      this.updateSize();
    }
  },

  onMaximize: function () {
    var width, height, top;
    var sidebarWidth = $(this.selectors.sidebar + ':visible').width();
    var headerHeight = $(this.selectors.header).height();
    var controlsHeight = $(this.selectors.controls).height();

    this.minimizeWidth = $(window).width();
    this.minimizeHeight = $(window).height();

    // always use all the available screen width
    width = screen.width;

    if(this.video.aspectRatio) {
      // try and avoid any "black bars" on the video
      var videoWidth = width - sidebarWidth;
      var videoHeight = videoWidth / this.video.aspectRatio;
      height = videoHeight + controlsHeight + headerHeight;
    }

    // if our calculated height is taller then the screen, or we don't have an aspectRatio info
    if(height > screen.height || !this.video.aspectRatio) {
      height = screen.height;
    }

    this.resizeWindow(width, height);
  },

  calculateChromeSize: function(callback) {
    var boundCallback = _.bind(callback, this);
    if(!this.chromeSize) {
      var width = $(window).width();
      var height = $(window).height();
      window.resizeTo(width, height);

      var thisRef = this;
      setTimeout(function() {
        var chromeWidth = width - $(window).width();
        var chromeHeight = height - $(window).height();

        thisRef.chromeSize = {
          width: chromeWidth,
          height: chromeHeight
        };
        boundCallback(thisRef.chromeSize);
      }, settings.chromeSizeTimeout);
    } else {
      boundCallback(this.chromeSize);
    }

    return this.chromeSize;
  },

  resizeWindow: function(width, height) {
    this.calculateChromeSize(function(chromeSize) {
      var w = width + chromeSize.width;
      var h = height + chromeSize.height;

      // center window
      y = (window.screen.availHeight - (h + chromeSize.height)) / 2;
      x = (window.screen.availWidth - (w + chromeSize.width)) / 2;
      window.moveTo(x, y);
      window.resizeTo(w, h);
      //this.centerWindow(width, height);
    });
  },

  onMinimize: function() {
    if(this.minimizeWidth && this.minimizeHeight) {
      this.resizeWindow(this.minimizeWidth, this.minimizeHeight);
    }
  },

  updateSize: function() {
    // update main section height
    var headerHeight = $(this.selectors.header).height();
    var controlsHeight = $(this.selectors.controls).height();
    var windowHeight = $(window).height();
    var midHeight = windowHeight - (headerHeight + controlsHeight);

    $(this.selectors.video).css({height: midHeight + 'px'});

    // update survey link position
    var surveyLinksTop = midHeight / 2 - $(this.selectors.surveyLinks).height() / 2;
    $(this.selectors.surveyLinks).css({top: surveyLinksTop});
    
    // update sidebar height
    var sidebarHeaderHeight = $(this.selectors.sidebarHeader).height();
    var sidebarContentHeight = windowHeight - sidebarHeaderHeight - this.sidebarContentHeightPadding;

    $(this.selectors.sidebarContent).css({height: sidebarContentHeight});

    // update width
    var sidebarWidth = $(this.selectors.sidebar + ':visible').width();
    var windowWidth = $(window).width();
    var mainContainerWidth = windowWidth - sidebarWidth;

    // update player size
    this.video.setSize(mainContainerWidth, midHeight);

    $(this.selectors.mainResizeContainers).css({width: mainContainerWidth});
    //$(this.selectors.videoContainers).css({width: mainContainerWidth, height: midHeight});
  },

  render: function() {
    document.title = (data.tableOfContents.title + settings.titleSuffix);

    this.updateSize();

    return this;
  }
});
