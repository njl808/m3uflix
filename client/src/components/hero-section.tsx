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
    <section className="bg-background/50 py-8 px-4 sm:px-6 lg:px-8" data-testid="hero-section">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Box Cover / Poster */}
          <div className="flex-shrink-0">
            <div className="relative group">
              {content.poster ? (
                <img 
                  src={content.poster} 
                  alt={content.title}
                  className="w-64 h-96 md:w-72 md:h-[432px] object-cover rounded-xl shadow-2xl border border-border/50"
                  data-testid="hero-poster"
                />
              ) : (
                <div className="w-64 h-96 md:w-72 md:h-[432px] bg-muted rounded-xl shadow-2xl border border-border/50 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="text-4xl mb-2">📺</div>
                    <div className="text-sm">No Image</div>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
          </div>

          {/* Content Info */}
          <div className="flex-1 min-w-0 pt-4">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3" data-testid="hero-title">
                  {content.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="capitalize bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                    {content.type === 'live' ? 'Live TV' : content.type === 'movie' ? 'Movie' : 'TV Series'}
                  </span>
                  {content.categoryId && content.categoryId !== '0' && (
                    <span className="text-muted-foreground">Category {content.categoryId}</span>
                  )}
                </div>
              </div>

              {content.description && (
                <div>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed" data-testid="hero-description">
                    {content.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {featuredContent && (
                  <Button 
                    className="bg-primary text-primary-foreground px-8 py-3 text-base font-semibold hover:bg-primary/90 shadow-lg"
                    onClick={() => onPlay(content)}
                    data-testid="button-play"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Play Now
                  </Button>
                )}
                {featuredContent && (
                  <Button 
                    variant="outline"
                    className="px-8 py-3 text-base font-semibold border-2 hover:bg-muted/50"
                    onClick={() => onAddToList(content)}
                    data-testid="button-add-list"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add to My List
                  </Button>
                )}
              </div>

              {/* Additional Info */}
              {featuredContent && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Featured content • Currently cycling through selected categories
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
