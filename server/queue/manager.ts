import {
  QueueJob,
  QueueStats,
  ProviderConfig,
  ProviderProcessor,
  ScenarioInput,
  ScenarioResult,
  QueueManagerEvents,
} from "./types";
import {
  defaultProviderConfigs,
  createOpenAIProcessor,
  createAnthropicProcessor,
  getProviderFromModel,
} from "./providers";

const MAX_QUEUE_SIZE = 100;

class QueueManager {
  private jobs: Map<string, QueueJob> = new Map();
  private providerQueues: Map<string, string[]> = new Map();
  private providerConfigs: Map<string, ProviderConfig> = new Map();
  private providerProcessors: Map<string, ProviderProcessor> = new Map();
  private providerPaused: Map<string, boolean> = new Map();
  private activeWorkers: Map<string, number> = new Map();
  private events: Partial<QueueManagerEvents> = {};
  private promptTemplate: string = "";
  private cancelledCount: number = 0;

  constructor() {
    for (const [name, config] of Object.entries(defaultProviderConfigs)) {
      this.providerConfigs.set(name, { ...config });
      this.providerQueues.set(name, []);
      this.providerPaused.set(name, false);
      this.activeWorkers.set(name, 0);
    }
  }

  initialize() {
    try {
      this.providerProcessors.set("openai", createOpenAIProcessor());
    } catch (e) {
      console.warn("OpenAI processor not available:", (e as Error).message);
    }

    try {
      this.providerProcessors.set("anthropic", createAnthropicProcessor());
    } catch (e) {
      console.warn("Anthropic processor not available:", (e as Error).message);
    }
  }

  setPromptTemplate(template: string) {
    this.promptTemplate = template;
  }

  setEventHandlers(handlers: Partial<QueueManagerEvents>) {
    this.events = { ...this.events, ...handlers };
  }

  getProviderConfig(provider: string): ProviderConfig | undefined {
    return this.providerConfigs.get(provider);
  }

  updateProviderConfig(provider: string, updates: Partial<ProviderConfig>) {
    const config = this.providerConfigs.get(provider);
    if (config) {
      this.providerConfigs.set(provider, { ...config, ...updates });
    }
  }

  pauseProvider(provider: string) {
    this.providerPaused.set(provider, true);
    this.emitStatsUpdate();
  }

  resumeProvider(provider: string) {
    this.providerPaused.set(provider, false);
    this.processQueue(provider);
    this.emitStatsUpdate();
  }

  isProviderPaused(provider: string): boolean {
    return this.providerPaused.get(provider) || false;
  }

  pauseAll() {
    for (const provider of this.providerConfigs.keys()) {
      this.providerPaused.set(provider, true);
    }
    this.emitStatsUpdate();
  }

  resumeAll() {
    for (const provider of this.providerConfigs.keys()) {
      this.providerPaused.set(provider, false);
      this.processQueue(provider);
    }
    this.emitStatsUpdate();
  }

  enqueue(
    email: string,
    model: string,
    moderationInstructions: string,
    scenarios: ScenarioInput[]
  ): QueueJob | { error: string } {
    const provider = getProviderFromModel(model);
    const queue = this.providerQueues.get(provider);
    
    if (!queue) {
      return { error: `Unknown provider for model: ${model}` };
    }

    const existingJob = Array.from(this.jobs.values()).find(
      (j) => j.email === email && (j.status === "queued" || j.status === "processing")
    );
    if (existingJob) {
      return { error: "You already have a test in the queue. Please wait for it to complete." };
    }

    const totalQueuedJobs = Array.from(this.jobs.values()).filter(
      (j) => j.status === "queued" || j.status === "processing"
    ).length;
    if (totalQueuedJobs >= MAX_QUEUE_SIZE) {
      return { error: "The queue is currently full. Please try again in a few minutes." };
    }

    const job: QueueJob = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      provider,
      model,
      moderationInstructions,
      scenarios,
      status: "queued",
      queuePosition: queue.length + 1,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    queue.push(job.id);

    this.updateQueuePositions(provider);
    this.events.onJobQueued?.(job);
    this.emitStatsUpdate();

    this.processQueue(provider);

    return job;
  }

  private updateQueuePositions(provider: string) {
    const queue = this.providerQueues.get(provider);
    if (!queue) return;

    queue.forEach((jobId, index) => {
      const job = this.jobs.get(jobId);
      if (job && job.status === "queued") {
        job.queuePosition = index + 1;
      }
    });
  }

  private processQueue(provider: string) {
    if (this.providerPaused.get(provider)) return;
    
    const config = this.providerConfigs.get(provider);
    if (!config) return;
    
    const activeCount = this.activeWorkers.get(provider) || 0;
    if (activeCount >= config.maxConcurrent) return;
    
    const queue = this.providerQueues.get(provider);
    if (!queue) return;
    
    const nextJobId = queue.find((id) => {
      const job = this.jobs.get(id);
      return job && job.status === "queued";
    });
    
    if (!nextJobId) return;
    
    this.startWorker(provider, nextJobId);
    
    if ((this.activeWorkers.get(provider) || 0) < config.maxConcurrent) {
      setImmediate(() => this.processQueue(provider));
    }
  }
  
