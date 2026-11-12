import React, { useState } from 'react';
import { BookOpen, CheckCircle, ChevronRight, Play, Award, HelpCircle, Sparkles, RotateCcw, ArrowLeft } from 'lucide-react';
import { CubeState, StandardMove, UserStats } from '../types/cube';
import { ThreeCube } from '../engine/ThreeCube';
import { createSolvedCube, applyMove, cloneCubeState } from '../engine/cubeState';
import { SoundEngine } from '../utils/audio';
import { StorageService } from '../utils/storage';
import confetti from 'canvas-confetti';

interface AcademyLesson {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  xpReward: number;
  explanation: string;
  algorithmName?: string;
  algorithmNotation?: string;
  demoMoves: StandardMove[];
  instructions: string[];
}

export const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    id: 'lesson_1',
    number: 1,
    title: 'Meet Your Cube',
    subtitle: 'Anatomy, centers, edges & corners',
    xpReward: 80,
    explanation: 'A 3x3 Rubik\'s Cube has 6 faces and 3 types of pieces: 6 Center pieces (fixed in place and define the face color), 12 Edge pieces (2 colors each), and 8 Corner pieces (3 colors each). Center pieces NEVER change relative positions!',
    demoMoves: ['R', 'U', 'R', 'U'],
    instructions: [
      'White is opposite to Yellow',
      'Green is opposite to Blue',
      'Red is opposite to Orange',
      'Center stickers tell you which color that entire face will become'
    ]
  },
  {
    id: 'lesson_2',
    number: 2,
    title: 'Cube Notation',
    subtitle: 'Mastering R, U, F, L, D, B',
    xpReward: 80,
    explanation: 'Cube moves are written in standard WCA notation. A single letter means rotate that face 90° clockwise. An apostrophe (\') means counter-clockwise (prime). A \'2\' means rotate 180° (double turn).',
    demoMoves: ['R', "R'", 'U', "U'", 'F', "F'"],
    instructions: [
      'R / R\' : Right face clockwise / counter-clockwise',
      'U / U\' : Top (Up) face clockwise / counter-clockwise',
      'F / F\' : Front face clockwise / counter-clockwise',
      'L / L\' : Left face clockwise / counter-clockwise',
      'D / D\' : Bottom (Down) face',
      'B / B\' : Back face'
    ]
  },
  {
    id: 'lesson_3',
    number: 3,
    title: 'The Daisy & White Cross',
    subtitle: 'Stage 1: Building the base cross',
    xpReward: 100,
    explanation: 'First, place 4 white edges around the yellow center to form a "Daisy". Then align each edge with its matching side center color (Red, Green, Orange, Blue) and rotate it 180° (F2, R2, etc.) down to create the White Cross on bottom!',
    algorithmName: 'Daisy to Cross',
    algorithmNotation: "F2 R2 B2 L2",
    demoMoves: ['F2', 'R2', 'B2', 'L2'],
    instructions: [
      'Find edges containing White',
      'Match the side sticker of the white edge with its center',
      'Turn that face 180° (e.g. F2) to lock into the white bottom'
    ]
  },
  {
    id: 'lesson_4',
    number: 4,
    title: 'First Layer Corners',
    subtitle: 'Stage 2: The "Sexy Move"',
    xpReward: 100,
    explanation: 'To insert the 4 white corner pieces into the bottom layer, we use the most famous 4-move cubing sequence in the world: the "Sexy Move" (R U R\' U\'). Repeat it 1 to 5 times until the corner slots cleanly into place!',
    algorithmName: 'The Sexy Move',
    algorithmNotation: "R U R' U'",
    demoMoves: ['R', 'U', "R'", "U'"],
    instructions: [
      'Position a white corner piece in top-right above its target slot',
      'Execute R U R\' U\'',
      'Repeat until the white sticker faces downward into the white layer',
      'Rotate U to align the next corner slot'
    ]
  },
  {
    id: 'lesson_5',
    number: 5,
    title: 'Middle Layer Edges',
    subtitle: 'Stage 3: Solving the second layer',
    xpReward: 120,
    explanation: 'Solve the 4 middle-layer edge pieces without disturbing the first layer! Match the edge color on top with its center, then send it either right or left using one of two mirror algorithms.',
    algorithmName: 'Right Edge Insert',
    algorithmNotation: "U R U' R' U' F' U F",
    demoMoves: ['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F'],
    instructions: [
      'Look for top layer edges that DO NOT have Yellow',
      'Align the front sticker with matching center color',
      'If target slot is on the Right: execute U R U\' R\' U\' F\' U F',
      'If target slot is on the Left: execute U\' L\' U L U F U\' F\''
    ]
  },
  {
    id: 'lesson_6',
    number: 6,
    title: 'The Yellow Cross',
    subtitle: 'Stage 4: F R U R\' U\' F\'',
    xpReward: 120,
    explanation: 'Now flip the cube so Yellow is on top. You will see a Dot, an \'L\' shape, a horizontal Line, or the completed Cross. Use F R U R\' U\' F\' to advance to the next shape until the yellow cross is formed!',
    algorithmName: 'F R U R\' U\' F\'',
    algorithmNotation: "F R U R' U' F'",
    demoMoves: ['F', 'R', 'U', "R'", "U'", "F'"],
    instructions: [
      'Dot: Perform algorithm to get an \'L\' shape',
      'L-Shape: Put \'L\' in top-left corner, perform algorithm to get horizontal Line',
      'Horizontal Line: Perform algorithm to get Yellow Cross!'
    ]
  },
  {
    id: 'lesson_7',
    number: 7,
    title: 'Yellow Face (Sune)',
    subtitle: 'Stage 5: Orienting all top corners',
    xpReward: 140,
    explanation: 'Once you have the yellow cross, orient all corners so the entire top face becomes solid yellow. The legendary "Sune" algorithm rotates 3 corners while preserving the cross!',
    algorithmName: 'The Sune Algorithm',
    algorithmNotation: "R U R' U R U2 R'",
    demoMoves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"],
    instructions: [
      'Hold the "fish" head pointing toward the bottom-left corner',
      'Execute R U R\' U R U2 R\'',
      'If corners are not oriented on first try, repeat Sune once more'
    ]
  },
  {
    id: 'lesson_8',
    number: 8,
    title: 'Position Last Corners',
    subtitle: 'Stage 6: Permute Corners (A-Perm)',
    xpReward: 140,
    explanation: 'Look for two corners with the same color on one face ("Headlights"). Put them in the back, then execute the corner permutation algorithm to lock all 4 corners into their correct positions!',
    algorithmName: 'Headlights / T-Perm',
    algorithmNotation: "R U R' U' R' F R2 U' R' U' R U R' F'",
    demoMoves: ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"],
    instructions: [
      'Find two matching corner colors on one side (Headlights)',
      'Place headlights at the BACK',
      'Execute the algorithm to solve all four corners'
    ]
  },
  {
    id: 'lesson_9',
    number: 9,
    title: 'Solve Final Edges',
    subtitle: 'Stage 7: U-Perm & Victory!',
    xpReward: 160,
    explanation: 'The final step! Only 3 or 4 edges need to cycle into position. Put the one solved bar in the back, then execute the U-Perm to finish the entire Rubik\'s Cube!',
    algorithmName: 'The U-Perm',
    algorithmNotation: "R U' R U R U R U' R' U' R2",
    demoMoves: ['R', "U'", 'R', 'U', 'R', 'U', 'R', "U'", "R'", "U'", 'R2'],
    instructions: [
      'Hold the fully solved color face in the BACK',
      'Execute R U\' R U R U R U\' R\' U\' R2',
      'If edges cycled the other way, execute once more to FINISH the cube!'
    ]
  }
];

