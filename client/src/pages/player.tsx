import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, ExternalLink } from "lucide-react";
import { useXtreamConfig, useXtreamAPI } from "@/hooks/use-xtream-api";
import Hls from "hls.js";

export default function Player() {
  const [, params] = useRoute("/player/:type/:streamId");
  const [location, setLocation] = useLocation();
  const { config } = useXtreamConfig();
  const api = useXtreamAPI(config);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  const streamType = params?.type as 'live' | 'movie' | 'series';
  const streamId = params?.streamId ? parseInt(params.streamId) : null;

  // Generate multiple stream URLs for fallback
  const getStreamUrls = (streamId: number, streamType: string) => {
    if (!api) return [];
    
    const baseUrl = api.buildStreamUrl(streamId, streamType);
    const urls = [];
    
    if (streamType === 'live') {
      // For live streams, try multiple formats
      urls.push({
        url: baseUrl.replace('.ts', '.m3u8'),
        format: 'HLS',
        description: 'HLS Stream (recommended)'
      });
      urls.push({
        url: baseUrl,
        format: 'TS',
        description: 'Transport Stream'
      });
      urls.push({
        url: baseUrl.replace('.ts', '.mp4'),
        format: 'MP4',
        description: 'MP4 Stream'
      });
    } else {
      // For VOD, try different extensions
      urls.push({
        url: baseUrl,
        format: 'Original',
        description: 'Original format'
      });
      urls.push({
        url: baseUrl.replace(/\.[^.]+$/, '.mp4'),
        format: 'MP4',
        description: 'MP4 format'
      });
      urls.push({
        url: baseUrl.replace(/\.[^.]+$/, '.mkv'),
        format: 'MKV',
        description: 'MKV format'
      });
    }
    
    return urls;
  };

  const streamUrls = streamId ? getStreamUrls(streamId, streamType) : [];

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

  // Enhanced stream loading with HLS.js and fallback
  const loadStream = async (urlIndex = 0) => {
    if (!streamUrls.length || !videoRef.current || urlIndex >= streamUrls.length) {
      setError('No compatible stream formats available');
      setIsLoading(false);
      return;
    }

    const streamData = streamUrls[urlIndex];
    const { url, format, description } = streamData;
    
    console.log(`Trying stream ${urlIndex + 1}/${streamUrls.length}: ${format} - ${url}`);
    setCurrentFormat(format);
    setIsLoading(true);
    setError(null);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    try {
      // Check if it's an HLS stream and HLS.js is supported
      if ((url.includes('.m3u8') || format === 'HLS') && Hls.isSupported()) {
        console.log('Using HLS.js for playback');
        
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: streamType === 'live',
          backBufferLength: 90,
          maxBufferLength: 60,
          maxMaxBufferLength: 600,
          startLevel: -1,
          debug: false,
        });

        hls.loadSource(url);
        hls.attachMedia(videoRef.current);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest loaded successfully');
          setIsLoading(false);
          videoRef.current?.play().catch((err) => {
            console.error('HLS autoplay failed:', err);
            setError('Click play to start the video');
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            setIsLoading(false);
            if (urlIndex < streamUrls.length - 1) {
              console.log('HLS failed, trying next format...');
              setTimeout(() => loadStream(urlIndex + 1), 1000);
            } else {
              setError(`HLS Error: ${data.details || 'Stream failed to load'}`);
            }
          }
        });

      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl') && url.includes('.m3u8')) {
        // Native HLS support (Safari)
        console.log('Using native HLS playback');
        videoRef.current.src = url;
        videoRef.current.load();
        setIsLoading(false);
        
        setTimeout(() => {
          videoRef.current?.play().catch((err) => {
            console.error('Native HLS autoplay failed:', err);
            if (urlIndex < streamUrls.length - 1) {
              loadStream(urlIndex + 1);
            } else {
              setError('Click play to start the video');
            }
          });
        }, 1000);

      } else {
        // Direct HTML5 video playback
        console.log('Using direct HTML5 playback');
        videoRef.current.src = url;
        videoRef.current.load();
        setIsLoading(false);
        
        setTimeout(() => {
          videoRef.current?.play().catch((err) => {
            console.error('Direct playback failed:', err);
            if (urlIndex < streamUrls.length - 1) {
              console.log('Direct playback failed, trying next format...');
              setTimeout(() => loadStream(urlIndex + 1), 1000);
            } else {
              setError('Unable to play this stream with any available format');
            }
          });
        }, 1000);
      }

    } catch (err) {
      console.error('Stream loading error:', err);
      setIsLoading(false);
      if (urlIndex < streamUrls.length - 1) {
        setTimeout(() => loadStream(urlIndex + 1), 1000);
      } else {
        setError('Failed to load stream with any available format');
      }
    }
  };

  // Load stream when component mounts or stream changes
  useEffect(() => {
    if (streamUrls.length > 0) {
      loadStream(0);
    }
    
    // Cleanup on unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamId, streamType]);

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
    setRetryCount(prev => prev + 1);
    setError(null);
    loadStream(0);
  };

  const openExternalPlayer = () => {
    if (streamUrls.length > 0) {
      const streamUrl = streamUrls[0].url;
      // Create VLC protocol link
      const vlcUrl = `vlc://${streamUrl}`;
      window.open(vlcUrl, '_blank');
      
      // Also show the direct URL for manual copying
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Stream URLs</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>IPTV Stream URLs</h2>
              <p>Copy any of these URLs to your preferred media player:</p>
              ${streamUrls.map((stream, index) => `
                <div style="margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
                  <strong>${stream.format}</strong> - ${stream.description}<br>
                  <input type="text" value="${stream.url}" style="width: 100%; margin-top: 5px;" readonly>
                  <button onclick="navigator.clipboard.writeText('${stream.url}')">Copy</button>
                </div>
              `).join('')}
              <p style="margin-top: 20px;"><small>Recommended players: VLC, Kodi, PotPlayer, MPC-HC</small></p>
            </body>
          </html>
        `);
      }
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
              <p className="mb-2">Tried formats: {streamUrls.map(s => s.format).join(', ')}</p>
              <p className="mb-2">Current: {currentFormat}</p>
              <p className="mb-2">Retries: {retryCount}</p>
              <p className="mb-2">Solutions:</p>
              <ul className="text-left list-disc list-inside space-y-1">
                <li>Try external player (VLC, Kodi, PotPlayer)</li>
                <li>Check network connection</li>
                <li>Different stream server may be needed</li>
              </ul>
            </div>
            <div className="space-x-4 mb-4">
              <Button onClick={refreshStream} variant="outline" data-testid="button-refresh">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={openExternalPlayer} variant="outline" data-testid="button-external">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in VLC/External Player
              </Button>
            </div>
            <div className="space-x-4">
              <Button onClick={goBack} data-testid="button-back-error">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
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
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-15">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading {currentFormat} stream...</p>
            <p className="text-sm text-gray-300 mt-2">
              Format {streamUrls.findIndex(s => s.format === currentFormat) + 1} of {streamUrls.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}