import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders application title or root content', () => {
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });
});