export const GLOSSARY_ITEMS = [
  { term: 'CFOP', def: 'The world\'s most popular speedcubing method: Cross, F2L, OLL, PLL.' },
  { term: 'F2L', def: 'First Two Layers: Solving the first layer corners and middle edges simultaneously.' },
  { term: 'OLL', def: 'Orientation of the Last Layer: Making the entire top face solid yellow.' },
  { term: 'PLL', def: 'Permutation of the Last Layer: Arranging the yellow pieces into their solved slots.' },
  { term: 'Sexy Move', def: 'The foundational 4-move sequence: R U R\' U\'.' },
  { term: 'Sune', def: 'A classic 7-move OLL algorithm: R U R\' U R U2 R\'.' },
  { term: 'Ao5', def: 'Average of 5: Discards best and worst times, averages the middle 3.' },
  { term: 'WCA', def: 'World Cube Association: Official governing body for Rubik\'s Cube speedsolving.' }
];

interface AcademyScreenProps {
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
}

export const AcademyScreen: React.FC<AcademyScreenProps> = ({ userStats, onStatsUpdated }) => {
  const [selectedLesson, setSelectedLesson] = useState<AcademyLesson | null>(null);
  const [activeTab, setActiveTab] = useState<'lessons' | 'glossary'>('lessons');

  // Interactive 3D lesson demo state
  const [demoCube, setDemoCube] = useState<CubeState>(createSolvedCube);
  const [activeDemoMove, setActiveDemoMove] = useState<StandardMove | null>(null);

  const completedSet = new Set(userStats.completedLessonIds || []);

  const openLesson = (lesson: AcademyLesson) => {
    SoundEngine.playClickSound();
    setSelectedLesson(lesson);
    setDemoCube(createSolvedCube());
    setActiveDemoMove(null);
  };

  const handlePlayDemoAlgorithm = async () => {
    if (!selectedLesson) return;
    SoundEngine.playClickSound();
    let s = createSolvedCube();
    setDemoCube(s);

    for (const m of selectedLesson.demoMoves) {
      setActiveDemoMove(m);
      s = applyMove(s, m);
      setDemoCube(s);
      await new Promise((r) => setTimeout(r, 450));
    }
    SoundEngine.playSuccessFanfare();
  };

  const handleCompleteLesson = () => {
    if (!selectedLesson) return;
    SoundEngine.playLevelUpFanfare();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    const updated = { ...userStats };
    if (!updated.completedLessonIds.includes(selectedLesson.id)) {
      updated.completedLessonIds.push(selectedLesson.id);
      const { stats } = StorageService.addXp(selectedLesson.xpReward);
      onStatsUpdated(stats);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-cyber-bg text-white pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] text-cyber-cyan font-bold uppercase tracking-wider">
            Beginner Learning Academy
          </span>
          <h1 className="text-xl font-black text-white">Master the 3x3</h1>
        </div>

        <div className="flex items-center gap-1 bg-cyber-card p-1 rounded-xl border border-cyber-border text-xs">
          <button
            onClick={() => {
              SoundEngine.playClickSound();
              setActiveTab('lessons');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'lessons' ? 'bg-cyber-cyan text-black' : 'text-gray-400'
            }`}
          >
            Lessons ({completedSet.size}/9)
          </button>
          <button
            onClick={() => {
              SoundEngine.playClickSound();
              setActiveTab('glossary');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'glossary' ? 'bg-cyber-cyan text-black' : 'text-gray-400'
            }`}
          >
            Glossary
          </button>
        </div>
      </div>

      {/* Progress banner */}
      <div className="bg-gradient-to-r from-cyber-card via-cyber-surface to-cyber-card border border-cyber-border rounded-2xl p-3.5 mb-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyber-purple/20 border border-cyber-purple/50 flex items-center justify-center text-cyber-purple">
            <Award size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Academy Progress</div>
            <div className="text-[10px] text-gray-400">
              {completedSet.size} of 9 lessons completed
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-black text-cyber-yellow">
            +{completedSet.size * 100} XP
          </span>
          <div className="w-20 h-1.5 bg-cyber-surface rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-cyber-purple rounded-full"
              style={{ width: `${(completedSet.size / 9) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {activeTab === 'lessons' ? (
        <div className="space-y-3">
          {ACADEMY_LESSONS.map((lesson) => {
            const isCompleted = completedSet.has(lesson.id);

            return (
              <button
                key={lesson.id}
                onClick={() => openLesson(lesson)}
                className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-98 flex items-center justify-between ${
                  isCompleted
                    ? 'bg-cyber-card/60 border-cyber-green/40 hover:border-cyber-green'
                    : 'bg-cyber-card/90 border-cyber-border hover:border-cyber-cyan'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                      isCompleted
                        ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/50'
                        : 'bg-cyber-surface text-gray-300 border border-cyber-border'
                    }`}
                  >
                    {isCompleted ? <CheckCircle size={20} /> : lesson.number}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{lesson.title}</h3>
                      {lesson.algorithmName && (
                        <span className="text-[9px] bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/40 px-1.5 py-0.2 rounded font-semibold">
                          Algorithm
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{lesson.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-cyber-yellow">
                    +{lesson.xpReward} XP
                  </span>
                  <ChevronRight size={16} className="text-gray-500" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Glossary & Cheat Sheet */
        <div className="space-y-3">
          {GLOSSARY_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="bg-cyber-card/80 border border-cyber-border rounded-2xl p-4 shadow-lg"
            >
              <div className="text-sm font-black text-cyber-cyan tracking-wide mb-1">
                {item.term}
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{item.def}</p>
            </div>
          ))}
        </div>
      )}

      {/* Individual Lesson Interactive Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4">
          <div className="bg-cyber-card border-t sm:border border-cyber-border rounded-t-3xl sm:rounded-3xl p-5 max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setSelectedLesson(null)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white"
              >
                <ArrowLeft size={16} /> Close
              </button>

              <span className="text-xs font-bold text-cyber-cyan">
                Lesson {selectedLesson.number} of 9
              </span>
            </div>

            <h2 className="text-lg font-black text-white mb-1">{selectedLesson.title}</h2>
            <p className="text-xs text-cyber-purple font-semibold mb-3">
              {selectedLesson.subtitle}
            </p>

            <p className="text-xs text-gray-300 leading-relaxed mb-4 bg-cyber-surface/60 p-3 rounded-xl border border-cyber-border">
              {selectedLesson.explanation}
            </p>

            {/* Algorithm Badge */}
            {selectedLesson.algorithmNotation && (
              <div className="bg-cyber-surface border border-cyber-cyan/40 rounded-2xl p-3 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Algorithm</span>
                  <div className="text-sm font-black text-cyber-cyan tracking-wider">
                    {selectedLesson.algorithmNotation}
                  </div>
                </div>
                <button
                  onClick={handlePlayDemoAlgorithm}
                  className="px-3 py-1.5 rounded-xl bg-cyber-cyan text-black font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-95"
                >
                  <Play size={14} className="fill-black" /> Run 3D Demo
                </button>
              </div>
            )}

            {/* Interactive 3D Cube Demo */}
            <div className="w-full h-52 rounded-2xl bg-black/50 border border-cyber-border relative overflow-hidden mb-4">
              <ThreeCube
                cubeState={demoCube}
                activeMove={activeDemoMove}
                interactive={true}
                autoRotate={false}
                skin="cyberGlow"
                showControls={false}
              />
            </div>

            {/* Step-by-step bullet instructions */}
            <div className="space-y-2 mb-5">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Step-by-Step Execution:
              </span>
              {selectedLesson.instructions.map((inst, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-gray-300 bg-cyber-surface/40 p-2.5 rounded-xl border border-cyber-border/40"
                >
                  <span className="w-5 h-5 rounded-full bg-cyber-purple/20 text-cyber-purple font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{inst}</span>
                </div>
              ))}
            </div>

            {/* Complete Lesson Action */}
            <button
              onClick={handleCompleteLesson}
              disabled={completedSet.has(selectedLesson.id)}
              className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                completedSet.has(selectedLesson.id)
                  ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/40'
                  : 'bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-purple text-white shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:brightness-110 active:scale-98'
              }`}
            >
              <Sparkles size={16} />
              {completedSet.has(selectedLesson.id)
                ? 'Lesson Mastered (+XP Awarded)'
                : `Complete Lesson & Claim +${selectedLesson.xpReward} XP`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
