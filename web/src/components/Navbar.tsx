import React from 'react';
import { Home, Box, Play, BookOpen, Timer, User } from 'lucide-react';
import { SoundEngine } from '../utils/audio';

export type ScreenId = 'home' | 'sandbox' | 'scanner' | 'manual' | 'solveResult' | 'stepByStep' | 'academy' | 'timer' | 'profile';

interface NavbarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, target: 'home' as ScreenId },
    { id: 'sandbox', label: '3D Cube', icon: Box, target: 'sandbox' as ScreenId },
    { id: 'solve', label: 'Solve', icon: Play, target: 'manual' as ScreenId },
    { id: 'academy', label: 'Learn', icon: BookOpen, target: 'academy' as ScreenId },
    { id: 'timer', label: 'Timer', icon: Timer, target: 'timer' as ScreenId },
    { id: 'profile', label: 'Profile', icon: User, target: 'profile' as ScreenId },
  ];

  const handleNav = (target: ScreenId) => {
    SoundEngine.playClickSound();
    onNavigate(target);
  };

  const isActive = (id: string, target?: ScreenId) => {
    if (id === 'solve') {
      return ['scanner', 'manual', 'solveResult', 'stepByStep'].includes(currentScreen);
    }
    return currentScreen === id || (target && currentScreen === target);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[calc(env(safe-area-inset-bottom,6px)+6px)] pt-1 pointer-events-none">
      <div className="max-w-md mx-auto bg-cyber-card/90 backdrop-blur-xl border border-cyber-border/80 rounded-2xl p-1 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id, item.target);
          const target = item.target || (item.id as ScreenId);

          return (
            <button
              key={item.id}
              onClick={() => handleNav(target)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 min-w-[48px] min-h-[46px] ${
                active
                  ? 'text-cyber-cyan scale-105'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {active && (
                <div className="absolute inset-0 bg-cyber-cyan/15 rounded-xl border border-cyber-cyan/30 animate-pulse-glow" />
              )}
              <Icon size={18} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
              <span className={`text-[9px] mt-0.5 tracking-wider ${active ? 'font-bold text-cyber-cyan' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
