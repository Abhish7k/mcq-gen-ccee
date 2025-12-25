'use client';

import { BrainCircuit, Home, BookOpen, PlayCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavMode = 'UPLOAD' | 'SELECTION' | 'BANK' | 'MOCK';

interface NavbarProps {
  currentMode: NavMode;
  hasActiveSession: boolean;
  onNavigate: (mode: NavMode) => void;
  onNewSession: () => void;
}

export function Navbar({ currentMode, hasActiveSession, onNavigate, onNewSession }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => hasActiveSession ? onNavigate('SELECTION') : onNavigate('UPLOAD')}
        >
          <div className="p-2 rounded-lg bg-blue-600 text-white group-hover:bg-blue-700 transition-colors">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">QuizGen AI</span>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Navigation Links */}
          <button
            onClick={() => onNewSession()} // Home actions
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer",
              currentMode === 'UPLOAD' 
                ? "bg-blue-50 text-blue-700" 
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Home className="w-4 h-4" />
            <span className="hidden md:inline">Home</span>
          </button>

          {hasActiveSession && (
            <>
              <button
                onClick={() => onNavigate('SELECTION')}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer",
                  currentMode === 'SELECTION' 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <BrainCircuit className="w-4 h-4" />
                <span className="hidden md:inline">Dashboard</span>
              </button>

              <button
                onClick={() => onNavigate('BANK')}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  currentMode === 'BANK' 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden md:inline">Question Bank</span>
              </button>

              <button
                onClick={() => onNavigate('MOCK')}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  currentMode === 'MOCK' 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <PlayCircle className="w-4 h-4" />
                <span className="hidden md:inline">Mock Test</span>
              </button>

              <div className="h-4 w-px bg-gray-300 mx-2 hidden md:block"></div>
            </>
          )}

          <button
            onClick={onNewSession}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden md:inline">New Session</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
