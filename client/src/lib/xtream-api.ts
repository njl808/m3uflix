import { XtreamConfig, XtreamUserInfo, XtreamCategory, XtreamStream, XtreamVOD, XtreamSeries, XtreamEPG } from "@/types/xtream";

export class XtreamAPI {
  private serverUrl: string;
  private username: string;
  private password: string;
  private baseUrl: string;

  constructor(config: XtreamConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = `${this.serverUrl}/player_api.php?username=${this.username}&password=${this.password}`;
  }

  private async makeProxyRequest(endpoint: string, data: any): Promise<any> {
    try {
      const config = {
        serverUrl: this.serverUrl,
        username: this.username,
        password: this.password,
      };
      
      const response = await fetch(`/api/xtream/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config, ...data }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw new Error(`Failed to connect to Xtream server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async authenticate(): Promise<XtreamUserInfo> {
    return this.makeProxyRequest('authenticate', {});
  }

  async getLiveCategories(): Promise<XtreamCategory[]> {
    return this.makeProxyRequest('categories', { action: 'get_live_categories' });
  }

  async getLiveStreams(categoryId?: string): Promise<XtreamStream[]> {
    return this.makeProxyRequest('streams', { 
      action: 'get_live_streams', 
      categoryId 
    });
  }

  async getVODCategories(): Promise<XtreamCategory[]> {
    return this.makeProxyRequest('categories', { action: 'get_vod_categories' });
  }

  async getVODStreams(categoryId?: string): Promise<XtreamVOD[]> {
    return this.makeProxyRequest('streams', { 
      action: 'get_vod_streams', 
      categoryId 
    });
  }

  async getSeriesCategories(): Promise<XtreamCategory[]> {
    return this.makeProxyRequest('categories', { action: 'get_series_categories' });
  }

  async getSeries(categoryId?: string): Promise<XtreamSeries[]> {
    return this.makeProxyRequest('streams', { 
      action: 'get_series', 
      categoryId 
    });
  }

  async getEPG(streamId: number): Promise<XtreamEPG[]> {
    return this.makeProxyRequest('epg', { streamId });
  }

  async getVODInfo(vodId: number): Promise<any> {
    return this.makeProxyRequest('vod-info', { vodId });
  }

  async getSeriesInfo(seriesId: number): Promise<any> {
    return this.makeProxyRequest('series-info', { seriesId });
  }

  buildStreamUrl(streamId: number, type: 'live' | 'movie' | 'series', options: {
    extension?: string;
    quality?: string;
    format?: 'hls' | 'ts' | 'mp4' | 'mkv' | 'original';
  } = {}): string {
    // Use the backend proxy for streaming to avoid CORS issues
    const { extension, quality, format = 'original' } = options;
    
    // Determine the best extension based on type and format preference
    let ext = extension;
    if (!ext) {
      if (type === 'live') {
        ext = format === 'hls' ? 'm3u8' : 'ts';
      } else {
        // For VOD content, prefer mp4 for better compatibility
        ext = format === 'original' ? 'mp4' : (format === 'hls' ? 'm3u8' : format);
      }
    }
    
    const typeMap = {
      'live': 'live',
      'movie': 'movie', 
      'series': 'series'
    };
    
    let url = `/api/stream/${typeMap[type]}/${this.username}/${this.password}/${streamId}.${ext}`;
    
    // Add server parameter
    url += `?server=${encodeURIComponent(this.serverUrl)}`;
    
    // Add quality parameter if specified
    if (quality) {
      url += `&quality=${encodeURIComponent(quality)}`;
    }
    
    // Add format hint for backend processing
    if (format && format !== 'original') {
      url += `&format=${format}`;
    }
    
    return url;
  }

  // Helper method to build multiple stream URLs for fallback
  buildStreamUrls(streamId: number, type: 'live' | 'movie' | 'series'): Array<{
    url: string;
    format: string;
    description: string;
    extension: string;
  }> {
    const urls = [];
    
    if (type === 'live') {
      // For live streams, prioritize HLS formats
      urls.push({
        url: this.buildStreamUrl(streamId, type, { format: 'hls' }),
        format: 'HLS',
        description: 'HLS Live Stream (recommended)',
        extension: 'm3u8'
      });
      
      // Fallback to direct TS if HLS fails
      urls.push({
        url: this.buildStreamUrl(streamId, type, { format: 'ts' }),
        format: 'TS',
        description: 'Transport Stream (direct)',
        extension: 'ts'
      });
    } else {
      // For VOD content, try proven formats first
      urls.push({
        url: this.buildStreamUrl(streamId, type, { format: 'original' }),
        format: 'Original',
        description: 'Original format',
        extension: 'mp4'
      });
      
      urls.push({
        url: this.buildStreamUrl(streamId, type, { format: 'mp4' }),
        format: 'MP4',
        description: 'MP4 format (most compatible)',
        extension: 'mp4'
      });
      
      // Only include MKV if it's likely to be available
      // Note: MKV may not be available on all Xtream servers
      urls.push({
        url: this.buildStreamUrl(streamId, type, { format: 'mkv' }),
        format: 'MKV',
        description: 'MKV format (if available)',
        extension: 'mkv'
      });
    }
    
    return urls;
  }

  // Build direct stream URL (bypassing proxy) for external players
  buildDirectStreamUrl(streamId: number, type: 'live' | 'movie' | 'series', extension: string = 'ts'): string {
    const ext = type === 'live' ? extension : 'mp4';
    
    if (type === 'live') {
      return `${this.serverUrl}/live/${this.username}/${this.password}/${streamId}.${ext}`;
    } else if (type === 'movie') {
      return `${this.serverUrl}/movie/${this.username}/${this.password}/${streamId}.${ext}`;
    } else {
      return `${this.serverUrl}/series/${this.username}/${this.password}/${streamId}.${ext}`;
    }
  }

  buildM3UUrl(): string {
    return `${this.serverUrl}/get.php?username=${this.username}&password=${this.password}&type=m3u_plus&output=ts`;
  }
}
