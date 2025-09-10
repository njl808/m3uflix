import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useXtreamAPI, useXtreamConfig } from '@/hooks/use-xtream-api';
import { ArrowLeft, Play, Calendar, Clock, Star } from 'lucide-react';

interface MovieInfo {
  info: {
    movie_image: string;
    name: string;
    description: string;
    genre: string;
    cast: string;
    director: string;
    releasedate: string;
    duration: string;
    rating: string;
    plot: string;
  };
  movie_data: {
    stream_id: number;
    name: string;
    added: string;
    category_id: string;
    container_extension: string;
  };
}

export default function MovieDetail() {
  const [, params] = useRoute('/movie/:streamId');
  const [, setLocation] = useLocation();
  const [movieInfo, setMovieInfo] = useState<MovieInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { config } = useXtreamConfig();
  const api = useXtreamAPI(config);
  const streamId = params?.streamId ? parseInt(params.streamId) : null;

  useEffect(() => {
    const fetchMovieInfo = async () => {
      if (!api || !streamId) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/xtream/movie-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: api,
            movieId: streamId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch movie information');
        }

        const data = await response.json();
        setMovieInfo(data);
      } catch (err) {
        console.error('Movie info error:', err);
        setError('Failed to load movie information');
      } finally {
        setLoading(false);
      }
    };

    fetchMovieInfo();
  }, [api, streamId]);

  const handlePlay = () => {
    if (streamId) {
      setLocation(`/player/movie/${streamId}`);
    }
  };

  const goBack = () => {
    setLocation('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          Loading movie details...
        </div>
      </div>
    );
  }

  if (error || !movieInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Unable to Load Movie</h2>
          <p className="text-muted-foreground mb-6">{error || 'Movie information not available'}</p>
          <Button onClick={goBack} data-testid="button-back-error">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { info, movie_data } = movieInfo;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold truncate">{info.name || movie_data.name}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Movie Poster */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {info.movie_image ? (
                  <img
                    src={info.movie_image}
                    alt={info.name || movie_data.name}
                    className="w-full aspect-[2/3] object-cover"
                    data-testid="img-movie-poster"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground">No Image</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Play Button */}
            <Button 
              className="w-full mt-4" 
              size="lg" 
              onClick={handlePlay}
              data-testid="button-play-movie"
            >
              <Play className="w-5 h-5 mr-2" />
              Play Movie
            </Button>
          </div>

          {/* Movie Information */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-4" data-testid="text-movie-title">
                {info.name || movie_data.name}
              </h2>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-4 mb-4">
                {info.releasedate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span data-testid="text-release-date">{info.releasedate}</span>
                  </div>
                )}
                {info.duration && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span data-testid="text-duration">{info.duration}</span>
                  </div>
                )}
                {info.rating && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="w-4 h-4" />
                    <span data-testid="text-rating">{info.rating}</span>
                  </div>
                )}
              </div>

              {/* Genres */}
              {info.genre && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {info.genre.split(',').map((genre, index) => (
                    <Badge key={index} variant="secondary" data-testid={`badge-genre-${index}`}>
                      {genre.trim()}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Plot/Description */}
            {(info.plot || info.description) && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Plot</h3>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-plot">
                  {info.plot || info.description}
                </p>
              </div>
            )}

            {/* Cast and Crew */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {info.director && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Director</h3>
                  <p className="text-muted-foreground" data-testid="text-director">{info.director}</p>
                </div>
              )}
              
              {info.cast && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cast</h3>
                  <p className="text-muted-foreground" data-testid="text-cast">{info.cast}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}