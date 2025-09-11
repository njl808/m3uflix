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
  
  // Hero cycling state
  const [heroContent, setHeroContent] = useState<ContentItem | null>(null);
  const [cycleIndex, setCycleIndex] = useState(0);
  
  // Load homepage layout from admin panel
  const [homepageLayout, setHomepageLayout] = useState(() => {
    const saved = localStorage.getItem('iptv-homepage-layout');
    return saved ? JSON.parse(saved) : {
      showHero: true,
      customSections: [],
      defaultSections: { live: true, movies: true, series: true, liveCardLimit: 14, moviesCardLimit: 14, seriesCardLimit: 14 },
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
      // First check global category filters - but only for the item's type
      const allFilters = homepageLayout.globalCategoryFilters || [];
      const typeFilters = allFilters.filter((f: any) => f.type === item.type);
      
      // Only apply filtering if there are filters for this specific type
      if (typeFilters.length > 0) {
        const globalFilter = typeFilters.find((f: any) => f.categoryId === item.categoryId);
        if (!globalFilter || !globalFilter.visible) return false;
      }
      
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
  
  // Homepage queries (filtered by selectedCategory for layout)
  const { data: liveStreams, isLoading: liveLoading } = useLiveStreams(api, selectedCategory);
  const { data: vodStreams, isLoading: vodLoading } = useVODStreams(api, selectedCategory);
  const { data: seriesData, isLoading: seriesLoading } = useSeries(api, selectedCategory);
  
  // Tab queries (no category filter to get ALL content)
  const { data: allLiveStreams } = useLiveStreams(api);
  const { data: allVodStreams } = useVODStreams(api);
  const { data: allSeriesData } = useSeries(api);
  
  const { data: liveCategories } = useCategories(api, 'live');
  const { data: vodCategories } = useCategories(api, 'vod');
  const { data: seriesCategories } = useCategories(api, 'series');
  const { data: epgData, isLoading: epgLoading } = useEPG(api, selectedStreamId);

  // Process content for display - memoized to prevent unnecessary re-renders
  // Homepage content (filtered by layout settings)
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

  // Tab Category Manager state
  const [tabCategoryFilters, setTabCategoryFilters] = useState(() => {
    const saved = localStorage.getItem('iptv-tab-category-manager');
    return saved ? JSON.parse(saved).filters || [] : [];
  });

  // Listen for category manager changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('iptv-tab-category-manager');
      setTabCategoryFilters(saved ? JSON.parse(saved).filters || [] : []);
    };
    
    // Listen for both cross-window storage events and manual events
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Tab content (controlled by separate Category Manager - NOT Layout Settings)
  const liveTabContent: ContentItem[] = useMemo(() => {
    const content = (allLiveStreams || []).map((stream: XtreamStream) => ({
      id: `live-${stream.stream_id}`,
      title: stream.name,
      type: 'live' as const,
      poster: stream.stream_icon,
      streamId: stream.stream_id,
      categoryId: stream.category_id,
    }));
    
    const typeFilters = tabCategoryFilters.filter((f: any) => f.type === 'live');
    
    return content.filter(item => {
      const f = typeFilters.find(f => String(f.categoryId) === String(item.categoryId));
      return f ? f.visible : true; // default visible
    });
  }, [allLiveStreams, tabCategoryFilters]);

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

  const movieTabContent: ContentItem[] = useMemo(() => {
    const content = (allVodStreams || []).map((vod: XtreamVOD) => ({
      id: `movie-${vod.stream_id}`,
      title: vod.name,
      type: 'movie' as const,
      poster: vod.stream_icon,
      rating: vod.rating_5based,
      streamId: vod.stream_id,
      categoryId: vod.category_id,
    }));
    
    const typeFilters = tabCategoryFilters.filter((f: any) => f.type === 'movie');
    
    return content.filter(item => {
      const f = typeFilters.find(f => String(f.categoryId) === String(item.categoryId));
      return f ? f.visible : true; // default visible
    });
  }, [allVodStreams, tabCategoryFilters]);

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

  const seriesTabContent: ContentItem[] = useMemo(() => {
    const content = (allSeriesData || []).map((series: XtreamSeries) => ({
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
    
    const typeFilters = tabCategoryFilters.filter((f: any) => f.type === 'series');
    
    return content.filter(item => {
      const f = typeFilters.find(f => String(f.categoryId) === String(item.categoryId));
      return f ? f.visible : true; // default visible
    });
  }, [allSeriesData, tabCategoryFilters]);

  const allContent = useMemo(() => [...liveContent, ...movieContent, ...seriesContent], [liveContent, movieContent, seriesContent]);
  const allTabContent = useMemo(() => [...liveTabContent, ...movieTabContent, ...seriesTabContent], [liveTabContent, movieTabContent, seriesTabContent]);
  
  // Use the correct base content for search depending on current section
  const baseContentForSearch = filteredContent.length > 0 ? filteredContent : (currentSection === 'home' ? allContent : allTabContent);
  const searchResults = useSearch(baseContentForSearch, searchQuery);
  const favoriteContent = useMemo(() => (filteredContent.length > 0 ? filteredContent : allContent).filter(item => isFavorite(item.id)), [filteredContent, allContent, favorites]);

  // Boutique cycling logic - use raw API data to bypass filters
  const boutiqueContent = useMemo(() => {
    if (!homepageLayout.heroCycling?.enabled) {
      return [];
    }

    const { movieCategoryIds = [], seriesCategoryIds = [] } = homepageLayout.heroCycling;
    
    // Normalize IDs to strings for comparison
    const movieIds = movieCategoryIds.map(String);
    const seriesIds = seriesCategoryIds.map(String);
    
    // Get movies directly from raw API data to bypass filtering
    const selectedMovies = (vodStreams || [])
      .filter(vod => movieIds.includes(String(vod.category_id)))
      .map((vod) => ({
        id: `movie-${vod.stream_id}`,
        title: vod.name,
        type: 'movie' as const,
        poster: vod.stream_icon,
        rating: vod.rating_5based,
        streamId: vod.stream_id,
        categoryId: vod.category_id,
      }));
    
    // Get series directly from raw API data to bypass filtering  
    const selectedSeries = (seriesData || [])
      .filter(series => seriesIds.includes(String(series.category_id)))
      .map((series) => ({
        id: `series-${series.series_id}`,
        title: series.name,
        type: 'series' as const,
        poster: series.cover,
        rating: series.rating_5based,
        streamId: series.series_id,
        categoryId: series.category_id,
        description: series.plot,
        year: series.releaseDate,
      }));
    
    // Combine and shuffle for variety
    const combined = [...selectedMovies, ...selectedSeries];
    return combined.sort(() => Math.random() - 0.5);
  }, [vodStreams, seriesData, homepageLayout.heroCycling]);

  // Hero content cycling effect
  useEffect(() => {
    if (!homepageLayout.heroCycling?.enabled) {
      // Use static hero content or fallback when cycling is disabled
      if (homepageLayout.heroContentId) {
        const staticContent = allContent.find(item => item.id === homepageLayout.heroContentId) || movieContent[0];
        setHeroContent(staticContent);
      } else {
        setHeroContent(movieContent[0] || null);
      }
      return;
    }

    if (boutiqueContent.length === 0) {
      // Cycling is enabled but no content matches selected categories
      console.log('Hero cycling enabled but no content found for selected categories');
      setHeroContent(movieContent[0] || null);
      return;
    }

    // Set initial content
    if (boutiqueContent.length > 0) {
      setHeroContent(boutiqueContent[0]);
      setCycleIndex(0);
    }

    // Set up cycling interval
    const intervalMs = (homepageLayout.heroCycling?.intervalSeconds || 8) * 1000;
    const interval = setInterval(() => {
      setCycleIndex(prev => {
        const nextIndex = (prev + 1) % boutiqueContent.length;
        setHeroContent(boutiqueContent[nextIndex]);
        return nextIndex;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [boutiqueContent, homepageLayout.heroCycling, homepageLayout.heroContentId, movieContent, allContent]);

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
    setFilteredContent([]); // Clear any previous filtering when switching sections
  };

  const getContentForSection = () => {
    if (searchQuery && searchResults.length > 0) {
      return searchResults;
    }

    // For TABS: ignore filteredContent and use direct tab content (Category Manager filtered)
    // For HOME: use filteredContent if available, otherwise allContent (Layout filtered)
    switch (currentSection) {
      case 'live':
        return liveTabContent.filter(item => !selectedCategory || item.categoryId === selectedCategory);
      case 'movies':
        return movieTabContent.filter(item => !selectedCategory || item.categoryId === selectedCategory);
      case 'series':
        return seriesTabContent.filter(item => !selectedCategory || item.categoryId === selectedCategory);
      case 'favorites':
        return favoriteContent;
      default:
        // Home page - use Layout & Display Settings
        const homeContent = filteredContent.length > 0 ? filteredContent : allContent;
        return homeContent;
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
            featuredContent={heroContent || movieContent[0]}
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
                  content={liveContent.slice(0, homepageLayout.defaultSections.liveCardLimit || 14)}
                  onContentClick={handlePlayContent}
                  isLoading={liveLoading}
                />
              )}
              {homepageLayout.defaultSections.movies && (
                <ContentGrid
                  title="Popular Movies"
                  content={movieContent.slice(0, homepageLayout.defaultSections.moviesCardLimit || 14)}
                  onContentClick={handlePlayContent}
                  isLoading={vodLoading}
                />
              )}
              {homepageLayout.defaultSections.series && (
                <ContentGrid
                  title="TV Series"
                  content={seriesContent.slice(0, homepageLayout.defaultSections.seriesCardLimit || 14)}
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
                  content={currentSection === 'home' ? allContent : allTabContent}
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
        onClose={() => setIsSetupOpen(false)}
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
