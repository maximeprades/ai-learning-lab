import { create } from "zustand";

export type Animal = {
  id: number;
  type: "dog" | "cat" | "giraffe" | "elephant" | "lion" | "tiger" | "bear" | "rabbit";
  emoji: string;
  predictedAsDog: boolean;
};

export type GamePhase = "welcome" | "playing" | "feedback" | "results";

export type RoundResult = {
  round: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  actualPrecision: number;
  actualRecall: number;
  userPrecision: number;
  userRecall: number;
  precisionCorrect: boolean;
  recallCorrect: boolean;
};

interface PrecisionRecallState {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  animals: Animal[];
  roundResults: RoundResult[];
  score: number;
  inputMode: "percentage" | "fraction";
  email: string;
  
  startGame: () => void;
  generateNewRound: () => void;
  submitAnswer: (userPrecision: number, userRecall: number) => RoundResult;
  nextRound: () => void;
  resetGame: () => void;
  setInputMode: (mode: "percentage" | "fraction") => void;
  setEmail: (email: string) => void;
  
  getConfusionMatrix: () => { tp: number; fp: number; fn: number; tn: number };
  calculatePrecision: () => number;
  calculateRecall: () => number;
}

const animalTypes: Array<{ type: Animal["type"]; emoji: string }> = [
  { type: "dog", emoji: "🐕" },
  { type: "cat", emoji: "🐱" },
  { type: "giraffe", emoji: "🦒" },
  { type: "elephant", emoji: "🐘" },
  { type: "lion", emoji: "🦁" },
  { type: "tiger", emoji: "🐯" },
  { type: "bear", emoji: "🐻" },
  { type: "rabbit", emoji: "🐰" },
];

function generateAnimals(): Animal[] {
  const animals: Animal[] = [];
  const gridSize = 10;
  
  const numDogs = Math.floor(Math.random() * 4) + 2;
  
  for (let i = 0; i < numDogs; i++) {
    animals.push({
      id: i,
      type: "dog",
      emoji: "🐕",
      predictedAsDog: false,
    });
  }
  
  const otherTypes = animalTypes.filter(a => a.type !== "dog");
  for (let i = numDogs; i < gridSize; i++) {
    const randomType = otherTypes[Math.floor(Math.random() * otherTypes.length)];
    animals.push({
      id: i,
      type: randomType.type,
      emoji: randomType.emoji,
      predictedAsDog: false,
    });
  }
  
  for (let i = animals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [animals[i], animals[j]] = [animals[j], animals[i]];
  }
  
  animals.forEach((animal, index) => {
    animal.id = index;
  });
  
  const actualDogs = animals.filter(a => a.type === "dog");
  const nonDogs = animals.filter(a => a.type !== "dog");
  
  const tpCount = Math.floor(Math.random() * actualDogs.length) + 1;
  const tpDogs = actualDogs.slice(0, tpCount);
  tpDogs.forEach(dog => {
    dog.predictedAsDog = true;
  });
  
  const maxFP = Math.min(3, nonDogs.length);
  const fpCount = Math.floor(Math.random() * (maxFP + 1));
  const fpAnimals = nonDogs.slice(0, fpCount);
  fpAnimals.forEach(animal => {
    animal.predictedAsDog = true;
  });
  
  return animals;
}

export const usePrecisionRecall = create<PrecisionRecallState>((set, get) => ({
  phase: "welcome",
  currentRound: 1,
  totalRounds: 5,
  animals: [],
  roundResults: [],
  score: 0,
  inputMode: "percentage",
  email: "",
  
  startGame: () => {
    const animals = generateAnimals();
    set({
      phase: "playing",
      currentRound: 1,
      animals,
      roundResults: [],
      score: 0,
    });
  },
  
  generateNewRound: () => {
    const animals = generateAnimals();
    set({ animals, phase: "playing" });
  },
  
  getConfusionMatrix: () => {
    const { animals } = get();
    let tp = 0, fp = 0, fn = 0, tn = 0;
    
    animals.forEach(animal => {
      const isActuallyDog = animal.type === "dog";
      const predictedDog = animal.predictedAsDog;
      
      if (isActuallyDog && predictedDog) tp++;
      else if (!isActuallyDog && predictedDog) fp++;
      else if (isActuallyDog && !predictedDog) fn++;
      else tn++;
    });
    
    return { tp, fp, fn, tn };
  },
  
  calculatePrecision: () => {
    const { tp, fp } = get().getConfusionMatrix();
    if (tp + fp === 0) return 0;
    return tp / (tp + fp);
  },
  
  calculateRecall: () => {
    const { tp, fn } = get().getConfusionMatrix();
    if (tp + fn === 0) return 0;
    return tp / (tp + fn);
  },
  
  submitAnswer: (userPrecision: number, userRecall: number) => {
    const { currentRound, roundResults, score, inputMode } = get();
    const { tp, fp, fn, tn } = get().getConfusionMatrix();
    
    const actualPrecision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const actualRecall = tp + fn === 0 ? 0 : tp / (tp + fn);
    
    const userPrecisionDecimal = inputMode === "percentage" ? userPrecision / 100 : userPrecision;
    const userRecallDecimal = inputMode === "percentage" ? userRecall / 100 : userRecall;
    
    const precisionCorrect = Math.abs(actualPrecision - userPrecisionDecimal) < 0.02;
    const recallCorrect = Math.abs(actualRecall - userRecallDecimal) < 0.02;
    
    let pointsEarned = 0;
    if (precisionCorrect) pointsEarned += 10;
    if (recallCorrect) pointsEarned += 10;
    
    const result: RoundResult = {
      round: currentRound,
      tp,
      fp,
      fn,
      tn,
      actualPrecision,
      actualRecall,
      userPrecision: userPrecisionDecimal,
      userRecall: userRecallDecimal,
      precisionCorrect,
      recallCorrect,
    };
    
    set({
      phase: "feedback",
      roundResults: [...roundResults, result],
      score: score + pointsEarned,
    });
    
    return result;
  },
  
  nextRound: () => {
    const { currentRound, totalRounds } = get();
    
    if (currentRound >= totalRounds) {
      set({ phase: "results" });
    } else {
      const animals = generateAnimals();
      set({
        currentRound: currentRound + 1,
        animals,
        phase: "playing",
      });
    }
  },
  
  resetGame: () => {
    set({
      phase: "welcome",
      currentRound: 1,
      animals: [],
      roundResults: [],
      score: 0,
      email: "",
    });
  },
  
  setInputMode: (mode) => {
    set({ inputMode: mode });
  },
  
  setEmail: (email) => {
    set({ email });
  },
}));
