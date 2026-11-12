import { CustomizationSettings, SolveRecord, UserStats } from '../types/cube';

const SOLVES_KEY = 'cuberush_solves';
const STATS_KEY = 'cuberush_stats';
const SETTINGS_KEY = 'cuberush_settings';
const CHALLENGES_KEY = 'cuberush_challenges';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  xpReward: number;
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_solve', title: 'First Victory', description: 'Solve your first Rubik\'s cube using the app', icon: '🏆', unlocked: false, xpReward: 100 },
  { id: 'sub_60', title: 'Minute Master', description: 'Record a speed solve under 60 seconds', icon: '⚡', unlocked: false, xpReward: 150 },
  { id: 'sub_30', title: 'Speed Demon', description: 'Record a speed solve under 30 seconds', icon: '🔥', unlocked: false, xpReward: 300 },
  { id: 'sub_20', title: 'Supersonic', description: 'Record a speed solve under 20 seconds', icon: '🚀', unlocked: false, xpReward: 500 },
  { id: 'streak_7', title: 'Unstoppable Streak', description: 'Maintain a 7-day solving streak', icon: '📅', unlocked: false, xpReward: 200 },
  { id: 'academy_grad', title: 'Academy Graduate', description: 'Complete all 9 lessons in the Learning Academy', icon: '🎓', unlocked: false, xpReward: 350 },
  { id: 'scramble_50', title: 'Cube Addict', description: 'Complete 50 speedcubing solves', icon: '💎', unlocked: false, xpReward: 250 },
  { id: 'camera_scanner', title: 'Cyber Eye', description: 'Scan and solve a physical cube using the camera scanner', icon: '📷', unlocked: false, xpReward: 120 }
];

export const LEVEL_TIERS = [
  { level: 1, title: 'Novice Cuber', minXp: 0 },
  { level: 2, title: 'Rookie Rotator', minXp: 200 },
  { level: 3, title: 'Cubing Explorer', minXp: 600 },
  { level: 4, title: 'Speed Cuber', minXp: 1400 },
  { level: 5, title: 'Cube Master', minXp: 3000 },
  { level: 6, title: 'Rubik Legend', minXp: 6000 }
];

export function calculateLevel(xp: number): { level: number; title: string; currentLevelXp: number; nextLevelXp: number; progress: number } {
  let tierIndex = 0;
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_TIERS[i].minXp) {
      tierIndex = i;
      break;
    }
  }

  const currentTier = LEVEL_TIERS[tierIndex];
  const nextTier = LEVEL_TIERS[tierIndex + 1] || { minXp: currentTier.minXp + 4000 };

  const currentLevelXp = xp - currentTier.minXp;
  const nextLevelXp = nextTier.minXp - currentTier.minXp;
  const progress = Math.min(1, Math.max(0, currentLevelXp / nextLevelXp));

  return {
    level: currentTier.level,
    title: currentTier.title,
    currentLevelXp,
    nextLevelXp,
    progress
  };
}

