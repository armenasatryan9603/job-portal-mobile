import { useState, useEffect } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  connectionType: string | null;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>("wifi");

  useEffect(() => {
    // Simple network check
    const checkNetwork = async () => {
      try {
        // Try to fetch a simple request to check connectivity
        const response = await fetch("https://www.google.com", {
          method: "HEAD",
          mode: "no-cors",
        });
        setIsOnline(true);
        setIsConnected(true);
      } catch (error) {
        setIsOnline(false);
        setIsConnected(false);
      }
    };

    checkNetwork();
  }, []);

  return { isOnline, isConnected, connectionType };
};
