import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Filter, Eye, EyeOff, Edit, Trash2, Plus } from 'lucide-react';
import { ContentItem } from '@/types/xtream';

interface ContentFilterSettings {
  hiddenCategories: string[];
  hiddenContent: string[];
  customCategoryNames: { [key: string]: string };
  contentBlacklist: string[];
  showAdultContent: boolean;
  maxRating: number;
}

interface ContentFilterProps {
  content: ContentItem[];
  categories: { category_id: string; category_name: string }[];
  onFilterChange: (filteredContent: ContentItem[]) => void;
  onSettingsChange: (settings: ContentFilterSettings) => void;
}

export function ContentFilter({ content, categories, onFilterChange, onSettingsChange }: ContentFilterProps) {
  const [settings, setSettings] = useState<ContentFilterSettings>(() => {
    const saved = localStorage.getItem('iptv-filter-settings');
    return saved ? JSON.parse(saved) : {
      hiddenCategories: [],
      hiddenContent: [],
      customCategoryNames: {},
      contentBlacklist: [],
      showAdultContent: true,
      maxRating: 10
    };
  });

  const [isOpen, setIsOpen] = useState(false);
  const [newBlacklistItem, setNewBlacklistItem] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('iptv-filter-settings', JSON.stringify(settings));
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  // Apply filters to content
  useEffect(() => {
    const filtered = content.filter(item => {
      // Hide categories
      if (settings.hiddenCategories.includes(item.categoryId || '')) {
        return false;
      }

      // Hide specific content
      if (settings.hiddenContent.includes(item.id)) {
        return false;
      }

      // Content blacklist (keywords)
      const itemText = `${item.title} ${item.description || ''}`.toLowerCase();
      if (settings.contentBlacklist.some(keyword => 
        itemText.includes(keyword.toLowerCase())
      )) {
        return false;
      }

      // Adult content filter
      if (!settings.showAdultContent) {
        const adultKeywords = ['xxx', 'adult', 'porn', 'sex', 'erotic', '18+'];
        if (adultKeywords.some(keyword => itemText.includes(keyword))) {
          return false;
        }
      }

      // Rating filter
      if (item.rating && parseFloat(item.rating.toString()) > settings.maxRating) {
        return false;
      }

      return true;
    });

    onFilterChange(filtered);
  }, [content, settings, onFilterChange]);

  const toggleCategory = (categoryId: string) => {
    setSettings(prev => ({
      ...prev,
      hiddenCategories: prev.hiddenCategories.includes(categoryId)
        ? prev.hiddenCategories.filter(id => id !== categoryId)
        : [...prev.hiddenCategories, categoryId]
    }));
  };

  const toggleContent = (contentId: string) => {
    setSettings(prev => ({
      ...prev,
      hiddenContent: prev.hiddenContent.includes(contentId)
        ? prev.hiddenContent.filter(id => id !== contentId)
        : [...prev.hiddenContent, contentId]
    }));
  };

  const addToBlacklist = () => {
    if (newBlacklistItem.trim()) {
      setSettings(prev => ({
        ...prev,
        contentBlacklist: [...prev.contentBlacklist, newBlacklistItem.trim()]
      }));
      setNewBlacklistItem('');
    }
  };

  const removeFromBlacklist = (keyword: string) => {
    setSettings(prev => ({
      ...prev,
      contentBlacklist: prev.contentBlacklist.filter(item => item !== keyword)
    }));
  };

  const updateCategoryName = (categoryId: string, newName: string) => {
    setSettings(prev => ({
      ...prev,
      customCategoryNames: {
        ...prev.customCategoryNames,
        [categoryId]: newName
      }
    }));
    setEditingCategory(null);
    setNewCategoryName('');
  };

  const getCategoryDisplayName = (category: { category_id: string; category_name: string }) => {
    return settings.customCategoryNames[category.category_id] || category.category_name;
  };

  const hiddenCount = content.length - content.filter(item => {
    if (settings.hiddenCategories.includes(item.categoryId || '')) return false;
    if (settings.hiddenContent.includes(item.id)) return false;
    const itemText = `${item.title} ${item.description || ''}`.toLowerCase();
    if (settings.contentBlacklist.some(keyword => itemText.includes(keyword.toLowerCase()))) return false;
    if (!settings.showAdultContent) {
      const adultKeywords = ['xxx', 'adult', 'porn', 'sex', 'erotic', '18+'];
      if (adultKeywords.some(keyword => itemText.includes(keyword))) return false;
    }
    if (item.rating && parseFloat(item.rating.toString()) > settings.maxRating) return false;
    return true;
  }).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-content-filter">
          <Filter className="w-4 h-4 mr-2" />
          Content Filter
          {hiddenCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {hiddenCount} hidden
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Content Filter & M3U Editor</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Category Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {categories.map(category => (
                    <div key={category.category_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={!settings.hiddenCategories.includes(category.category_id)}
                          onCheckedChange={() => toggleCategory(category.category_id)}
                          data-testid={`toggle-category-${category.category_id}`}
                        />
                        {editingCategory === category.category_id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="New category name"
                              className="w-48"
                              data-testid={`input-category-name-${category.category_id}`}
                            />
                            <Button
                              size="sm"
                              onClick={() => updateCategoryName(category.category_id, newCategoryName)}
                              data-testid={`button-save-category-${category.category_id}`}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCategory(null);
                                setNewCategoryName('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium" data-testid={`text-category-${category.category_id}`}>
                              {getCategoryDisplayName(category)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingCategory(category.category_id);
                                setNewCategoryName(getCategoryDisplayName(category));
                              }}
                              data-testid={`button-edit-category-${category.category_id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <Badge variant={settings.hiddenCategories.includes(category.category_id) ? "destructive" : "default"}>
                        {settings.hiddenCategories.includes(category.category_id) ? "Hidden" : "Visible"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Individual Content Control</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {content.slice(0, 100).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={!settings.hiddenContent.includes(item.id)}
                          onCheckedChange={() => toggleContent(item.id)}
                          data-testid={`toggle-content-${item.id}`}
                        />
                        <span className="text-sm" data-testid={`text-content-${item.id}`}>{item.title}</span>
                      </div>
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                  ))}
                  {content.length > 100 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Showing first 100 items. Use keyword filters for better control.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Blacklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newBlacklistItem}
                    onChange={(e) => setNewBlacklistItem(e.target.value)}
                    placeholder="Add keyword to hide content containing this word..."
                    data-testid="input-blacklist-keyword"
                  />
                  <Button onClick={addToBlacklist} data-testid="button-add-blacklist">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.contentBlacklist.map((keyword, index) => (
                    <Badge key={index} variant="destructive" className="cursor-pointer">
                      {keyword}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-1 h-auto p-0"
                        onClick={() => removeFromBlacklist(keyword)}
                        data-testid={`button-remove-blacklist-${index}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filter Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="adult-content">Show Adult Content</Label>
                    <p className="text-sm text-muted-foreground">Hide content with adult keywords</p>
                  </div>
                  <Switch
                    id="adult-content"
                    checked={settings.showAdultContent}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, showAdultContent: checked }))
                    }
                    data-testid="toggle-adult-content"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-rating">Maximum Rating: {settings.maxRating}</Label>
                  <input
                    id="max-rating"
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={settings.maxRating}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, maxRating: parseFloat(e.target.value) }))
                    }
                    className="w-full"
                    data-testid="slider-max-rating"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1.0</span>
                    <span>10.0</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Quick Actions</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, hiddenCategories: [] }))}
                      data-testid="button-show-all-categories"
                    >
                      Show All Categories
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, hiddenContent: [] }))}
                      data-testid="button-show-all-content"
                    >
                      Show All Content
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings(prev => ({ ...prev, contentBlacklist: [] }))}
                      data-testid="button-clear-blacklist"
                    >
                      Clear Blacklist
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}