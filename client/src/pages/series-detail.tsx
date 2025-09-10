import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useXtreamAPI, useXtreamConfig } from '@/hooks/use-xtream-api';
import { ArrowLeft, Play, Calendar, Star } from 'lucide-react';

interface Episode {
  id: string;
  episode_num: number;
  title: string;
  info: {
    duration: string;
    plot: string;
    releasedate: string;
    rating: string;
  };
}

interface Season {
  season_number: number;
  episodes: Episode[];
}

interface SeriesInfo {
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releasedate: string;
    rating: string;
    last_modified: string;
  };
  seasons: Season[];
  episodes: { [seasonNum: string]: Episode[] };
}

export default function SeriesDetail() {
  const [, params] = useRoute('/series/:streamId');
  const [, setLocation] = useLocation();
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  
  const { config } = useXtreamConfig();
  const api = useXtreamAPI(config);
  const streamId = params?.streamId ? parseInt(params.streamId) : null;

  useEffect(() => {
    const fetchSeriesInfo = async () => {
      if (!api || !streamId) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/xtream/series-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: api,
            seriesId: streamId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch series information');
        }

        const data = await response.json();
        setSeriesInfo(data);
        
        // Set first available season as selected
        if (data.seasons && data.seasons.length > 0) {
          setSelectedSeason(data.seasons[0].season_number);
        }
      } catch (err) {
        console.error('Series info error:', err);
        setError('Failed to load series information');
      } finally {
        setLoading(false);
      }
    };

    fetchSeriesInfo();
  }, [api, streamId]);

  const handlePlayEpisode = (episode: Episode) => {
    setLocation(`/player/series/${episode.id}`);
  };

  const goBack = () => {
    setLocation('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          Loading series details...
        </div>
      </div>
    );
  }

  if (error || !seriesInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Unable to Load Series</h2>
          <p className="text-muted-foreground mb-6">{error || 'Series information not available'}</p>
          <Button onClick={goBack} data-testid="button-back-error">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { info, episodes } = seriesInfo;
  const availableSeasons = Object.keys(episodes).map(Number).sort((a, b) => a - b);

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
          <h1 className="text-xl font-semibold truncate">{info.name}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Series Poster */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {info.cover ? (
                  <img
                    src={info.cover}
                    alt={info.name}
                    className="w-full aspect-[2/3] object-cover"
                    data-testid="img-series-poster"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground">No Image</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Series Information */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-4" data-testid="text-series-title">
                {info.name}
              </h2>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-4 mb-4">
                {info.releasedate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span data-testid="text-release-date">{info.releasedate}</span>
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

            {/* Plot */}
            {info.plot && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Overview</h3>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-plot">
                  {info.plot}
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

        {/* Episodes Section */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-6">Episodes</h3>
          
          {availableSeasons.length > 0 ? (
            <Tabs value={selectedSeason.toString()} onValueChange={(value) => setSelectedSeason(parseInt(value))}>
              <TabsList className="mb-6">
                {availableSeasons.map((seasonNum) => (
                  <TabsTrigger key={seasonNum} value={seasonNum.toString()} data-testid={`tab-season-${seasonNum}`}>
                    Season {seasonNum}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {availableSeasons.map((seasonNum) => (
                <TabsContent key={seasonNum} value={seasonNum.toString()}>
                  <div className="grid gap-4">
                    {episodes[seasonNum]?.map((episode, index) => (
                      <Card key={episode.id} className="overflow-hidden hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Episode {episode.episode_num}
                                </span>
                                {episode.info?.duration && (
                                  <span className="text-sm text-muted-foreground">
                                    {episode.info.duration}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold mb-2" data-testid={`text-episode-title-${episode.id}`}>
                                {episode.title}
                              </h4>
                              {episode.info?.plot && (
                                <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-episode-plot-${episode.id}`}>
                                  {episode.info.plot}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlayEpisode(episode)}
                              data-testid={`button-play-episode-${episode.id}`}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Play
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )) || (
                      <div className="text-center py-8 text-muted-foreground">
                        No episodes available for this season
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No episodes available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}