import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TypingTest from './TypingTest';
import { typingAPI } from '../utils/api';

// Mock API
jest.mock('../utils/api', () => ({
  typingAPI: {
    getParagraph: jest.fn(),
    saveResult: jest.fn()
  }
}));

// Mock Recharts for clean unit testing
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-container">{children}</div>,
  AreaChart: ({ children }) => <div>{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  CartesianGrid: () => <div />
}));

describe('TypingTest Component & Engine', () => {
  const sampleParagraph = 'The quick brown fox jumps over the lazy dog.';

  beforeEach(() => {
    jest.clearAllMocks();
    typingAPI.getParagraph.mockResolvedValue({
      data: { paragraph: sampleParagraph }
    });
    typingAPI.saveResult.mockResolvedValue({
      data: { message: 'Result saved successfully' }
    });
  });

  test('1. Renders typing test arena and loads paragraph', async () => {
    const { unmount } = render(
      <BrowserRouter>
        <TypingTest />
      </BrowserRouter>
    );

    // Initial loading indicator
    expect(screen.getByText(/loading typing challenge/i)).toBeTruthy();

    // After resolution, arena is present
    await waitFor(() => {
      expect(screen.getByText(/speed typing arena/i)).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: /start test/i })).toBeTruthy();
    expect(screen.getByText(/time mode:/i)).toBeTruthy();
    unmount();
  });

  test('2. Allows selecting different timer modes before test start', async () => {
    const { unmount } = render(
      <BrowserRouter>
        <TypingTest />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/speed typing arena/i)).toBeTruthy();
    });

    // Click 15s chip
    const chip15 = screen.getByRole('button', { name: /⚡ 15s/i });
    fireEvent.click(chip15);
    expect(screen.getByRole('button', { name: /start test \(15s\)/i })).toBeTruthy();

    // Click 30s chip
    const chip30 = screen.getByRole('button', { name: /⚡ 30s/i });
    fireEvent.click(chip30);
    expect(screen.getByRole('button', { name: /start test \(30s\)/i })).toBeTruthy();
    unmount();
  });

  test('3. Starts test and handles keystroke input', async () => {
    const { unmount } = render(
      <BrowserRouter>
        <TypingTest />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/speed typing arena/i)).toBeTruthy();
    });

    const startBtn = screen.getByRole('button', { name: /start test/i });
    fireEvent.click(startBtn);

    // Live HUD appears
    expect(screen.getByText(/live wpm/i)).toBeTruthy();
    expect(screen.getByText(/progress/i)).toBeTruthy();

    // Type first character 'T' (correct)
    fireEvent.keyDown(window, { key: 'T' });
    // Type second character 'h' (correct)
    fireEvent.keyDown(window, { key: 'h' });
    // Type backspace
    fireEvent.keyDown(window, { key: 'Backspace' });

    // Clean up
    unmount();
  });
});
