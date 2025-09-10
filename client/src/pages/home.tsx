import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { HeroSection } from "@/components/hero-section";
import { ContentGrid } from "@/components/content-grid";
import { SetupModal } from "@/components/setup-modal";
import { VideoPlayer } from "@/components/video-player";
import { EPGModal } from "@/components/epg-modal";
import { Button } from "@/components/ui/button";
import { useXtreamConfig, useXtreamAPI, useAuthentication, useLiveStreams, useVODStreams, useSeries, useCategories, useEPG, useFavorites, useSearch } from "@/hooks/use-xtream-api";
import { ContentItem, XtreamStream, XtreamVOD, XtreamSeries } from "@/types/xtream";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { config, saveConfig, clearConfig } = useXtreamConfig();
  const api = useXtreamAPI(config);
  const { toast } = useToast();
  const { addToFavorites, removeFromFavorites, isFavorite, favorites } = useFavorites();
  const [location, setLocation] = useLocation();

  // UI State
  const [currentSection, setCurrentSection] = useState('home');
  const [isSetupOpen, setIsSetupOpen] = useState(!config);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [epgModalOpen, setEpgModalOpen] = useState(false);
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);

  // API Queries
  const { data: authData, isError: authError } = useAuthentication(api);
  const { data: liveStreams, isLoading: liveLoading } = useLiveStreams(api, selectedCategory);
  const { data: vodStreams, isLoading: vodLoading } = useVODStreams(api, selectedCategory);
  const { data: seriesData, isLoading: seriesLoading } = useSeries(api, selectedCategory);
  const { data: liveCategories } = useCategories(api, 'live');
  const { data: vodCategories } = useCategories(api, 'vod');
  const { data: seriesCategories } = useCategories(api, 'series');
  const { data: epgData, isLoading: epgLoading } = useEPG(api, selectedStreamId);

  // Process content for display - memoized to prevent unnecessary re-renders
  const liveContent: ContentItem[] = useMemo(() => 
    (liveStreams || []).map((stream: XtreamStream) => ({
      id: `live-${stream.stream_id}`,
      title: stream.name,
      type: 'live' as const,
      poster: stream.stream_icon,
      streamId: stream.stream_id,
      categoryId: stream.category_id,
    })), [liveStreams]);

  const movieContent: ContentItem[] = useMemo(() => 
    (vodStreams || []).map((vod: XtreamVOD) => ({
      id: `movie-${vod.stream_id}`,
      title: vod.name,
      type: 'movie' as const,
      poster: vod.stream_icon,
      rating: vod.rating_5based,
      streamId: vod.stream_id,
      categoryId: vod.category_id,
    })), [vodStreams]);

  const seriesContent: ContentItem[] = useMemo(() => 
    (seriesData || []).map((series: XtreamSeries) => ({
      id: `series-${series.series_id}`,
      title: series.name,
      type: 'series' as const,
      poster: series.cover,
      rating: series.rating_5based,
      description: series.plot,
      year: series.releaseDate,
      streamId: series.series_id,
      categoryId: series.category_id,
    })), [seriesData]);

  const allContent = useMemo(() => [...liveContent, ...movieContent, ...seriesContent], [liveContent, movieContent, seriesContent]);
  const searchResults = useSearch(allContent, searchQuery);
  const favoriteContent = useMemo(() => allContent.filter(item => isFavorite(item.id)), [allContent, favorites]);

  // Show setup modal if authentication fails
  useEffect(() => {
    if (authError) {
      setIsSetupOpen(true);
      toast({
        title: "Authentication Failed",
        description: "Please check your Xtream credentials",
        variant: "destructive",
      });
    }
  }, [authError]);

  const handlePlayContent = (content: ContentItem) => {
    if (!api) return;

    // Navigate to the separate player page
    setLocation(`/player/${content.type}/${content.streamId}`);
  };

  const handleAddToList = (content: ContentItem) => {
    if (isFavorite(content.id)) {
      removeFromFavorites(content.id);
      toast({
        title: "Removed from list",
        description: `${content.title} has been removed from your list`,
      });
    } else {
      addToFavorites(content.id);
      toast({
        title: "Added to list",
        description: `${content.title} has been added to your list`,
      });
    }
  };

  const handleClosePlayer = () => {
    setCurrentContent(null);
    setStreamUrl('');
    setSelectedStreamId(null);
  };

  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    setSearchQuery('');
    setSelectedCategory('');
  };

  const getContentForSection = () => {
    if (searchQuery && searchResults.length > 0) {
      return searchResults;
    }

    switch (currentSection) {
      case 'live':
        return liveContent;
      case 'movies':
        return movieContent;
      case 'series':
        return seriesContent;
      case 'favorites':
        return favoriteContent;
      default:
        return allContent;
    }
  };

  const getSectionTitle = () => {
    if (searchQuery) {
      return `Search Results for "${searchQuery}"`;
    }

    switch (currentSection) {
      case 'live':
        return 'Live TV Channels';
      case 'movies':
        return 'Movies';
      case 'series':
        return 'TV Series';
      case 'favorites':
        return 'My List';
      default:
        return 'All Content';
    }
  };

  const isLoading = liveLoading || vodLoading || seriesLoading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        onSettingsClick={() => setIsSetupOpen(true)}
        onSearch={setSearchQuery}
      />

      <main className="pt-16">
        {currentSection === 'home' && !searchQuery && (
          <HeroSection
            featuredContent={movieContent[0]}
            onPlay={handlePlayContent}
            onAddToList={handleAddToList}
          />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Category Filter Pills */}
          {!searchQuery && (
            <div className="flex space-x-4 mb-8 overflow-x-auto scroll-container">
              <Button
                variant={selectedCategory === '' ? 'default' : 'outline'}
                className="whitespace-nowrap"
                onClick={() => setSelectedCategory('')}
                data-testid="category-all"
              >
                All
              </Button>
              {currentSection === 'live' && liveCategories?.map((cat) => (
                <Button
                  key={cat.category_id}
                  variant={selectedCategory === cat.category_id ? 'default' : 'outline'}
                  className="whitespace-nowrap"
                  onClick={() => setSelectedCategory(cat.category_id)}
                  data-testid={`category-${cat.category_id}`}
                >
                  {cat.category_name}
                </Button>
              ))}
              {currentSection === 'movies' && vodCategories?.map((cat) => (
                <Button
                  key={cat.category_id}
                  variant={selectedCategory === cat.category_id ? 'default' : 'outline'}
                  className="whitespace-nowrap"
                  onClick={() => setSelectedCategory(cat.category_id)}
                  data-testid={`category-${cat.category_id}`}
                >
                  {cat.category_name}
                </Button>
              ))}
              {currentSection === 'series' && seriesCategories?.map((cat) => (
                <Button
                  key={cat.category_id}
                  variant={selectedCategory === cat.category_id ? 'default' : 'outline'}
                  className="whitespace-nowrap"
                  onClick={() => setSelectedCategory(cat.category_id)}
                  data-testid={`category-${cat.category_id}`}
                >
                  {cat.category_name}
                </Button>
              ))}
            </div>
          )}

          {/* Content Sections */}
          {currentSection === 'home' && !searchQuery ? (
            <>
              <ContentGrid
                title="Live TV Channels"
                content={liveContent.slice(0, 14)}
                onContentClick={handlePlayContent}
                isLoading={liveLoading}
              />
              <ContentGrid
                title="Popular Movies"
                content={movieContent.slice(0, 14)}
                onContentClick={handlePlayContent}
                isLoading={vodLoading}
              />
              <ContentGrid
                title="TV Series"
                content={seriesContent.slice(0, 14)}
                onContentClick={handlePlayContent}
                isLoading={seriesLoading}
              />
            </>
          ) : (
            <ContentGrid
              title={getSectionTitle()}
              content={getContentForSection()}
              onContentClick={handlePlayContent}
              isLoading={isLoading}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <SetupModal
        isOpen={isSetupOpen}
        onSave={(config) => {
          saveConfig(config);
          setIsSetupOpen(false);
        }}
        onClose={() => {
          if (config) {
            setIsSetupOpen(false);
          }
        }}
      />

      {currentContent && (
        <VideoPlayer
          content={currentContent}
          streamUrl={streamUrl}
          onClose={handleClosePlayer}
        />
      )}

      <EPGModal
        isOpen={epgModalOpen}
        onClose={() => setEpgModalOpen(false)}
        epgData={epgData || []}
        channelName={currentContent?.title || ''}
        onWatch={(programId) => {
          console.log('Watch program:', programId);
          setEpgModalOpen(false);
        }}
        isLoading={epgLoading}
      />

      {/* Global keyboard shortcuts */}
      <div
        className="fixed inset-0 pointer-events-none"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (currentContent) {
              handleClosePlayer();
            } else if (isSetupOpen && config) {
              setIsSetupOpen(false);
            } else if (epgModalOpen) {
              setEpgModalOpen(false);
            }
          }
        }}
        tabIndex={-1}
      />
    </div>
  );
}
