import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { XtreamConfig } from "@/types/xtream";
import { XtreamAPI } from "@/lib/xtream-api";

interface SetupModalProps {
  isOpen: boolean;
  onSave: (config: XtreamConfig) => void;
  onClose: () => void;
}

export function SetupModal({ isOpen, onSave, onClose }: SetupModalProps) {
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const config: XtreamConfig = {
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        password: password.trim(),
      };

      // Test the connection
      const api = new XtreamAPI(config);
      await api.authenticate();

      onSave(config);
      toast({
        title: "Success",
        description: "Connected to Xtream server successfully!",
      });
      
      // Reset form
      setServerUrl("");
      setUsername("");
      setPassword("");
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to Xtream server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setup Xtream Codes</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">Server URL</Label>
            <Input
              id="serverUrl"
              type="url"
              placeholder="http://your-server:port"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              data-testid="input-server-url"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-password"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            data-testid="button-connect"
          >
            {isLoading ? "Connecting..." : "Connect"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
