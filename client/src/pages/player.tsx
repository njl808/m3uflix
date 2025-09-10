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
  const loadTokenRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for better autoplay
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);

  const streamType = params?.type as 'live' | 'movie' | 'series';
  const streamId = params?.streamId ? parseInt(params.streamId) : null;

  // Generate multiple stream URLs for fallback using enhanced API
  const streamUrls = api && streamId ? api.buildStreamUrls(streamId, streamType) : [];

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
    // Generate unique load token to prevent race conditions
    const currentToken = ++loadTokenRef.current;
    
    if (!streamUrls.length || !videoRef.current || urlIndex >= streamUrls.length) {
      if (streamType === 'live') {
        setError('Live stream formats not available. Try external player below.');
      } else {
        setError('No compatible stream formats available');
      }
      setIsLoading(false);
      return;
    }

    const streamData = streamUrls[urlIndex];
    const { url, format, description } = streamData;
    
    console.log(`Trying stream ${urlIndex + 1}/${streamUrls.length}: ${format} - ${url}`);
    setCurrentFormat(format);
    setIsLoading(true);
    setError(null);

    // Clean up previous HLS instance only if this is the current load
    if (hlsRef.current && currentToken === loadTokenRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    try {
      // Check if this load attempt is still current
      if (currentToken !== loadTokenRef.current) {
        console.log('Load cancelled, newer attempt in progress');
        return;
      }

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

        // Proper HLS.js initialization order: attachMedia first, then loadSource
        hls.attachMedia(videoRef.current);
        hlsRef.current = hls;

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          if (currentToken === loadTokenRef.current) {
            hls.loadSource(url);
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (currentToken === loadTokenRef.current) {
            console.log('HLS manifest loaded successfully');
            setIsLoading(false);
            // Set video as muted initially for better autoplay success
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
            }
            videoRef.current?.play().then(() => {
              setShowUnmuteHint(true);
              setTimeout(() => setShowUnmuteHint(false), 5000);
            }).catch((err) => {
              console.error('HLS autoplay failed:', err);
              setError('Click play to start the video');
            });
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          if (data.fatal && currentToken === loadTokenRef.current) {
            setIsLoading(false);
            if (urlIndex < streamUrls.length - 1) {
              console.log('HLS failed, trying next format...');
              setTimeout(() => loadStream(urlIndex + 1), 1000);
            } else if (streamType === 'live') {
              setError('Live stream failed. Please try external player below.');
            } else {
              setError(`HLS Error: ${data.details || 'Stream failed to load'}`);
            }
          }
        });

      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl') && url.includes('.m3u8')) {
        // Native HLS support (Safari)
        console.log('Using native HLS playback');
        if (currentToken === loadTokenRef.current) {
          videoRef.current.src = url;
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.load();
          setIsLoading(false);
          
          setTimeout(() => {
            if (currentToken === loadTokenRef.current) {
              videoRef.current?.play().then(() => {
                setShowUnmuteHint(true);
                setTimeout(() => setShowUnmuteHint(false), 5000);
              }).catch((err) => {
                console.error('Native HLS autoplay failed:', err);
                if (urlIndex < streamUrls.length - 1) {
                  loadStream(urlIndex + 1);
                } else {
                  setError('Click play to start the video');
                }
              });
            }
          }, 1000);
        }

      } else {
        // Direct HTML5 video playback
        console.log('Using direct HTML5 playback');
        if (currentToken === loadTokenRef.current) {
          videoRef.current.src = url;
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.load();
          setIsLoading(false);
          
          setTimeout(() => {
            if (currentToken === loadTokenRef.current) {
              videoRef.current?.play().then(() => {
                setShowUnmuteHint(true);
                setTimeout(() => setShowUnmuteHint(false), 5000);
              }).catch((err) => {
                console.error('Direct playback failed:', err);
                if (urlIndex < streamUrls.length - 1) {
                  console.log('Direct playback failed, trying next format...');
                  setTimeout(() => loadStream(urlIndex + 1), 1000);
                } else {
                  setError('Unable to play this stream with any available format');
                }
              });
            }
          }, 1000);
        }
      }

    } catch (err) {
      console.error('Stream loading error:', err);
      if (currentToken === loadTokenRef.current) {
        setIsLoading(false);
        if (urlIndex < streamUrls.length - 1) {
          setTimeout(() => loadStream(urlIndex + 1), 1000);
        } else {
          setError('Failed to load stream with any available format');
        }
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
    setShowUnmuteHint(false);
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
    if (streamUrls.length > 0 && api && streamId) {
      // Create direct URLs for external players (bypassing proxy)
      const directUrls = [];
      
      if (streamType === 'live') {
        directUrls.push({
          url: api.buildDirectStreamUrl(streamId, streamType, 'm3u8'),
          format: 'HLS Direct',
          description: 'Direct HLS stream for external players'
        });
        directUrls.push({
          url: api.buildDirectStreamUrl(streamId, streamType, 'ts'),
          format: 'TS Direct',
          description: 'Direct transport stream'
        });
      } else {
        directUrls.push({
          url: api.buildDirectStreamUrl(streamId, streamType, 'mp4'),
          format: 'MP4 Direct',
          description: 'Direct MP4 stream'
        });
        directUrls.push({
          url: api.buildDirectStreamUrl(streamId, streamType, 'mkv'),
          format: 'MKV Direct',
          description: 'Direct MKV stream'
        });
      }
      
      const allUrls = [...streamUrls, ...directUrls];
      const primaryUrl = directUrls[0]?.url || streamUrls[0]?.url;
      
      // Create VLC protocol link
      const vlcUrl = `vlc://${primaryUrl}`;
      window.open(vlcUrl, '_blank');
      
      // Also show all URLs for manual copying
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>IPTV Stream URLs - External Player</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>IPTV Stream URLs</h2>
              <p><strong>Copy any URL to your preferred media player:</strong></p>
              
              <h3>🎯 Direct URLs (Recommended for External Players)</h3>
              ${directUrls.map((stream, index) => `
                <div style="margin: 10px 0; padding: 10px; border: 2px solid #4CAF50; border-radius: 5px; background: #f8fff8;">
                  <strong>${stream.format}</strong> - ${stream.description}<br>
                  <input type="text" value="${stream.url}" style="width: 100%; margin-top: 5px; font-family: monospace;" readonly>
                  <button onclick="navigator.clipboard.writeText('${stream.url}')" style="margin-top: 5px; padding: 5px 10px;">📋 Copy URL</button>
                </div>
              `).join('')}
              
              <h3>🌐 Proxied URLs (For browser compatibility)</h3>
              ${streamUrls.map((stream, index) => `
                <div style="margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
                  <strong>${stream.format}</strong> - ${stream.description}<br>
                  <input type="text" value="${window.location.origin}${stream.url}" style="width: 100%; margin-top: 5px; font-family: monospace;" readonly>
                  <button onclick="navigator.clipboard.writeText('${window.location.origin}${stream.url}')" style="margin-top: 5px; padding: 5px 10px;">📋 Copy URL</button>
                </div>
              `).join('')}
              
              <div style="margin-top: 30px; padding: 20px; background: #f0f8ff; border-radius: 10px;">
                <h3>📱 Recommended Media Players</h3>
                <ul style="line-height: 1.8;">
                  <li><strong>VLC Media Player</strong> - Universal player for all formats</li>
                  <li><strong>Kodi</strong> - Media center with IPTV add-ons</li>
                  <li><strong>PotPlayer</strong> - Advanced Windows player</li>
                  <li><strong>MPC-HC</strong> - Lightweight Windows player</li>
                  <li><strong>IINA</strong> - Modern macOS player</li>
                  <li><strong>GSE Smart IPTV</strong> - Mobile IPTV player</li>
                </ul>
                <p><small>💡 <strong>Tip:</strong> Use direct URLs for better performance and compatibility with external players.</small></p>
              </div>
            </body>
          </html>
        `);
      }
    }
  };

  const formatTime = (time: number) => {
    // Handle live streams and invalid time values
    if (!isFinite(time) || isNaN(time)) {
      return streamType === 'live' ? 'LIVE' : '00:00';
    }
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
                {streamType === 'live' ? (
                  <span className="bg-red-600 px-2 py-1 rounded text-xs font-bold">● LIVE</span>
                ) : (
                  `${formatTime(currentTime)} / ${formatTime(duration)}`
                )}
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

      {/* Unmute Hint */}
      {showUnmuteHint && isPlaying && isMuted && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg z-30">
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4" />
            <span className="text-sm">Tap unmute for audio</span>
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