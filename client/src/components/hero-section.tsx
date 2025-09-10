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
            className="w-full h-full object-cover"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
            {/* Main Info Card */}
            <div className="bg-black/70 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/20 shadow-2xl">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="capitalize bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                      {content.type === 'live' ? 'Live TV' : content.type === 'movie' ? 'Movie' : 'TV Series'}
                    </span>
                    {content.categoryId && content.categoryId !== '0' && (
                      <span className="text-white/60 text-sm">Category {content.categoryId}</span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-4xl font-bold text-white mb-3" data-testid="hero-title">
                    {content.title}
                  </h1>
                </div>

                {content.description && (
                  <p className="text-sm md:text-base text-white/80 leading-relaxed line-clamp-3" data-testid="hero-description">
                    {content.description}
                  </p>
                )}

                {featuredContent && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-xs text-white/60">
                      Featured content • Currently cycling through selected categories
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Card */}
            {featuredContent && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-2xl">
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
