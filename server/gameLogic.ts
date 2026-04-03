export function generateSolvableBoard(size: number) {
  const tiles = [];
  for (let i = 1; i < size * size; i++) tiles.push(i);
  tiles.push(null);

  let shuffled = [...tiles];
  let emptyIndex = size * size - 1;
  let movesToMake = size * size * 25;

  const getNeighbors = (idx: number, sz: number) => {
    const res = [];
    const r = Math.floor(idx / sz);
    const c = idx % sz;
    if (r > 0) res.push(idx - sz);
    if (r < sz - 1) res.push(idx + sz);
    if (c > 0) res.push(idx - 1);
    if (c < sz - 1) res.push(idx + 1);
    return res;
  };

  for (let i = 0; i < movesToMake; i++) {
    const ns = getNeighbors(emptyIndex, size);
    const rand = ns[Math.floor(Math.random() * ns.length)];
    [shuffled[emptyIndex], shuffled[rand]] = [shuffled[rand], shuffled[emptyIndex]];
    emptyIndex = rand;
  }
  return shuffled;
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}
