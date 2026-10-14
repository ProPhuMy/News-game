/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaperBadge } from '../../src/client/ui/components/PaperBadge';

describe('PaperBadge', () => {
  it('renders paper name and includes both color styling and accessible icon', () => {
    render(<PaperBadge paperName="The Daily Gasp" color="red" />);
    expect(screen.getByText('The Daily Gasp')).toBeDefined();
    expect(screen.getByLabelText('Quill icon')).toBeDefined();
  });
});
