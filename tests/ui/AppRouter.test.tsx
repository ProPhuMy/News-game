/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppRouter } from '../../src/client/ui/screens/AppRouter';

describe('AppRouter', () => {
  it('renders home screen by default in clean state', () => {
    render(<AppRouter />);
    expect(screen.getByText('NEWS TOWN')).toBeDefined();
    expect(screen.getByText('Play Solo')).toBeDefined();
  });
});
