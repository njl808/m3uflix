import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { HeroSection } from "@/components/hero-section";
import { ContentGrid } from "@/components/content-grid";
import { ContentFilter } from "@/components/content-filter";
import { SetupModal } from "@/components/setup-modal";
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
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [filterSettings, setFilterSettings] = useState<any>(null);
  
  // Load homepage layout from admin panel
  const [homepageLayout, setHomepageLayout] = useState(() => {
    const saved = localStorage.getItem('iptv-homepage-layout');
    return saved ? JSON.parse(saved) : {
      showHero: true,
      customSections: [],
      defaultSections: { live: true, movies: true, series: true },
      regionalProfiles: [],
      globalCategoryFilters: [],
      sectionOrder: ['live', 'movies', 'series']
    };
  });

  // Sync layout changes when navigating back from admin panel
  useEffect(() => {
    const saved = localStorage.getItem('iptv-homepage-layout');
    if (saved) {
      setHomepageLayout(JSON.parse(saved));
    }
  }, [location]);

  // Apply regional and global filtering to content
  const getFilteredContent = (content: ContentItem[]) => {
    return content.filter(item => {
      // First check global category filters - these override everything
      const globalFilter = homepageLayout.globalCategoryFilters?.find((f: any) => f.categoryId === item.categoryId);
      if (globalFilter && !globalFilter.visible) return false;
      
      // Then apply regional profile filters if active
      const activeProfile = homepageLayout.regionalProfiles?.find((p: any) => p.active);
      if (!activeProfile) return true;

      // Check keyword filters
      const titleLower = item.title.toLowerCase();
      
      // Must include at least one include keyword (if any)
      if (activeProfile.keywordFilters.include.length > 0) {
        const hasIncludeKeyword = activeProfile.keywordFilters.include.some((keyword: string) => 
          titleLower.includes(keyword.toLowerCase())
        );
        if (!hasIncludeKeyword) return false;
      }
      
      // Must not include any exclude keywords
      const hasExcludeKeyword = activeProfile.keywordFilters.exclude.some((keyword: string) => 
        titleLower.includes(keyword.toLowerCase())
      );
      if (hasExcludeKeyword) return false;
      
      // Check profile-specific category filters
      const categoryFilter = activeProfile.categoryFilters.find((f: any) => f.categoryId === item.categoryId);
      if (categoryFilter && !categoryFilter.visible) return false;
      
      return true;
    });
  };

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
  const liveContent: ContentItem[] = useMemo(() => {
    const content = (liveStreams || []).map((stream: XtreamStream) => ({
      id: `live-${stream.stream_id}`,
      title: stream.name,
      type: 'live' as const,
      poster: stream.stream_icon,
      streamId: stream.stream_id,
      categoryId: stream.category_id,
    }));
    return getFilteredContent(content);
  }, [liveStreams, homepageLayout]);

  const movieContent: ContentItem[] = useMemo(() => {
    const content = (vodStreams || []).map((vod: XtreamVOD) => ({
      id: `movie-${vod.stream_id}`,
      title: vod.name,
      type: 'movie' as const,
      poster: vod.stream_icon,
      rating: vod.rating_5based,
      streamId: vod.stream_id,
      categoryId: vod.category_id,
    }));
    return getFilteredContent(content);
  }, [vodStreams, homepageLayout]);

  const seriesContent: ContentItem[] = useMemo(() => {
    const content = (seriesData || []).map((series: XtreamSeries) => ({
      id: `series-${series.series_id}`,
      title: series.name,
      type: 'series' as const,
      poster: series.cover,
      rating: series.rating_5based,
      description: series.plot,
      year: series.releaseDate,
      streamId: series.series_id,
      categoryId: series.category_id,
    }));
    return getFilteredContent(content);
  }, [seriesData, homepageLayout]);

  const allContent = useMemo(() => [...liveContent, ...movieContent, ...seriesContent], [liveContent, movieContent, seriesContent]);
  const searchResults = useSearch(filteredContent.length > 0 ? filteredContent : allContent, searchQuery);
  const favoriteContent = useMemo(() => (filteredContent.length > 0 ? filteredContent : allContent).filter(item => isFavorite(item.id)), [filteredContent, allContent, favorites]);

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

  // Reload layout when returning from admin panel
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('iptv-homepage-layout');
      if (saved) {
        setHomepageLayout(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also check on focus in case user edited in another tab
    window.addEventListener('focus', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const handlePlayContent = (content: ContentItem) => {
    if (!api) return;

    // Navigate to detail pages for movies and series, direct to player for live streams
    if (content.type === 'movie') {
      setLocation(`/movie/${content.streamId}`);
    } else if (content.type === 'series') {
      setLocation(`/series/${content.streamId}`);
    } else {
      setLocation(`/player/${content.type}/${content.streamId}`);
    }
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


  const handleSectionChange = (section: string) => {
    setCurrentSection(section);
    setSearchQuery('');
    setSelectedCategory('');
  };

  const getContentForSection = () => {
    const contentToUse = filteredContent.length > 0 ? filteredContent : allContent;
    
    if (searchQuery && searchResults.length > 0) {
      return searchResults;
    }

    switch (currentSection) {
      case 'live':
        return contentToUse.filter(item => item.type === 'live' && (!selectedCategory || item.categoryId === selectedCategory));
      case 'movies':
        return contentToUse.filter(item => item.type === 'movie' && (!selectedCategory || item.categoryId === selectedCategory));
      case 'series':
        return contentToUse.filter(item => item.type === 'series' && (!selectedCategory || item.categoryId === selectedCategory));
      case 'favorites':
        return favoriteContent;
      default:
        return contentToUse;
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
        {currentSection === 'home' && !searchQuery && homepageLayout.showHero && (
          <HeroSection
            featuredContent={
              homepageLayout.heroContentId 
                ? allContent.find(item => item.id === homepageLayout.heroContentId) || movieContent[0]
                : movieContent[0]
            }
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
              {/* Custom Sections */}
              {homepageLayout.customSections
                .filter((section: any) => section.visible)
                .sort((a: any, b: any) => a.order - b.order)
                .map((section: any) => (
                  <ContentGrid
                    key={section.id}
                    title={section.title}
                    content={section.categoryIds
                      .map((categoryId: string) => allContent.filter(item => item.categoryId === categoryId))
                      .flat()
                      .slice(0, section.limit || 20)
                    }
                    onContentClick={handlePlayContent}
                    isLoading={false}
                  />
                ))}
              
              {/* Default Sections */}
              {homepageLayout.defaultSections.live && (
                <ContentGrid
                  title="Live TV Channels"
                  content={liveContent.slice(0, 14)}
                  onContentClick={handlePlayContent}
                  isLoading={liveLoading}
                />
              )}
              {homepageLayout.defaultSections.movies && (
                <ContentGrid
                  title="Popular Movies"
                  content={movieContent.slice(0, 14)}
                  onContentClick={handlePlayContent}
                  isLoading={vodLoading}
                />
              )}
              {homepageLayout.defaultSections.series && (
                <ContentGrid
                  title="TV Series"
                  content={seriesContent.slice(0, 14)}
                  onContentClick={handlePlayContent}
                  isLoading={seriesLoading}
                />
              )}
            </>
          ) : (
            <div className="space-y-6">
              {/* Content Filter Button */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{getSectionTitle()}</h2>
                <ContentFilter
                  content={allContent}
                  categories={[
                    ...(liveCategories || []),
                    ...(vodCategories || []),
                    ...(seriesCategories || [])
                  ]}
                  onFilterChange={setFilteredContent}
                  onSettingsChange={setFilterSettings}
                />
              </div>
              <ContentGrid
                title=""
                content={getContentForSection()}
                onContentClick={handlePlayContent}
                isLoading={isLoading}
              />
            </div>
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


      <EPGModal
        isOpen={epgModalOpen}
        onClose={() => setEpgModalOpen(false)}
        epgData={epgData || []}
        channelName=""
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
            if (isSetupOpen && config) {
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
