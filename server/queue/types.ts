export type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface QueueJob {
  id: string;
  email: string;
  provider: string;
  model: string;
  moderationInstructions: string;
  scenarios: ScenarioInput[];
  status: JobStatus;
  queuePosition: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  currentScenario?: number;
  results?: ScenarioResult[];
  error?: string;
}

export interface ScenarioInput {
  id: number;
  text: string;
  expected: string;
  image: string;
}

export interface ScenarioResult {
  id: number;
  text: string;
  expected: string;
  aiLabel: string;
  normalizedLabel: string;
  isCorrect: boolean;
}

export interface ProviderConfig {
  name: string;
  maxConcurrent: number;
  cooldownMs: number;
  isEnabled: boolean;
}

export interface ProviderProcessor {
  name: string;
  processScenario: (
    scenario: ScenarioInput,
    prompt: string,
    model: string
  ) => Promise<{ aiLabel: string; normalizedLabel: string }>;
}

export interface QueueStats {
  totalQueued: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  totalCancelled?: number;
  providers: {
    [key: string]: {
      queued: number;
      processing: number;
      activeWorkers: number;
      maxWorkers: number;
      isEnabled: boolean;
      isPaused: boolean;
    };
  };
}

export interface QueueManagerEvents {
  onJobQueued: (job: QueueJob) => void;
  onJobStarted: (job: QueueJob) => void;
  onJobProgress: (job: QueueJob, scenarioIndex: number, total: number) => void;
  onJobCompleted: (job: QueueJob) => void;
  onJobFailed: (job: QueueJob, error: string) => void;
  onJobCancelled: (job: QueueJob) => void;
  onQueueStatsUpdated: (stats: QueueStats) => void;
}
