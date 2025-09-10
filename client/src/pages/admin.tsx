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
  ChevronUp, ChevronDown, Layout, Palette, Shield, Users 
} from 'lucide-react';
import { ContentItem } from '@/types/xtream';
import { useXtreamConfig, useXtreamAPI, useAuthentication, useLiveStreams, useVODStreams, useSeries, useCategories } from '@/hooks/use-xtream-api';

interface CategoryFilter {
  categoryId: string;
  categoryName: string;
  type: 'live' | 'movie' | 'series';
  visible: boolean;
  keywords: string[];
}

interface RegionalProfile {
  id: string;
  name: string;
  description: string;
  categoryFilters: CategoryFilter[];
  keywordFilters: {
    include: string[];
    exclude: string[];
  };
  active: boolean;
}

interface CustomSection {
  id: string;
  title: string;
  type: 'live' | 'movie' | 'series' | 'mixed' | 'category';
  categoryIds: string[];
  visible: boolean;
  order: number;
  limit?: number;
  keywordFilter?: string;
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
  regionalProfiles: RegionalProfile[];
  activeProfile?: string;
  globalCategoryFilters: CategoryFilter[];
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

  const [activeTab, setActiveTab] = useState('profiles');
  const [layout, setLayout] = useState<HomepageLayout>(() => {
    const saved = localStorage.getItem('iptv-homepage-layout');
    const defaultLayout = {
      showHero: true,
      customSections: [],
      defaultSections: {
        live: true,
        movies: true,
        series: true
      },
      regionalProfiles: [
        {
          id: 'uk',
          name: 'UK Channels',
          description: 'British and UK-based content',
          categoryFilters: [],
          keywordFilters: {
            include: ['uk', 'british', 'bbc', 'itv', 'channel 4', 'sky uk'],
            exclude: ['xxx', 'adult', 'porn']
          },
          active: false
        },
        {
          id: 'us',
          name: 'USA Channels', 
          description: 'American and US-based content',
          categoryFilters: [],
          keywordFilters: {
            include: ['usa', 'us', 'american', 'nbc', 'cbs', 'abc', 'fox'],
            exclude: ['xxx', 'adult', 'porn']
          },
          active: false
        }
      ],
      globalCategoryFilters: [],
      sectionOrder: ['live', 'movies', 'series']
    };
    
    if (saved) {
      const parsedLayout = JSON.parse(saved);
      // Ensure all required properties exist
      return {
        ...defaultLayout,
        ...parsedLayout,
        regionalProfiles: parsedLayout.regionalProfiles || defaultLayout.regionalProfiles,
        globalCategoryFilters: parsedLayout.globalCategoryFilters || [],
        customSections: parsedLayout.customSections || []
      };
    }
    
    return defaultLayout;
  });

