var settings = require('CGAVideoPlayer.settings');

// how "fuzzy" should our chapter / section selection be? In seconds.
// Since seeking in jwplayer isn't too accurate, this prevents the previous
// section from being selected for a second or two before the proper section is highlighted
settings.tocFuzziness = 0.5;
settings.videoPopupSize = {
  height: 684,
  width: 1200
};
settings.chromeSizeTimeout = 300;
settings.brightcove = {
  player: '1327751495001',
  key: 'AQ~~,AAABNMyUDXE~,eZ3WEz-PDdy7MfRqvhYM_kk3RLQx5oTW'
};
settings.jwplayer = {
  'seekOnPlayPause': 500
};
settings.resourceView = {
  slideAnimationTime: 300,
  flashAnimationTime: 300,
  flashTimes: 1
};
settings.progressBar = {
  seekingFreezeTime: 100
};
settings.titleSuffix = ' - CGA-Canada';
settings.enableBufferCheckHack = false;
settings.bufferCheckDelay = 2000;
settings.bufferCheckPlayDelay = 500;
settings.isMobile = 'ontouchstart' in window;
settings.hasFlash = FlashDetect.installed;

jwplayer.key = 't590/OlTQnObx5Cr3zcT/D1DYChuznDeYT4sNwSRyeE=';
