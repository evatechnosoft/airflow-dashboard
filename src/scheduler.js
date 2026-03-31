/**
 * Background probe scheduler
 * Runs probes for all non-paused targets at their configured intervals
 */

const { appendJsonLine } = require('./utils/ioLog');

class ProbeScheduler {
  constructor(container, ioPaths, { logInterval = 10000 } = {}) {
    this.container = container;
    this.ioPaths = ioPaths;
    this.logInterval = logInterval;
    this.running = false;
    this.timers = new Map(); // targetId -> timerId
    this.nextId = 0;
  }

  async start() {
    if (this.running) {
      console.warn('[ProbeScheduler] already running, ignoring start()');
      return;
    }

    this.running = true;
    console.log('[ProbeScheduler] starting...');

    try {
      const targets = await this.container.targetRepository.list();
      console.log(`[ProbeScheduler] loaded ${targets.length} targets`);

      for (const target of targets) {
        this.scheduleTarget(target);
      }

      // Stats logger
      this.statsInterval = setInterval(() => {
        const active = Array.from(this.timers.entries()).filter(([, id]) => id !== null).length;
        console.log(`[ProbeScheduler] stats: ${active} active timers`);
      }, this.logInterval);
    } catch (err) {
      console.error('[ProbeScheduler] error loading targets:', err);
      this.running = false;
      throw err;
    }
  }

  stop() {
    console.log('[ProbeScheduler] stopping...');
    this.running = false;

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    for (const [targetId, timerId] of this.timers.entries()) {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    }

    this.timers.clear();
    console.log('[ProbeScheduler] stopped');
  }

  scheduleTarget(target) {
    if (!target || !target.id) {
      console.warn('[ProbeScheduler] invalid target, skipping:', target);
      return;
    }

    if (target.paused) {
      console.log(`[ProbeScheduler] target ${target.id} is paused, skipping`);
      return;
    }

    const intervalMs = target.intervalMs || 30000;
    const targetId = String(target.id);

    // Clear any existing timer for this target
    const existingId = this.timers.get(targetId);
    if (existingId !== null && existingId !== undefined) {
      clearTimeout(existingId);
    }

    // Schedule probe run
    const scheduleNextRun = () => {
      const timerId = setTimeout(async () => {
        try {
          const currentTarget = await this.container.targetRepository.list()
            .then(targets => targets.find(t => String(t.id) === targetId));

          if (!currentTarget) {
            console.warn(`[ProbeScheduler] target ${targetId} no longer exists`);
            this.timers.delete(targetId);
            return;
          }

          if (currentTarget.paused) {
            console.log(`[ProbeScheduler] target ${targetId} is now paused, unscheduling`);
            this.timers.delete(targetId);
            return;
          }

          // Run probe
          const result = await this.container.probeService.probe({
            url: currentTarget.url,
            method: currentTarget.method || 'GET',
            timeoutMs: 8000
          });

          // Log result
          appendJsonLine(this.ioPaths.probeOutputs, {
            at: new Date().toISOString(),
            targetId: currentTarget.id,
            request: {
              url: currentTarget.url,
              method: currentTarget.method || 'GET',
              timeoutMs: 8000
            },
            response: result
          });

          // Reschedule next run
          scheduleNextRun();
        } catch (err) {
          console.error(`[ProbeScheduler] error probing ${targetId}:`, err.message || err);
          // Reschedule even on error
          scheduleNextRun();
        }
      }, intervalMs);

      this.timers.set(targetId, timerId);
    };

    scheduleNextRun();
    console.log(`[ProbeScheduler] scheduled ${targetId} every ${intervalMs}ms`);
  }

  unscheduleTarget(targetId) {
    const timerId = this.timers.get(String(targetId));
    if (timerId !== null && timerId !== undefined) {
      clearTimeout(timerId);
      this.timers.delete(String(targetId));
      console.log(`[ProbeScheduler] unscheduled ${targetId}`);
    }
  }

  isRunning() {
    return this.running;
  }

  getStats() {
    const active = Array.from(this.timers.values()).filter(id => id !== null).length;
    return {
      running: this.running,
      scheduledTargets: this.timers.size,
      activeTimers: active
    };
  }
}

module.exports = { ProbeScheduler };
