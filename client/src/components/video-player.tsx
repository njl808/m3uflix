import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Pause, Volume2, Maximize } from "lucide-react";
import { ContentItem } from "@/types/xtream";

interface VideoPlayerProps {
  content: ContentItem | null;
  streamUrl: string;
  onClose: () => void;
}

export function VideoPlayer({ content, streamUrl, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (streamUrl && videoRef.current) {
      console.log('Loading stream URL:', streamUrl);
      videoRef.current.src = streamUrl;
      videoRef.current.load(); // Ensure the video element reloads with new source
      videoRef.current.play().catch((error) => {
        console.error('Video playback error:', error);
        console.error('Failed stream URL:', streamUrl);
        // You could show a user-friendly error message here
      });
    }
  }, [streamUrl]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!content) return null;

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onMouseMove={() => setShowControls(true)}
      data-testid="video-player"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-60 bg-black bg-opacity-50 text-white hover:bg-opacity-75"
        onClick={onClose}
        data-testid="button-close-player"
      >
        <X className="w-6 h-6" />
      </Button>

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        data-testid="video-element"
      />

      {showControls && (
        <>
          <div className="absolute top-20 left-6 text-white max-w-md z-50" data-testid="content-info">
            <h2 className="text-3xl font-bold mb-2">{content.title}</h2>
            {content.type === 'series' && (
              <p className="text-lg mb-4">Season 1 • Episode 1</p>
            )}
            {content.description && (
              <p className="text-sm text-gray-300 line-clamp-3">
                {content.description}
              </p>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 z-50">
            <div className="flex items-center space-x-4 text-white">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                data-testid="button-play-pause"
              >
                {isPlaying ? 
                  <Pause className="w-8 h-8" /> : 
                  <Play className="w-8 h-8" />
                }
              </Button>
              
              <div className="flex-1 flex items-center space-x-2">
                <span className="text-sm" data-testid="current-time">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 bg-gray-600 rounded-full h-1 cursor-pointer">
                  <div 
                    className="bg-primary h-1 rounded-full transition-all" 
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                  ></div>
                </div>
                <span className="text-sm" data-testid="duration">
                  {formatTime(duration)}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                data-testid="button-volume"
              >
                <Volume2 className="w-6 h-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreen}
                data-testid="button-fullscreen"
              >
                <Maximize className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
