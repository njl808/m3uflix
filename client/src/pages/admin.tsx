import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Settings, Home, Grid, List, Eye, EyeOff, 
  Plus, Trash2, Edit, Save, RotateCcw, Move, 
  ChevronUp, ChevronDown, Layout, Palette 
} from 'lucide-react';
import { ContentItem } from '@/types/xtream';
import { useXtreamConfig, useXtreamAPI, useAuthentication, useLiveStreams, useVODStreams, useSeries, useCategories } from '@/hooks/use-xtream-api';

interface CustomSection {
  id: string;
  title: string;
  type: 'live' | 'movie' | 'series' | 'mixed' | 'custom';
  contentIds: string[];
  visible: boolean;
  order: number;
  limit?: number;
  categoryFilter?: string;
}

interface HomepageLayout {
  showHero: boolean;
  heroContentId?: string;
  customSections: CustomSection[];
  defaultSections: {
    live: boolean;
    movies: boolean;
    series: boolean;
  };
  sectionOrder: string[];
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { config } = useXtreamConfig();
  const api = useXtreamAPI(config);
  
  const { data: authData } = useAuthentication(api);
  const { data: liveStreams } = useLiveStreams(api);
  const { data: vodStreams } = useVODStreams(api);
  const { data: seriesData } = useSeries(api);
  const { data: liveCategories } = useCategories(api, 'live');
  const { data: vodCategories } = useCategories(api, 'vod');
  const { data: seriesCategories } = useCategories(api, 'series');

  const [activeTab, setActiveTab] = useState('homepage');
  const [layout, setLayout] = useState<HomepageLayout>(() => {
    const saved = localStorage.getItem('iptv-homepage-layout');
    return saved ? JSON.parse(saved) : {
      showHero: true,
      customSections: [],
      defaultSections: {
        live: true,
        movies: true,
        series: true
      },
      sectionOrder: ['live', 'movies', 'series']
    };
  });

