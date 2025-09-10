import { ContentItem } from "@/types/xtream";
import { Star } from "lucide-react";

interface ContentGridProps {
  title: string;
  content: ContentItem[];
  onContentClick: (content: ContentItem) => void;
  isLoading?: boolean;
}

export function ContentGrid({ title, content, onContentClick, isLoading }: ContentGridProps) {
  if (isLoading) {
    return (
      <section className="mb-12" data-testid={`section-${title.toLowerCase().replace(' ', '-')}`}>
        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
          <div className="w-1 h-8 bg-primary rounded"></div>
          <span>{title}</span>
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg animate-pulse">
              <div className="w-full h-48 bg-muted rounded-t-lg"></div>
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!content.length) {
    return (
      <section className="mb-12" data-testid={`section-${title.toLowerCase().replace(' ', '-')}`}>
        <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
          <div className="w-1 h-8 bg-primary rounded"></div>
          <span>{title}</span>
        </h2>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No content available in this category</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12" data-testid={`section-${title.toLowerCase().replace(' ', '-')}`}>
      <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
        <div className="w-1 h-8 bg-primary rounded"></div>
        <span>{title}</span>
      </h2>
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
        {content.map((item) => (
          <div
            key={item.id}
            className="content-card bg-card rounded-lg overflow-hidden cursor-pointer"
            onClick={() => onContentClick(item)}
            data-testid={`content-card-${item.id}`}
          >
            {item.poster ? (
              <img 
                src={item.poster} 
                alt={item.title}
                className="w-full h-48 object-cover"
                data-testid={`content-poster-${item.id}`}
              />
            ) : (
              <div className="w-full h-48 bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">No Image</span>
              </div>
            )}
            <div className="p-3">
              <h3 className="font-semibold text-sm truncate" data-testid={`content-title-${item.id}`}>
                {item.title}
              </h3>
              {item.year && (
                <p className="text-xs text-muted-foreground" data-testid={`content-year-${item.id}`}>
                  {item.year}
                </p>
              )}
              {item.rating && typeof item.rating === 'number' && item.rating > 0 && (
                <div className="flex items-center space-x-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-muted-foreground" data-testid={`content-rating-${item.id}`}>
                    {item.rating.toFixed(1)}
                  </span>
                </div>
              )}
              {item.type === 'live' && (
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-xs text-muted-foreground">LIVE</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
