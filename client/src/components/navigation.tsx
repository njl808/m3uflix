import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Shield } from "lucide-react";
import { useLocation } from "wouter";

interface NavigationProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  onSettingsClick: () => void;
  onSearch: (query: string) => void;
}

export function Navigation({ currentSection, onSectionChange, onSettingsClick, onSearch }: NavigationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'live', label: 'Live TV' },
    { id: 'movies', label: 'Movies' },
    { id: 'series', label: 'Series' },
    { id: 'favorites', label: 'My List' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 navbar-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="text-2xl font-bold text-primary" data-testid="app-title">
              IPTV Player
            </div>
            <div className="hidden md:flex space-x-6">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item transition-colors ${
                    currentSection === item.id
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                  onClick={() => onSectionChange(item.id)}
                  data-testid={`nav-${item.id}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-64"
                data-testid="input-search"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/admin')}
              data-testid="button-admin"
              title="M3U Admin Panel"
            >
              <Shield className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              data-testid="button-settings"
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
