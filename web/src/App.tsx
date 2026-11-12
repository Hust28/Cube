import React, { useState, useEffect } from 'react';
import { CubeState, CustomizationSettings, SolveResult, UserStats } from './types/cube';
import { createSolvedCube } from './engine/cubeState';
import { RubiksCubeSolver } from './solver/rubiksSolver';
import { StorageService } from './utils/storage';
import { SoundEngine } from './utils/audio';

import { Navbar, ScreenId } from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomeScreen } from './screens/HomeScreen';
import { SandboxScreen } from './screens/SandboxScreen';
import { ScannerScreen } from './screens/ScannerScreen';
import { ManualInputScreen } from './screens/ManualInputScreen';
import { SolveResultScreen } from './screens/SolveResultScreen';
import { StepByStepScreen } from './screens/StepByStepScreen';
import { AcademyScreen } from './screens/AcademyScreen';
import { TimerScreen } from './screens/TimerScreen';
import { ProfileScreen } from './screens/ProfileScreen';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [activeCubeState, setActiveCubeState] = useState<CubeState>(createSolvedCube);
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null);
  const [isReady, setIsReady] = useState(false);

  const [userStats, setUserStats] = useState<UserStats>(() => {
    try {
      return StorageService.getUserStats();
    } catch {
      return {
        totalSolves: 0,
        bestSingleMs: null,
        currentAo5Ms: null,
        bestAo5Ms: null,
        currentAo12Ms: null,
        bestAo12Ms: null,
        streakDays: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        xp: 150,
        level: 1,
        levelTitle: 'Novice Cuber',
        completedLessonIds: [],
        unlockedAchievementIds: []
      };
    }
  });

  const [settings, setSettings] = useState<CustomizationSettings>(() => {
    try {
      return StorageService.getSettings();
    } catch {
      return {
        theme: 'cyberpunk',
        skin: 'cyberGlow',
        background: 'gridSpace',
        soundEnabled: true,
        soundVolume: 0.8,
        hapticsEnabled: true,
        animationSpeed: 1.2,
        inspectionSeconds: 15
      };
    }
  });

  const [dailyChallenges, setDailyChallenges] = useState(() => {
    try {
      return StorageService.getDailyChallenges();
    } catch {
      return [];
    }
  });

  // Ready signal
  useEffect(() => {
    setIsReady(true);
  }, []);

  // Initialize SoundEngine settings
  useEffect(() => {
    try {
      SoundEngine.soundEnabled = settings.soundEnabled;
      SoundEngine.volume = settings.soundVolume;
      SoundEngine.hapticsEnabled = settings.hapticsEnabled;

      const handleFirstTouch = () => {
        SoundEngine.init();
        window.removeEventListener('pointerdown', handleFirstTouch);
      };
      window.addEventListener('pointerdown', handleFirstTouch);

      return () => {
        window.removeEventListener('pointerdown', handleFirstTouch);
      };
    } catch {
      // ignore
    }
  }, [settings]);

  // Handle Android Native Back Button
  useEffect(() => {
    try {
      (window as unknown as { handleAndroidBackPressed: () => boolean }).handleAndroidBackPressed = () => {
        if (currentScreen === 'stepByStep') {
          setCurrentScreen('solveResult');
          return true;
        }
        if (currentScreen === 'solveResult') {
          setCurrentScreen('manual');
          return true;
        }
        if (['sandbox', 'scanner', 'manual', 'academy', 'timer', 'profile'].includes(currentScreen)) {
          setCurrentScreen('home');
          return true;
        }
        return false;
      };
    } catch {
      // ignore
    }
  }, [currentScreen]);

  // When a cube is scanned from camera or entered manually
  const handleSolveCube = (state: CubeState) => {
    setActiveCubeState(state);
    const result = RubiksCubeSolver.solve(state);
    setSolveResult(result);
    setCurrentScreen('solveResult');
  };

  const handleTutorialFinished = () => {
    try {
      const { stats } = StorageService.addXp(100);
      setUserStats(stats);
      StorageService.unlockAchievement('first_solve');
    } catch {
      // ignore
    }
  };

  const handleSkinChange = (skin: CustomizationSettings['skin']) => {
    const updated = { ...settings, skin };
    setSettings(updated);
    try {
      StorageService.saveSettings(updated);
    } catch {
      // ignore
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00F0FF] via-[#FF007F] to-[#8B5CF6] p-[2px] animate-spin mb-4">
          <div className="w-full h-full bg-[#090D16] rounded-[14px] flex items-center justify-center font-black text-[#00F0FF]">
            CR
          </div>
        </div>
        <h1 className="text-sm font-black text-white tracking-widest uppercase">CubeRush 3D</h1>
        <p className="text-[10px] text-gray-400 mt-1">Twist • Learn • Solve • Dominate</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-bg text-gray-100 flex flex-col font-sans selection:bg-cyber-cyan selection:text-black">
      <main className="flex-1 w-full">
        {currentScreen === 'home' && (
          <ErrorBoundary>
            <HomeScreen
              userStats={userStats}
              dailyChallenges={dailyChallenges}
              onNavigate={setCurrentScreen}
              onSetCubeState={setActiveCubeState}
            />
          </ErrorBoundary>
        )}

        {currentScreen === 'sandbox' && (
          <ErrorBoundary>
            <SandboxScreen
              cubeState={activeCubeState}
              onCubeStateChange={setActiveCubeState}
              onSolveRequested={handleSolveCube}
              settings={settings}
              onSkinChange={handleSkinChange}
            />
          </ErrorBoundary>
        )}

        {currentScreen === 'scanner' && (
          <ErrorBoundary>
            <ScannerScreen
              onCubeScanned={handleSolveCube}
              onCancel={() => setCurrentScreen('home')}
            />
          </ErrorBoundary>
        )}

        {currentScreen === 'manual' && (
          <ErrorBoundary>
            <ManualInputScreen
              initialState={activeCubeState}
              onSolveRequested={handleSolveCube}
              onCancel={() => setCurrentScreen('home')}
            />
          </ErrorBoundary>
        )}

        {currentScreen === 'solveResult' && solveResult && (
          <ErrorBoundary>
            <SolveResultScreen
              result={solveResult}
              onStartStepByStep={() => setCurrentScreen('stepByStep')}
              onBackToEdit={() => setCurrentScreen('manual')}
            />
          </ErrorBoundary>
        )}

        {currentScreen === 'stepByStep' && solveResult && (
          <ErrorBoundary>
            <StepByStepScreen
              initialCubeState={activeCubeState}
              solveResult={solveResult}
              onExit={() => setCurrentScreen('solveResult')}
              onFinished={handleTutorialFinished}
            />
          </ErrorBoundary>
        )}

        {currentScreen === 'academy' && (
          <ErrorBoundary>
            <AcademyScreen
              userStats={userStats}
              onStatsUpdated={setUserStats}
            />
          </ErrorBoundary>
        )}

        {currentScreen === 'timer' && (
          <ErrorBoundary>
            <TimerScreen
              userStats={userStats}
              onStatsUpdated={setUserStats}
            />
          </ErrorBoundary>
        )}

        {currentScreen === 'profile' && (
          <ErrorBoundary>
            <ProfileScreen
              userStats={userStats}
              settings={settings}
              onStatsUpdated={setUserStats}
              onSettingsUpdated={setSettings}
            />
          </ErrorBoundary>
        )}
      </main>

      {/* Floating Bottom Nav - visible on main navigation screens */}
      {!['scanner', 'stepByStep'].includes(currentScreen) && (
        <Navbar
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
        />
      )}
    </div>
  );
};
