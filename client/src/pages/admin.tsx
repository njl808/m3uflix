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
                <CardTitle>Content Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {allContent.slice(0, 100).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedContent.includes(item.id)}
                          onChange={() => toggleContentSelection(item.id)}
                          data-testid={`checkbox-content-${item.id}`}
                        />
                        <div>
                          <span className="font-medium">{item.title}</span>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{item.type}</Badge>
                            {item.rating && (
                              <Badge variant="secondary">★ {item.rating}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {allContent.length > 100 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Showing first 100 items. Search functionality coming soon.
                    </p>
                  )}
                </div>
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