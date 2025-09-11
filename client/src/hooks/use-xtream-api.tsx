import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { XtreamAPI } from "@/lib/xtream-api";
import { XtreamConfig, ContentItem } from "@/types/xtream";
import { useState, useEffect } from "react";

export function useXtreamConfig() {
  const [config, setConfig] = useState<XtreamConfig | null>(() => {
    const saved = localStorage.getItem('iptv-config');
    return saved ? JSON.parse(saved) : null;
  });

  const saveConfig = (newConfig: XtreamConfig) => {
    localStorage.setItem('iptv-config', JSON.stringify(newConfig));
    setConfig(newConfig);
  };

  const clearConfig = () => {
    localStorage.removeItem('iptv-config');
    setConfig(null);
  };

  return { config, saveConfig, clearConfig };
}

export function useXtreamAPI(config: XtreamConfig | null) {
  const [api, setApi] = useState<XtreamAPI | null>(null);

  useEffect(() => {
    if (config) {
      setApi(new XtreamAPI(config));
    } else {
      setApi(null);
    }
  }, [config?.serverUrl, config?.username, config?.password]);

  return api;
}

export function useAuthentication(api: XtreamAPI | null) {
  return useQuery({
    queryKey: ['/api/auth', api?.serverUrl, api?.username],
    queryFn: () => api?.authenticate(),
    enabled: !!api,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLiveStreams(api: XtreamAPI | null, categoryId?: string) {
  return useQuery({
    queryKey: ['/api/live-streams', api?.serverUrl, categoryId ?? 'all'],
    queryFn: () => api?.getLiveStreams(categoryId),
    enabled: !!api,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useVODStreams(api: XtreamAPI | null, categoryId?: string) {
  return useQuery({
    queryKey: ['/api/vod-streams', api?.serverUrl, categoryId ?? 'all'],
    queryFn: () => api?.getVODStreams(categoryId),
    enabled: !!api,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSeries(api: XtreamAPI | null, categoryId?: string) {
  return useQuery({
    queryKey: ['/api/series', api?.serverUrl, categoryId ?? 'all'],
    queryFn: () => api?.getSeries(categoryId),
    enabled: !!api,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCategories(api: XtreamAPI | null, type: 'live' | 'vod' | 'series') {
  return useQuery({
    queryKey: ['/api/categories', api?.serverUrl, type],
    queryFn: () => {
      if (type === 'live') return api?.getLiveCategories();
      if (type === 'vod') return api?.getVODCategories();
      if (type === 'series') return api?.getSeriesCategories();
    },
    enabled: !!api,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useEPG(api: XtreamAPI | null, streamId: number | null) {
  return useQuery({
    queryKey: ['/api/epg', api?.serverUrl, streamId],
    queryFn: () => streamId ? api?.getEPG(streamId) : null,
    enabled: !!api && !!streamId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('iptv-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const addToFavorites = (contentId: string) => {
    const newFavorites = [...favorites, contentId];
    setFavorites(newFavorites);
    localStorage.setItem('iptv-favorites', JSON.stringify(newFavorites));
  };

  const removeFromFavorites = (contentId: string) => {
    const newFavorites = favorites.filter(id => id !== contentId);
    setFavorites(newFavorites);
    localStorage.setItem('iptv-favorites', JSON.stringify(newFavorites));
  };

  const isFavorite = (contentId: string) => favorites.includes(contentId);

  return { favorites, addToFavorites, removeFromFavorites, isFavorite };
}

export function useSearch(content: ContentItem[], query: string) {
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = content.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(filtered);
  }, [content, query]);

  return searchResults;
}