  const [editingSection, setEditingSection] = useState<CustomSection | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedContent, setSelectedContent] = useState<string[]>([]);

  // Content management state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'live' | 'movie' | 'series'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  // Save layout whenever it changes
  useEffect(() => {
    localStorage.setItem('iptv-homepage-layout', JSON.stringify(layout));
  }, [layout]);

  // Combine all content for selection
  const allContent: ContentItem[] = [
    ...(liveStreams || []).map(stream => ({
      id: `live-${stream.stream_id}`,
      title: stream.name,
      type: 'live' as const,
      poster: stream.stream_icon,
      streamId: stream.stream_id,
      categoryId: stream.category_id,
    })),
    ...(vodStreams || []).map(vod => ({
      id: `movie-${vod.stream_id}`,
      title: vod.name,
      type: 'movie' as const,
      poster: vod.stream_icon,
      rating: vod.rating_5based,
      streamId: vod.stream_id,
      categoryId: vod.category_id,
    })),
    ...(seriesData || []).map(series => ({
      id: `series-${series.series_id}`,
      title: series.name,
      type: 'series' as const,
      poster: series.cover,
      rating: series.rating_5based,
      streamId: series.series_id,
      categoryId: series.category_id,
    }))
  ];

  const goBack = () => setLocation('/');

  const createCustomSection = () => {
    if (!newSectionName.trim()) return;

    const newSection: CustomSection = {
      id: `custom-${Date.now()}`,
      title: newSectionName,
      type: 'custom',
      contentIds: selectedContent,
      visible: true,
      order: layout.customSections.length,
      limit: 20
    };

    setLayout(prev => ({
      ...prev,
      customSections: [...prev.customSections, newSection]
    }));

    setNewSectionName('');
    setSelectedContent([]);
  };

  const deleteSection = (sectionId: string) => {
    setLayout(prev => ({
      ...prev,
      customSections: prev.customSections.filter(s => s.id !== sectionId)
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<CustomSection>) => {
    setLayout(prev => ({
      ...prev,
      customSections: prev.customSections.map(section => 
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setLayout(prev => {
      const sections = [...prev.customSections];
      const index = sections.findIndex(s => s.id === sectionId);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sections.length) return prev;

      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      
      return { ...prev, customSections: sections };
    });
  };

  const toggleContentSelection = (contentId: string) => {
    setSelectedContent(prev => 
      prev.includes(contentId) 
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  const resetToDefaults = () => {
    setLayout({
      showHero: true,
      customSections: [],
      defaultSections: {
        live: true,
        movies: true,
        series: true
      },
      sectionOrder: ['live', 'movies', 'series']
    });
  };

  const getContentById = (contentId: string) => {
    return allContent.find(item => item.id === contentId);
  };

  // Filter and paginate content
  const filteredContent = allContent.filter(item => {
    // Search filter
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Type filter
    if (selectedType !== 'all' && item.type !== selectedType) {
      return false;
    }
    
    // Category filter
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
      return false;
    }
    
    return true;
  });

  const totalPages = Math.ceil(filteredContent.length / pageSize);
  const paginatedContent = filteredContent.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Get all unique categories
  const allCategories = [
    ...(liveCategories || []),
    ...(vodCategories || []),
    ...(seriesCategories || [])
  ];

  const toggleAllContent = () => {
    if (bulkSelectMode) {
      if (selectedContent.length === filteredContent.length) {
        setSelectedContent([]);
      } else {
        setSelectedContent(filteredContent.map(item => item.id));
      }
    }
  };

  const selectContentByCategory = (categoryId: string) => {
    const categoryContent = allContent
      .filter(item => item.categoryId === categoryId)
      .map(item => item.id);
    
    setSelectedContent(prev => [
      ...prev.filter(id => !categoryContent.includes(id)),
      ...categoryContent
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Player
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <h1 className="text-xl font-semibold">M3U Admin Panel</h1>
            </div>
          </div>
          <Badge variant="outline">
            {allContent.length} Total Items
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="homepage" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Homepage
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <Grid className="w-4 h-4" />
              Custom Sections
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Content Manager
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Layout Settings
            </TabsTrigger>
          </TabsList>

          {/* Homepage Configuration */}
          <TabsContent value="homepage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Homepage Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-hero">Show Hero Section</Label>
                    <p className="text-sm text-muted-foreground">Display featured content at the top</p>
                  </div>
                  <Switch
                    id="show-hero"
                    checked={layout.showHero}
                    onCheckedChange={(checked) => 
                      setLayout(prev => ({ ...prev, showHero: checked }))
                    }
                    data-testid="toggle-hero"
                  />
                </div>

                {layout.showHero && (
                  <div className="space-y-2">
                    <Label>Hero Content</Label>
                    <Select
                      value={layout.heroContentId || ''}
                      onValueChange={(value) => 
                        setLayout(prev => ({ ...prev, heroContentId: value }))
                      }
                    >
                      <SelectTrigger data-testid="select-hero-content">
                        <SelectValue placeholder="Select featured content" />
                      </SelectTrigger>
                      <SelectContent>
                        {allContent.slice(0, 50).map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.title} ({item.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-4">
                  <Label>Default Sections</Label>
                  <div className="space-y-3">
                    {Object.entries(layout.defaultSections).map(([key, enabled]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="capitalize">{key} TV</span>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => 
                            setLayout(prev => ({
                              ...prev,
                              defaultSections: {
                                ...prev.defaultSections,
                                [key]: checked
                              }
                            }))
                          }
                          data-testid={`toggle-${key}-section`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Sections */}
          <TabsContent value="sections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Custom Section
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="section-name">Section Name</Label>
                    <Input
                      id="section-name"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="e.g., My Favorites, Kids Shows"
                      data-testid="input-section-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selected Content ({selectedContent.length})</Label>
                    <Button
                      onClick={createCustomSection}
                      disabled={!newSectionName.trim() || selectedContent.length === 0}
                      data-testid="button-create-section"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Section
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Custom Sections */}
            <div className="space-y-4">
              {layout.customSections.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveSection(section.id, 'up')}
                          data-testid={`button-move-up-${section.id}`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveSection(section.id, 'down')}
                          data-testid={`button-move-down-${section.id}`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Switch
                          checked={section.visible}
                          onCheckedChange={(checked) => 
                            updateSection(section.id, { visible: checked })
                          }
                          data-testid={`toggle-section-${section.id}`}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteSection(section.id)}
                          data-testid={`button-delete-${section.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {section.contentIds.slice(0, 10).map(contentId => {
                        const content = getContentById(contentId);
                        return content ? (
                          <Badge key={contentId} variant="secondary">
                            {content.title}
                          </Badge>
                        ) : null;
                      })}
                      {section.contentIds.length > 10 && (
                        <Badge variant="outline">
                          +{section.contentIds.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Content Manager */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Content Selection
                  <Badge variant="outline">
                    {filteredContent.length.toLocaleString()} of {allContent.length.toLocaleString()} items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-content">Search Content</Label>
                    <Input
                      id="search-content"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by title..."
                      data-testid="input-search-content"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select
                      value={selectedType}
                      onValueChange={(value: 'all' | 'live' | 'movie' | 'series') => {
                        setSelectedType(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger data-testid="select-content-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="live">Live TV</SelectItem>
                        <SelectItem value="movie">Movies</SelectItem>
                        <SelectItem value="series">Series</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger data-testid="select-content-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {allCategories.map(cat => (
                          <SelectItem key={cat.category_id} value={cat.category_id}>
                            {cat.category_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Selection Mode</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={bulkSelectMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBulkSelectMode(!bulkSelectMode)}
                        data-testid="button-bulk-mode"
                      >
                        Bulk Mode
                      </Button>
                      {bulkSelectMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleAllContent}
                          data-testid="button-select-all"
                        >
                          {selectedContent.length === filteredContent.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Category Selection */}
                {bulkSelectMode && (
                  <div className="space-y-3">
                    <Label>Quick Category Selection</Label>
                    <div className="flex flex-wrap gap-2">
                      {allCategories.slice(0, 10).map(cat => (
                        <Button
                          key={cat.category_id}
                          variant="outline"
                          size="sm"
                          onClick={() => selectContentByCategory(cat.category_id)}
                          data-testid={`button-select-category-${cat.category_id}`}
                        >
                          + {cat.category_name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Count */}
                <div className="flex items-center justify-between bg-muted p-3 rounded">
                  <span className="text-sm">
                    Selected: <strong>{selectedContent.length.toLocaleString()}</strong> items
                  </span>
                  {selectedContent.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedContent([])}
                      data-testid="button-clear-selection"
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>

                {/* Content List */}
                <div className="space-y-2 max-h-96 overflow-y-auto border rounded p-4">
                  {paginatedContent.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedContent.includes(item.id)}
                          onChange={() => toggleContentSelection(item.id)}
                          data-testid={`checkbox-content-${item.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{item.type}</Badge>
                            {item.rating && (
                              <Badge variant="secondary" className="text-xs">★ {item.rating}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredContent.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No content found matching your filters
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} • Showing {paginatedContent.length} of {filteredContent.length.toLocaleString()} filtered items
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Layout Settings */}
          <TabsContent value="layout" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Layout & Display Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Reset to Default Layout</h3>
                    <p className="text-sm text-muted-foreground">
                      This will remove all custom sections and reset homepage settings
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={resetToDefaults}
                    data-testid="button-reset-layout"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Current Configuration</h3>
                  <div className="text-sm space-y-2">
                    <p>• Hero Section: {layout.showHero ? 'Enabled' : 'Disabled'}</p>
                    <p>• Custom Sections: {layout.customSections.length}</p>
                    <p>• Default Sections: {Object.values(layout.defaultSections).filter(Boolean).length}/3 enabled</p>
                    <p>• Total Content: {allContent.length} items</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={goBack} className="w-full" data-testid="button-apply-changes">
                    <Save className="w-4 h-4 mr-2" />
                    Apply Changes & Return to Player
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}