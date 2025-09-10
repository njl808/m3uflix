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

  buildStreamUrl(streamId: number, type: 'live' | 'movie' | 'series', extension: string = 'ts'): string {
    // Use the backend proxy for streaming to avoid CORS issues
    const ext = type === 'live' ? extension : 'mp4';
    const typeMap = {
      'live': 'live',
      'movie': 'movie', 
      'series': 'series'
    };
    
    return `/api/stream/${typeMap[type]}/${this.username}/${this.password}/${streamId}.${ext}?server=${encodeURIComponent(this.serverUrl)}`;
  }

  buildM3UUrl(): string {
    return `${this.serverUrl}/get.php?username=${this.username}&password=${this.password}&type=m3u_plus&output=ts`;
  }
}
