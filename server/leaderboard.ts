import prisma from './database';
import { Leaderboards, GameType, LeaderboardEntry } from './types';

export async function getLeaderboards(): Promise<Leaderboards> {
  try {
    const [wins, results] = await Promise.all([
      prisma.winCount.findMany({
        orderBy: { count: 'desc' },
        take: 100
      }),
      prisma.result.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500
      })
    ]);
    
    // ... existing leaderboards structure ...
    const leaderboards: Leaderboards = {
      bingo: {}, typeracer: [], chess: {}, quiz: {}, sudoku: {}, 
      kakuro: {}, sixteencoins: {}, gridorder: {}, memory: {}, flappy: [], cssbattle: {},
      jumprace: {}, shapeme: {}, colormatcher: {}, mirrordraw: {}, archerstick: {}
    };

    // Process WinCounts
    wins.forEach(w => {
      const type = w.gameType as keyof Leaderboards;
      if (['bingo', 'chess', 'quiz', 'sudoku', 'kakuro', 'sixteencoins', 'jumprace', 'archerstick'].includes(w.gameType)) {
        const lb = leaderboards[type];
        if (lb && typeof lb === 'object' && !Array.isArray(lb)) {
          (lb as Record<string, number>)[w.name] = w.count;
        }
      }
    });

    // Process Results
    results.forEach(r => {
      if (r.gameType === 'flappy') {
        leaderboards.flappy.push({ name: r.name, score: r.score ?? 0 });
      } else if (r.gameType === 'typeracer') {
        leaderboards.typeracer.push({ name: r.name, wpm: r.score ?? 0 });
      } else if (r.gameType.startsWith('cssbattle-')) {
        const level = r.gameType.split('-')[1];
        if (!leaderboards.cssbattle[level]) leaderboards.cssbattle[level] = [];
        leaderboards.cssbattle[level].push({ name: r.name, time: r.time ?? 0 });
      } else if (r.gameType.startsWith('memory-')) {
        const level = r.gameType.split('-')[1];
        if (!leaderboards.memory[level]) leaderboards.memory[level] = [];
        leaderboards.memory[level].push({ name: r.name, time: r.time ?? 0 });
      } else if (r.gameType.startsWith('gridorder-')) {
        const level = r.gameType.split('-')[1];
        if (!leaderboards.gridorder[level]) leaderboards.gridorder[level] = { bestTimes: [], bestMoves: [] };
        if (r.time !== null) leaderboards.gridorder[level].bestTimes.push({ name: r.name, time: r.time });
        if (r.score !== null) leaderboards.gridorder[level].bestMoves.push({ name: r.name, moves: r.score });
      } else if (r.gameType.startsWith('shapeme-')) {
        const shape = r.gameType.split('-')[1];
        if (!leaderboards.shapeme[shape]) leaderboards.shapeme[shape] = [];
        leaderboards.shapeme[shape].push({ name: r.name, score: r.score ?? 0 });
      } else if (r.gameType.startsWith('mirrordraw-')) {
        const shape = r.gameType.split('-')[1];
        if (!leaderboards.mirrordraw[shape]) leaderboards.mirrordraw[shape] = [];
        leaderboards.mirrordraw[shape].push({ name: r.name, score: r.score ?? 0, time: r.time ?? 0 });
      } else if (r.gameType === 'colormatcher') {
        if (!leaderboards.colormatcher['Best Match']) leaderboards.colormatcher['Best Match'] = [];
        leaderboards.colormatcher['Best Match'].push({ name: r.name, score: r.score ?? 0, time: r.time ?? 0 });
      }
    });

    // Sort and Slicing (Optimization Step: Only keep top 10/50)
    leaderboards.flappy.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    leaderboards.flappy = leaderboards.flappy.slice(0, 50);
    
    leaderboards.typeracer.sort((a, b) => (b.wpm ?? 0) - (a.wpm ?? 0));
    leaderboards.typeracer = leaderboards.typeracer.slice(0, 50);

    Object.keys(leaderboards.cssbattle).forEach(lvl => {
      leaderboards.cssbattle[lvl].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
      leaderboards.cssbattle[lvl] = leaderboards.cssbattle[lvl].slice(0, 10);
    });

    Object.keys(leaderboards.memory).forEach(lvl => {
      leaderboards.memory[lvl].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
      leaderboards.memory[lvl] = leaderboards.memory[lvl].slice(0, 10);
    });

    Object.keys(leaderboards.gridorder).forEach(lvl => {
      leaderboards.gridorder[lvl].bestTimes.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
      leaderboards.gridorder[lvl].bestTimes = leaderboards.gridorder[lvl].bestTimes.slice(0, 10);
      leaderboards.gridorder[lvl].bestMoves.sort((a, b) => (a.moves ?? 0) - (b.moves ?? 0));
      leaderboards.gridorder[lvl].bestMoves = leaderboards.gridorder[lvl].bestMoves.slice(0, 10);
    });

    Object.keys(leaderboards.shapeme).forEach(shape => {
      leaderboards.shapeme[shape].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      leaderboards.shapeme[shape] = leaderboards.shapeme[shape].slice(0, 10);
    });

    Object.keys(leaderboards.mirrordraw).forEach(shape => {
      leaderboards.mirrordraw[shape].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      leaderboards.mirrordraw[shape] = leaderboards.mirrordraw[shape].slice(0, 10);
    });

    Object.keys(leaderboards.colormatcher).forEach(cat => {
      leaderboards.colormatcher[cat].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      leaderboards.colormatcher[cat] = leaderboards.colormatcher[cat].slice(0, 10);
    });

    return leaderboards;
  } catch (error) {
    console.error('Database connection failed in getLeaderboards:', error);
    return {
      bingo: {}, typeracer: [], chess: {}, quiz: {}, sudoku: {}, 
      kakuro: {}, sixteencoins: {}, gridorder: {}, memory: {}, flappy: [], cssbattle: {},
      jumprace: {}, shapeme: {}, colormatcher: {}, mirrordraw: {}, archerstick: {}
    };
  }
}

export async function updatePlayerWin(name: string, type: GameType | string, score?: number, time?: number, level?: number | string) {
  if (['flappy', 'typeracer'].includes(type as string)) {
     await prisma.result.create({
       data: { gameType: type as string, name, score }
     });
  } else if (type === 'shapeme' && level !== undefined) {
    await prisma.result.create({
      data: { gameType: `shapeme-${level}`, name, score }
    });
  } else if (['cssbattle', 'memory'].includes(type as string) && level !== undefined) {
     await prisma.result.create({
       data: { gameType: `${type}-${level}`, name, time }
     });
  } else if (type === 'gridorder' && level !== undefined) {
     await prisma.result.create({
       data: { gameType: `gridorder-${level}`, name, score, time }
     });
  } else if (type === 'mirrordraw' && level !== undefined) {
     await prisma.result.create({
       data: { gameType: `mirrordraw-${level}`, name, score, time }
     });
  } else if (type === 'colormatcher') {
     await prisma.result.create({
       data: { gameType: 'colormatcher', name, score, time }
     });
  } else {
    // Standard win count games
    await prisma.winCount.upsert({
      where: { gameType_name: { gameType: type as string, name } },
      update: { count: { increment: 1 } },
      create: { gameType: type as string, name, count: 1 }
    });
  }
}
