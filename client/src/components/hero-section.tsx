import { Button } from "@/components/ui/button";
import { Play, Plus } from "lucide-react";
import { ContentItem } from "@/types/xtream";

interface HeroSectionProps {
  featuredContent?: ContentItem;
  onPlay: (content: ContentItem) => void;
  onAddToList: (content: ContentItem) => void;
}

export function HeroSection({ featuredContent, onPlay, onAddToList }: HeroSectionProps) {
  const defaultContent: ContentItem = {
    id: 'featured',
    title: 'Welcome to IPTV Player',
    description: 'Connect your Xtream Codes account to start watching live TV, movies, and series.',
    type: 'live',
    streamId: 0,
    categoryId: '0',
  };

  const content = featuredContent || defaultContent;

  return (
    <section 
      className="relative min-h-[70vh] flex items-end overflow-hidden"
      data-testid="hero-section"
    >
      {/* Background Banner */}
      <div className="absolute inset-0 z-0">
        {content.poster ? (
          <img 
            src={content.poster} 
            alt={content.title}
            className="w-full h-full object-cover object-top"
            data-testid="hero-banner"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-6xl mb-4">📺</div>
              <div className="text-lg">IPTV Player</div>
            </div>
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent"></div>
      </div>

      {/* Content Cards */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 items-end">
            {/* Box Cover */}
            <div className="flex justify-center lg:justify-start flex-shrink-0">
              <div className="relative group">
                {content.poster ? (
                  <img 
                    src={content.poster} 
                    alt={content.title}
                    className="w-48 h-72 md:w-56 md:h-84 object-cover rounded-xl shadow-2xl border-2 border-white/20"
                    data-testid="hero-poster"
                  />
                ) : (
                  <div className="w-48 h-72 md:w-56 md:h-84 bg-black/50 backdrop-blur-sm rounded-xl shadow-2xl border-2 border-white/20 flex items-center justify-center">
                    <div className="text-center text-white/60">
                      <div className="text-4xl mb-2">📺</div>
                      <div className="text-sm">No Image</div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>
            </div>

            {/* Main Info Card - 25% wider, reduced height */}
            <div className="flex-1 max-w-[125%] bg-black/70 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/20 shadow-2xl">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="capitalize bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                      {content.type === 'live' ? 'Live TV' : content.type === 'movie' ? 'Movie' : 'TV Series'}
                    </span>
                    {content.categoryId && content.categoryId !== '0' && (
                      <span className="text-white/60 text-xs">Category {content.categoryId}</span>
                    )}
                  </div>
                  <h1 className="text-xl md:text-3xl font-bold text-white mb-2" data-testid="hero-title">
                    {content.title}
                  </h1>
                  
                  {/* Additional Info Row */}
                  <div className="flex items-center gap-3 text-xs text-white/60 mb-2">
                    {content.year && (
                      <span className="flex items-center gap-1">
                        📅 {content.year}
                      </span>
                    )}
                    {content.rating && typeof content.rating === 'number' && content.rating > 0 && (
                      <span className="flex items-center gap-1">
                        ⭐ {content.rating.toFixed(1)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      🆔 {content.streamId}
                    </span>
                    {content.type === 'live' && (
                      <span className="flex items-center gap-1 text-primary">
                        🔴 LIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Movie/Series Summary */}
                {content.description && (
                  <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                    <h3 className="text-xs font-semibold text-white/90 mb-1">Plot Summary</h3>
                    <p className="text-xs md:text-sm text-white/80 leading-relaxed line-clamp-3" data-testid="hero-description">
                      {content.description}
                    </p>
                  </div>
                )}

                {featuredContent && (
                  <div className="pt-1 border-t border-white/20">
                    <p className="text-xs text-white/60">
                      Featured content • Currently cycling through selected categories
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Card */}
            {featuredContent && (
              <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-2xl">
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-primary text-primary-foreground px-6 py-3 text-base font-semibold hover:bg-primary/90 shadow-lg"
                      onClick={() => onPlay(content)}
                      data-testid="button-play"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Play Now
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full px-6 py-3 text-base font-semibold border-white/30 text-white hover:bg-white/10 hover:border-white/50"
                      onClick={() => onAddToList(content)}
                      data-testid="button-add-list"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add to My List
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
