import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XtreamEPG } from "@/types/xtream";

interface EPGModalProps {
  isOpen: boolean;
  onClose: () => void;
  epgData: XtreamEPG[] | { epg_listings: XtreamEPG[] } | null;
  channelName: string;
  onWatch: (programId: string) => void;
  isLoading?: boolean;
}

export function EPGModal({ isOpen, onClose, epgData, channelName, onWatch, isLoading }: EPGModalProps) {
  // Handle different EPG data formats
  const programs = Array.isArray(epgData) 
    ? epgData 
    : epgData && typeof epgData === 'object' && 'epg_listings' in epgData 
      ? epgData.epg_listings || []
      : [];
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden" data-testid="epg-modal">
        <DialogHeader>
          <DialogTitle>Program Guide - {channelName}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-96 p-2">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-muted rounded-lg animate-pulse">
                  <div className="w-20 h-10 bg-muted-foreground/20 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
                    <div className="h-3 bg-muted-foreground/20 rounded w-full"></div>
                  </div>
                  <div className="w-16 h-8 bg-muted-foreground/20 rounded"></div>
                </div>
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No program guide available for this channel</p>
            </div>
          ) : (
            <div className="space-y-4">
              {programs.map((program) => {
                const isCurrentlyPlaying = program.now_playing === 1;
                
                return (
                  <div 
                    key={program.id}
                    className={`flex items-center space-x-4 p-4 rounded-lg transition-colors ${
                      isCurrentlyPlaying 
                        ? 'bg-primary/20 border border-primary' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    data-testid={`epg-program-${program.id}`}
                  >
                    <div className="text-sm text-muted-foreground w-20">
                      <div data-testid={`program-start-${program.id}`}>
                        {formatTime(program.start_timestamp)}
                      </div>
                      <div data-testid={`program-end-${program.id}`}>
                        {formatTime(program.stop_timestamp)}
                      </div>
                      <div className="text-xs">
                        {formatDate(program.start_timestamp)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold flex items-center space-x-2">
                        <span data-testid={`program-title-${program.id}`}>
                          {program.title}
                        </span>
                        {isCurrentlyPlaying && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            NOW PLAYING
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`program-description-${program.id}`}>
                        {program.description || 'No description available'}
                      </p>
                    </div>
                    <Button
                      variant={isCurrentlyPlaying ? "default" : "outline"}
                      size="sm"
                      onClick={() => onWatch(program.id)}
                      data-testid={`button-watch-${program.id}`}
                    >
                      Watch
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