  const [newSectionName, setNewSectionName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [editingProfile, setEditingProfile] = useState<RegionalProfile | null>(null);

  // Save layout whenever it changes
  useEffect(() => {
    localStorage.setItem('iptv-homepage-layout', JSON.stringify(layout));
  }, [layout]);

  // Combine all content for totals
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

  // Get all unique categories
  const allCategories = [
    ...(liveCategories || []),
    ...(vodCategories || []),
    ...(seriesCategories || [])
  ];

  const goBack = () => setLocation('/');

  const createCustomSection = () => {
    if (!newSectionName.trim() || selectedCategories.length === 0) return;

    const newSection: CustomSection = {
      id: `custom-${Date.now()}`,
      title: newSectionName,
      type: 'category',
      categoryIds: selectedCategories,
      visible: true,
      order: (layout.customSections || []).length,
      limit: 20
    };

    setLayout(prev => ({
      ...prev,
      customSections: [...(prev.customSections || []), newSection]
    }));

    setNewSectionName('');
    setSelectedCategories([]);
  };

  const createRegionalProfile = () => {
    if (!newProfileName.trim() || !allCategories || allCategories.length === 0) return;

    const newProfile: RegionalProfile = {
      id: `profile-${Date.now()}`,
      name: newProfileName,
      description: `Custom profile: ${newProfileName}`,
      categoryFilters: allCategories.map(cat => ({
        categoryId: cat.category_id,
        categoryName: cat.category_name,
        type: cat.category_name.toLowerCase().includes('live') ? 'live' : 
              cat.category_name.toLowerCase().includes('movie') ? 'movie' : 'series',
        visible: true,
        keywords: []
      })),
      keywordFilters: {
        include: [],
        exclude: ['xxx', 'adult', 'porn']
      },
      active: false
    };

    setLayout(prev => ({
      ...prev,
      regionalProfiles: [...(prev.regionalProfiles || []), newProfile]
    }));

    setNewProfileName('');
  };

  const activateProfile = (profileId: string) => {
    setLayout(prev => {
      const currentProfile = prev.regionalProfiles?.find(p => p.id === profileId);
      const isCurrentlyActive = currentProfile?.active;
      
      return {
        ...prev,
        activeProfile: isCurrentlyActive ? undefined : profileId,
        regionalProfiles: (prev.regionalProfiles || []).map(profile => ({
          ...profile,
          active: isCurrentlyActive ? false : profile.id === profileId
        }))
      };
    });
  };

  const toggleCategoryInProfile = (profileId: string, categoryId: string) => {
    setLayout(prev => ({
      ...prev,
      regionalProfiles: (prev.regionalProfiles || []).map(profile => 
        profile.id === profileId ? {
          ...profile,
          categoryFilters: (profile.categoryFilters || []).map(filter =>
            filter.categoryId === categoryId ? {
              ...filter,
              visible: !filter.visible
            } : filter
          )
        } : profile
      )
    }));
  };

  const deleteSection = (sectionId: string) => {
    setLayout(prev => ({
      ...prev,
      customSections: (prev.customSections || []).filter(s => s.id !== sectionId)
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<CustomSection>) => {
    setLayout(prev => ({
      ...prev,
      customSections: (prev.customSections || []).map(section => 
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setLayout(prev => {
      const sections = [...(prev.customSections || [])];
      const index = sections.findIndex(s => s.id === sectionId);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sections.length) return prev;

      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      
      return { ...prev, customSections: sections };
    });
  };

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
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
      regionalProfiles: [],
      globalCategoryFilters: [],
      sectionOrder: ['live', 'movies', 'series']
    });
  };

  const deleteProfile = (profileId: string) => {
    setLayout(prev => ({
      ...prev,
      regionalProfiles: (prev.regionalProfiles || []).filter(p => p.id !== profileId),
      activeProfile: prev.activeProfile === profileId ? undefined : prev.activeProfile
    }));
  };

  const toggleGlobalCategory = (categoryId: string, type: 'live' | 'movie' | 'series') => {
    setLayout(prev => {
      const currentFilters = prev.globalCategoryFilters || [];
      const existingFilter = currentFilters.find(f => f.categoryId === categoryId);
      
      let updatedFilters;
      if (existingFilter) {
        // Toggle existing filter
        updatedFilters = currentFilters.map(filter =>
          filter.categoryId === categoryId 
            ? { ...filter, visible: !filter.visible }
            : filter
        );
      } else {
        // Add new filter as disabled (since default is visible)
        const categoryName = allCategories?.find(c => c.category_id === categoryId)?.category_name || 'Unknown';
        updatedFilters = [...currentFilters, {
          categoryId,
          categoryName,
          type,
          visible: false,
          keywords: []
        }];
      }

      return {
        ...prev,
        globalCategoryFilters: updatedFilters
      };
    });
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
              <Shield className="w-5 h-5" />
              <h1 className="text-xl font-semibold">M3U Category Manager</h1>
            </div>
          </div>
          <Badge variant="outline">
            {allContent.length.toLocaleString()} Total Items • {allCategories.length} Categories
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Regional Profiles
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Grid className="w-4 h-4" />
              Category Manager
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Custom Sections
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Layout Settings
            </TabsTrigger>
          </TabsList>

          {/* Regional Profiles */}
          <TabsContent value="profiles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Regional Profiles
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create country-specific or personalized content filters. Much more efficient than selecting 218k individual channels!
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create New Profile */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Profile Name</Label>
                    <Input
                      id="profile-name"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="e.g., UK Only, Family Safe, Sports Only"
                      data-testid="input-profile-name"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={createRegionalProfile}
                      disabled={!newProfileName.trim()}
                      data-testid="button-create-profile"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Profile
                    </Button>
                  </div>
                </div>

                {/* Existing Profiles */}
                <div className="space-y-4">
                  {(layout.regionalProfiles || []).map((profile) => (
                    <Card key={profile.id} className={profile.active ? "ring-2 ring-primary" : ""}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{profile.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{profile.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={profile.active ? "default" : "outline"}>
                              {profile.active ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              size="sm"
                              variant={profile.active ? "outline" : "default"}
                              onClick={() => activateProfile(profile.id)}
                              data-testid={`button-activate-${profile.id}`}
                            >
                              {profile.active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteProfile(profile.id)}
                              data-testid={`button-delete-profile-${profile.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Keywords */}
                          <div>
                            <Label className="text-sm font-medium">Include Keywords:</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {profile.keywordFilters.include.map(keyword => (
                                <Badge key={keyword} variant="secondary" className="text-xs">
                                  +{keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Exclude Keywords:</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {profile.keywordFilters.exclude.map(keyword => (
                                <Badge key={keyword} variant="destructive" className="text-xs">
                                  -{keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {/* Category Count */}
                          <div className="text-sm text-muted-foreground">
                            Categories: {profile.categoryFilters.filter(c => c.visible).length} of {profile.categoryFilters.length} enabled
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Manager */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage entire categories instead of individual channels. Perfect for your {allContent.length.toLocaleString()} item playlist!
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Live TV Categories */}
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      Live TV Categories ({liveCategories?.length || 0})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(liveCategories || []).map(category => (
                        <div key={category.category_id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{category.category_name}</span>
                          <Switch
                            checked={layout.globalCategoryFilters?.find(f => f.categoryId === category.category_id)?.visible ?? true}
                            onCheckedChange={() => toggleGlobalCategory(category.category_id, 'live')}
                            data-testid={`toggle-live-${category.category_id}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Movie Categories */}
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      Movie Categories ({vodCategories?.length || 0})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(vodCategories || []).map(category => (
                        <div key={category.category_id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{category.category_name}</span>
                          <Switch
                            checked={layout.globalCategoryFilters?.find(f => f.categoryId === category.category_id)?.visible ?? true}
                            onCheckedChange={() => toggleGlobalCategory(category.category_id, 'movie')}
                            data-testid={`toggle-movie-${category.category_id}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Series Categories */}
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      Series Categories ({seriesCategories?.length || 0})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(seriesCategories || []).map(category => (
                        <div key={category.category_id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{category.category_name}</span>
                          <Switch
                            checked={layout.globalCategoryFilters?.find(f => f.categoryId === category.category_id)?.visible ?? true}
                            onCheckedChange={() => toggleGlobalCategory(category.category_id, 'series')}
                            data-testid={`toggle-series-${category.category_id}`}
                          />
                        </div>
                      ))}
                    </div>
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
                  Create Category-Based Section
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
                      placeholder="e.g., UK Sports, Kids Movies"
                      data-testid="input-section-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selected Categories ({selectedCategories.length})</Label>
                    <Button
                      onClick={createCustomSection}
                      disabled={!newSectionName.trim() || selectedCategories.length === 0}
                      data-testid="button-create-section"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Section
                    </Button>
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-3">
                  <Label>Select Categories for Section</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {(allCategories || []).map(category => (
                      <div key={category.category_id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.category_id)}
                          onChange={() => toggleCategorySelection(category.category_id)}
                          data-testid={`checkbox-category-${category.category_id}`}
                        />
                        <span className="text-sm">{category.category_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Sections */}
            <div className="space-y-4">
              {(layout.customSections || []).map((section) => (
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
                      {(section.categoryIds || []).slice(0, 10).map(categoryId => {
                        const category = (allCategories || []).find(c => c.category_id === categoryId);
                        return category ? (
                          <Badge key={categoryId} variant="secondary">
                            {category.category_name}
                          </Badge>
                        ) : null;
                      })}
                      {(section.categoryIds || []).length > 10 && (
                        <Badge variant="outline">
                          +{(section.categoryIds || []).length - 10} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                <div className="space-y-4">
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
                    <div className="space-y-3 pl-4 border-l-2 border-muted">
                      <Label>Hero Content Selection</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Choose from Movies</Label>
                          <select
                            className="w-full p-2 border rounded text-sm"
                            value={layout.heroContentId?.startsWith('movie-') ? layout.heroContentId : ''}
                            onChange={(e) => setLayout(prev => ({ 
                              ...prev, 
                              heroContentId: e.target.value || undefined 
                            }))}
                            data-testid="select-hero-movie"
                          >
                            <option value="">Select a movie... ({(vodStreams || []).length} available)</option>
                            {(vodStreams || []).map(movie => (
                              <option key={movie.stream_id} value={`movie-${movie.stream_id}`}>
                                {movie.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Choose from Series</Label>
                          <select
                            className="w-full p-2 border rounded text-sm"
                            value={layout.heroContentId?.startsWith('series-') ? layout.heroContentId : ''}
                            onChange={(e) => setLayout(prev => ({ 
                              ...prev, 
                              heroContentId: e.target.value || undefined 
                            }))}
                            data-testid="select-hero-series"
                          >
                            <option value="">Select a series... ({(seriesData || []).length} available)</option>
                            {(seriesData || []).map(series => (
                              <option key={series.series_id} value={`series-${series.series_id}`}>
                                {series.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Current hero: {layout.heroContentId ? 
                          (layout.heroContentId.startsWith('movie-') ? 'Movie' : 'Series') : 'None selected'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>Section Display & Content Control</Label>
                  <div className="space-y-6">
                    {/* Live TV Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Live TV Section</span>
                        <Switch
                          checked={layout.defaultSections.live}
                          onCheckedChange={(checked) => 
                            setLayout(prev => ({
                              ...prev,
                              defaultSections: {
                                ...prev.defaultSections,
                                live: checked
                              }
                            }))
                          }
                          data-testid="toggle-live-section"
                        />
                      </div>
                      {layout.defaultSections.live && (
                        <div className="pl-4 border-l-2 border-muted">
                          <Label className="text-sm">Choose Live TV Categories ({(liveCategories || []).length} total)</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto mt-2 border rounded p-2">
                            {(liveCategories || []).map(category => (
                              <div key={category.category_id} className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={!(layout.globalCategoryFilters?.find(f => f.categoryId === category.category_id)?.visible === false)}
                                  onChange={() => toggleGlobalCategory(category.category_id, 'live')}
                                  className="text-xs"
                                  data-testid={`live-category-${category.category_id}`}
                                />
                                <span className="text-xs truncate">{category.category_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Movies Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Movies Section</span>
                        <Switch
                          checked={layout.defaultSections.movies}
                          onCheckedChange={(checked) => 
                            setLayout(prev => ({
                              ...prev,
                              defaultSections: {
                                ...prev.defaultSections,
                                movies: checked
                              }
                            }))
                          }
                          data-testid="toggle-movies-section"
                        />
                      </div>
                      {layout.defaultSections.movies && (
                        <div className="pl-4 border-l-2 border-muted">
                          <Label className="text-sm">Choose Movie Categories ({(vodCategories || []).length} total)</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto mt-2 border rounded p-2">
                            {(vodCategories || []).map(category => (
                              <div key={category.category_id} className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={!(layout.globalCategoryFilters?.find(f => f.categoryId === category.category_id)?.visible === false)}
                                  onChange={() => toggleGlobalCategory(category.category_id, 'movie')}
                                  className="text-xs"
                                  data-testid={`movie-category-${category.category_id}`}
                                />
                                <span className="text-xs truncate">{category.category_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Series Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Series Section</span>
                        <Switch
                          checked={layout.defaultSections.series}
                          onCheckedChange={(checked) => 
                            setLayout(prev => ({
                              ...prev,
                              defaultSections: {
                                ...prev.defaultSections,
                                series: checked
                              }
                            }))
                          }
                          data-testid="toggle-series-section"
                        />
                      </div>
                      {layout.defaultSections.series && (
                        <div className="pl-4 border-l-2 border-muted">
                          <Label className="text-sm">Choose Series Categories ({(seriesCategories || []).length} total)</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto mt-2 border rounded p-2">
                            {(seriesCategories || []).map(category => (
                              <div key={category.category_id} className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={!(layout.globalCategoryFilters?.find(f => f.categoryId === category.category_id)?.visible === false)}
                                  onChange={() => toggleGlobalCategory(category.category_id, 'series')}
                                  className="text-xs"
                                  data-testid={`series-category-${category.category_id}`}
                                />
                                <span className="text-xs truncate">{category.category_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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
                    <p>• Custom Sections: {(layout.customSections || []).length}</p>
                    <p>• Regional Profiles: {(layout.regionalProfiles || []).length}</p>
                    <p>• Active Profile: {layout.activeProfile || 'None'}</p>
                    <p>• Total Content: {allContent.length.toLocaleString()} items</p>
                    <p>• Total Categories: {(allCategories || []).length}</p>
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