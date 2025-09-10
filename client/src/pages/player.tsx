import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react";
import { useXtreamConfig, useXtreamAPI } from "@/hooks/use-xtream-api";

export default function Player() {
  const [, params] = useRoute("/player/:type/:streamId");
  const [location, setLocation] = useLocation();
  const { config } = useXtreamConfig();
  const api = useXtreamAPI(config);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamType = params?.type as 'live' | 'movie' | 'series';
  const streamId = params?.streamId ? parseInt(params.streamId) : null;

  // Generate stream URL
  const streamUrl = api && streamId ? api.buildStreamUrl(streamId, streamType) : null;

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls && isPlaying) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setError(null);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.error('Video error:', e);
      const videoError = (e.target as HTMLVideoElement)?.error;
      if (videoError) {
        console.error('Video error details:', {
          code: videoError.code,
          message: videoError.message
        });
      }
      setError('Failed to load video stream. This content may not be available or the format is not supported.');
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      setError(null);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
    };
  }, []);

  // Load video when URL changes
  useEffect(() => {
    if (streamUrl && videoRef.current) {
      console.log('Loading stream:', streamUrl);
      setError(null);
      
      // Try HLS/M3U8 format first for live streams, then fallback to direct URL
      if (streamType === 'live') {
        // For live streams, try to use a compatible format
        const hlsUrl = streamUrl.replace('.ts', '.m3u8');
        videoRef.current.src = hlsUrl;
      } else {
        videoRef.current.src = streamUrl;
      }
      
      videoRef.current.load();
      
      // Try to play after a short delay
      setTimeout(() => {
        videoRef.current?.play().catch((err) => {
          console.error('Autoplay failed:', err);
          setError('Click play to start the video. Note: Some IPTV streams may require external player support.');
        });
      }, 1000);
    }
  }, [streamUrl, streamType]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      setError(null);
      videoRef.current.play().catch((err) => {
        console.error('Play failed:', err);
        setError('Unable to play this stream. Try refreshing or selecting another content.');
      });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const goBack = () => {
    setLocation('/');
  };

  const refreshStream = () => {
    if (videoRef.current && streamUrl) {
      setError(null);
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      videoRef.current.play().catch((err) => {
        console.error('Refresh play failed:', err);
        setError('Unable to refresh stream');
      });
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!streamId || !streamType) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-xl mb-4">Invalid stream parameters</h2>
          <Button onClick={goBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-black relative overflow-hidden"
      onMouseMove={() => setShowControls(true)}
      data-testid="player-container"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-screen object-cover"
        controls={false}
        playsInline
        data-testid="video-player"
      />

      {/* Error Message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="text-center text-white p-6 max-w-md">
            <h3 className="text-xl mb-4">Playback Error</h3>
            <p className="mb-6">{error}</p>
            <div className="text-sm text-gray-300 mb-6">
              <p className="mb-2">IPTV streams may require:</p>
              <ul className="text-left list-disc list-inside space-y-1">
                <li>External player (VLC, Kodi)</li>
                <li>Different network location</li>
                <li>Specific stream format support</li>
              </ul>
            </div>
            <div className="space-x-4">
              <Button onClick={refreshStream} variant="outline" data-testid="button-refresh">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={goBack} data-testid="button-back-error">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
            {streamUrl && (
              <div className="mt-4 text-xs text-gray-400">
                <p>Stream URL: {streamUrl}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && !error && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 z-10">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goBack}
              className="text-white hover:bg-white/20"
              data-testid="button-back-top"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Browse
            </Button>
          </div>

          {/* Center Play Button (when paused) */}
          {!isPlaying && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="lg"
                variant="ghost"
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 text-white border-0"
                data-testid="button-play-center"
              >
                <Play className="w-8 h-8 ml-1" />
              </Button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
                data-testid="button-play-pause"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
                data-testid="button-mute"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>

              {/* Time Display */}
              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="flex-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={refreshStream}
                className="text-white hover:bg-white/20"
                data-testid="button-refresh-controls"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
                data-testid="button-fullscreen"
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {!error && streamUrl && duration === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-15">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading stream...</p>
          </div>
        </div>
      )}
    </div>
  );
}