export const StorageService = {
  getSolves(): SolveRecord[] {
    try {
      const data = localStorage.getItem(SOLVES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSolve(solve: SolveRecord): { isNewPb: boolean; newStats: UserStats } {
    const solves = this.getSolves();
    solves.unshift(solve);
    try {
      localStorage.setItem(SOLVES_KEY, JSON.stringify(solves));
    } catch {
      // ignore
    }

    const currentStats = this.getUserStats();
    let isNewPb = false;

    if (solve.penalty !== 'dnf') {
      const effectiveTime = solve.penalty === 'plusTwo' ? solve.timeMs + 2000 : solve.timeMs;
      if (currentStats.bestSingleMs === null || effectiveTime < currentStats.bestSingleMs) {
        currentStats.bestSingleMs = effectiveTime;
        isNewPb = true;
      }
    }

    // Calculate Ao5 and Ao12
    const validTimes = solves
      .slice(0, 12)
      .map(s => s.penalty === 'dnf' ? Infinity : s.penalty === 'plusTwo' ? s.timeMs + 2000 : s.timeMs);

    if (validTimes.length >= 5) {
      const last5 = validTimes.slice(0, 5);
      const sorted5 = [...last5].sort((a, b) => a - b);
      if (sorted5[4] !== Infinity) {
        // Average of middle 3
        const ao5 = Math.round((sorted5[1] + sorted5[2] + sorted5[3]) / 3);
        currentStats.currentAo5Ms = ao5;
        if (!currentStats.bestAo5Ms || ao5 < currentStats.bestAo5Ms) {
          currentStats.bestAo5Ms = ao5;
        }
      }
    }

    if (validTimes.length >= 12) {
      const sorted12 = [...validTimes].sort((a, b) => a - b);
      if (sorted12[11] !== Infinity) {
        // Average of middle 10
        const sumMiddle10 = sorted12.slice(1, 11).reduce((acc, v) => acc + v, 0);
        const ao12 = Math.round(sumMiddle10 / 10);
        currentStats.currentAo12Ms = ao12;
        if (!currentStats.bestAo12Ms || ao12 < currentStats.bestAo12Ms) {
          currentStats.bestAo12Ms = ao12;
        }
      }
    }

    currentStats.totalSolves = solves.length;
    currentStats.xp += isNewPb ? 150 : 50;

    const levelInfo = calculateLevel(currentStats.xp);
    currentStats.level = levelInfo.level;
    currentStats.levelTitle = levelInfo.title;

    this.saveUserStats(currentStats);
    return { isNewPb, newStats: currentStats };
  },

  deleteSolve(id: string): SolveRecord[] {
    const solves = this.getSolves().filter(s => s.id !== id);
    try {
      localStorage.setItem(SOLVES_KEY, JSON.stringify(solves));
    } catch {
      // ignore
    }
    return solves;
  },

  getUserStats(): UserStats {
    try {
      const data = localStorage.getItem(STATS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }

    const defaultStats: UserStats = {
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
    this.saveUserStats(defaultStats);
    return defaultStats;
  },

  saveUserStats(stats: UserStats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // ignore
    }
  },

  addXp(amount: number): { stats: UserStats; leveledUp: boolean } {
    const stats = this.getUserStats();
    const oldLevel = stats.level;
    stats.xp += amount;
    const levelInfo = calculateLevel(stats.xp);
    stats.level = levelInfo.level;
    stats.levelTitle = levelInfo.title;
    this.saveUserStats(stats);
    return { stats, leveledUp: stats.level > oldLevel };
  },

  getAchievements(): Achievement[] {
    const stats = this.getUserStats();
    return INITIAL_ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: stats.unlockedAchievementIds.includes(ach.id)
    }));
  },

  unlockAchievement(id: string): boolean {
    const stats = this.getUserStats();
    if (!stats.unlockedAchievementIds.includes(id)) {
      stats.unlockedAchievementIds.push(id);
      const ach = INITIAL_ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        stats.xp += ach.xpReward;
        const levelInfo = calculateLevel(stats.xp);
        stats.level = levelInfo.level;
        stats.levelTitle = levelInfo.title;
      }
      this.saveUserStats(stats);
      return true;
    }
    return false;
  },

  getDailyChallenges(): DailyChallenge[] {
    const today = new Date().toISOString().split('T')[0];
    try {
      const saved = localStorage.getItem(CHALLENGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === today) {
          return parsed.challenges;
        }
      }
    } catch {
      // ignore
    }

    const defaultChallenges: DailyChallenge[] = [
      { id: 'daily_solve_1', title: 'Daily Warmup', description: 'Complete 1 cube solve using the timer or solver', target: 1, current: 0, completed: false, xpReward: 60 },
      { id: 'daily_lesson_1', title: 'Sharpen Mind', description: 'Review or complete 1 academy lesson', target: 1, current: 0, completed: false, xpReward: 80 },
      { id: 'daily_algorithms_5', title: 'Algorithm Workout', description: 'Practice 5 scrambles or algorithm steps', target: 5, current: 0, completed: false, xpReward: 100 }
    ];

    try {
      localStorage.setItem(CHALLENGES_KEY, JSON.stringify({ date: today, challenges: defaultChallenges }));
    } catch {
      // ignore
    }

    return defaultChallenges;
  },

  getSettings(): CustomizationSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }

    const defaultSettings: CustomizationSettings = {
      theme: 'cyberpunk',
      skin: 'cyberGlow',
      background: 'gridSpace',
      soundEnabled: true,
      soundVolume: 0.8,
      hapticsEnabled: true,
      animationSpeed: 1.2,
      inspectionSeconds: 15
    };
    this.saveSettings(defaultSettings);
    return defaultSettings;
  },

  saveSettings(settings: CustomizationSettings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  },

  resetAllData() {
    localStorage.removeItem(SOLVES_KEY);
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(CHALLENGES_KEY);
  }
};