  private async startWorker(provider: string, jobId: string) {
    const config = this.providerConfigs.get(provider);
    const processor = this.providerProcessors.get(provider);
    const queue = this.providerQueues.get(provider);
    
    if (!config || !processor || !queue) return;
    
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    const activeCount = this.activeWorkers.get(provider) || 0;
    this.activeWorkers.set(provider, activeCount + 1);
    
    job.status = "processing";
    job.startedAt = new Date();
    job.results = [];
    
    this.events.onJobStarted?.(job);
    this.emitStatsUpdate();
    
    try {
      const fullPrompt = this.promptTemplate.replace("{{STUDENT_PROMPT}}", job.moderationInstructions);
      
      for (let i = 0; i < job.scenarios.length; i++) {
        const scenario = job.scenarios[i];
        job.currentScenario = i + 1;
        
        this.events.onJobProgress?.(job, i + 1, job.scenarios.length);
        
        try {
          const result = await processor.processScenario(scenario, fullPrompt, job.model);
          
          const scenarioResult: ScenarioResult = {
            id: scenario.id,
            text: scenario.text,
            expected: scenario.expected,
            aiLabel: result.aiLabel,
            normalizedLabel: result.normalizedLabel,
            isCorrect: result.normalizedLabel === scenario.expected,
          };
          job.results!.push(scenarioResult);
          
          if (config.cooldownMs > 0 && i < job.scenarios.length - 1) {
            await this.sleep(config.cooldownMs);
          }
        } catch (error: any) {
          const scenarioResult: ScenarioResult = {
            id: scenario.id,
            text: scenario.text,
            expected: scenario.expected,
            aiLabel: "Error",
            normalizedLabel: "Error",
            isCorrect: false,
          };
          job.results!.push(scenarioResult);
          console.error(`Error processing scenario ${scenario.id}:`, error.message);
        }
      }
      
      job.status = "completed";
      job.completedAt = new Date();
      
      const queueIndex = queue.indexOf(jobId);
      if (queueIndex > -1) {
        queue.splice(queueIndex, 1);
      }
      
      this.updateQueuePositions(provider);
      this.events.onJobCompleted?.(job);
    } catch (error: any) {
      job.status = "failed";
      job.error = error.message || "Unknown error";
      job.completedAt = new Date();
      
      const queueIndex = queue.indexOf(jobId);
      if (queueIndex > -1) {
        queue.splice(queueIndex, 1);
      }
      
      this.updateQueuePositions(provider);
      this.events.onJobFailed?.(job, job.error);
    } finally {
      const currentActive = this.activeWorkers.get(provider) || 1;
      this.activeWorkers.set(provider, Math.max(0, currentActive - 1));
      this.emitStatsUpdate();
      
      setImmediate(() => this.processQueue(provider));
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getJob(jobId: string): QueueJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobByEmail(email: string): QueueJob | undefined {
    return Array.from(this.jobs.values()).find(
      (j) => j.email === email && (j.status === "queued" || j.status === "processing")
    );
  }

  getStats(): QueueStats {
    const allJobs = Array.from(this.jobs.values());
    
    const stats: QueueStats = {
      totalQueued: allJobs.filter((j) => j.status === "queued").length,
      totalProcessing: allJobs.filter((j) => j.status === "processing").length,
      totalCompleted: allJobs.filter((j) => j.status === "completed").length,
      totalFailed: allJobs.filter((j) => j.status === "failed").length,
      totalCancelled: this.cancelledCount,
      providers: {},
    };

    for (const [name, config] of this.providerConfigs) {
      const providerJobs = allJobs.filter((j) => j.provider === name);
      stats.providers[name] = {
        queued: providerJobs.filter((j) => j.status === "queued").length,
        processing: providerJobs.filter((j) => j.status === "processing").length,
        activeWorkers: this.activeWorkers.get(name) || 0,
        maxWorkers: config.maxConcurrent,
        isEnabled: config.isEnabled,
        isPaused: this.providerPaused.get(name) || false,
      };
    }

    return stats;
  }

  getQueuedJobs(): QueueJob[] {
    return Array.from(this.jobs.values())
      .filter((j) => j.status === "queued" || j.status === "processing")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "queued") return false;

    job.status = "cancelled";
    job.error = "Cancelled by teacher";
    job.completedAt = new Date();

    const queue = this.providerQueues.get(job.provider);
    if (queue) {
      const index = queue.indexOf(jobId);
      if (index > -1) {
        queue.splice(index, 1);
      }
      this.updateQueuePositions(job.provider);
    }

    this.cancelledCount++;
    this.events.onJobCancelled?.(job);
    this.jobs.delete(jobId);
    this.emitStatsUpdate();
    return true;
  }

  clearCompletedJobs() {
    for (const [id, job] of this.jobs) {
      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        this.jobs.delete(id);
      }
    }
    this.emitStatsUpdate();
  }

  private emitStatsUpdate() {
    this.events.onQueueStatsUpdated?.(this.getStats());
  }
}

export const queueManager = new QueueManager();
