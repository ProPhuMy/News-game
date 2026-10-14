import React from 'react';
import { Button } from '../components/Button';

export interface ConnectionOverlayProps {
  status: 'connecting' | 'reconnecting' | 'disconnected';
  onRetry?: () => void;
}

export const ConnectionOverlay: React.FC<ConnectionOverlayProps> = ({ status, onRetry }) => {
  if (status === 'disconnected') {
    return (
      <div className="connection-modal-backdrop" data-testid="connection-overlay">
        <div className="connection-modal" role="dialog" aria-labelledby="conn-title">
          <h2 id="conn-title">Connection Lost</h2>
          <p>Attempting to reach the printing press...</p>
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              Reconnect Now
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <div className="reconnecting-pill" role="status">
        Reconnecting to room...
      </div>
    );
  }

  return null;
};
