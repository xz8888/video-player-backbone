// load the course data
var courseDataUrl = window.location.search.substr(1);
document.write('<script type="text/javascript" src="' + courseDataUrl + '"></script>');

jQuery(document).ready(function() {

  CGAVideoPlayer.videoPlayerView = window.CGAVideoPlayer.videoPlayerView = new CGAVideoPlayer.views.VideoPlayerView();
})
