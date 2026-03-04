export function readJson(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch{
    return fallback;
  }
}

export function writeJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function pushUnique(key, value, limit=20){
  const arr = readJson(key, []);
  const next = [value, ...arr.filter(x => x !== value)].slice(0, limit);
  writeJson(key, next);
  return next;
}
