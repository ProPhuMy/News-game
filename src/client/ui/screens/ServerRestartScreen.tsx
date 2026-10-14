import React from 'react';
import { Button } from '../components/Button';

export interface ServerRestartScreenProps {
  onReturnHome: () => void;
}

export const ServerRestartScreen: React.FC<ServerRestartScreenProps> = ({ onReturnHome }) => {
  return (
    <div className="screen-container server-restart-screen" data-testid="server-restart-screen">
      <div className="error-card">
        <h2>The presses stopped — this match ended</h2>
        <p>The server restarted or the room expired.</p>
        <Button variant="primary" onClick={onReturnHome}>
          Return to Home
        </Button>
      </div>
    </div>
  );
};
