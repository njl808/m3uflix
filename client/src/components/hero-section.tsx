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
    <section className="relative h-96 md:h-[500px] overflow-hidden" data-testid="hero-section">
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10"></div>
      
      {content.poster && (
        <img 
          src={content.poster} 
          alt={content.title}
          className="w-full h-full object-cover"
          data-testid="hero-background"
        />
      )}
      
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-lg">
            <h1 className="text-4xl md:text-6xl font-bold mb-4" data-testid="hero-title">
              {content.title}
            </h1>
            {content.description && (
              <p className="text-lg md:text-xl text-muted-foreground mb-6" data-testid="hero-description">
                {content.description}
              </p>
            )}
            <div className="flex space-x-4">
              {featuredContent && (
                <Button 
                  className="bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90"
                  onClick={() => onPlay(content)}
                  data-testid="button-play"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Play
                </Button>
              )}
              {featuredContent && (
                <Button 
                  variant="secondary"
                  className="px-8 py-3 font-semibold"
                  onClick={() => onAddToList(content)}
                  data-testid="button-add-list"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  My List
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
