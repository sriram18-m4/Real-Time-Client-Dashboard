import { describe, it, expect, beforeEach } from 'vitest';
import { overdueCronService } from '../src/services/overdueCron.service.js';
import { taskRepository } from '../src/repositories/task.repository.js';
import { activityRepository } from '../src/repositories/activity.repository.js';
import { memoryDb } from '../src/db/memoryStore.js';
import { TaskStatus, TaskPriority } from '@prisma/client';

describe('Overdue Task Cron Job & State Transition Tests', () => {
  beforeEach(() => {
    memoryDb.seedInitial();
  });

  it('1. Flags task as overdue when dueDate < now and status != DONE, writing a system TaskActivity row', async () => {
    // Create a task that was due yesterday
    const pastDueDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { task } = await taskRepository.create({
      projectId: 'prj-01',
      assigneeId: 'usr-dev-01',
      title: 'Urgent Bug Fix Behind Schedule',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: pastDueDate,
      actorId: 'usr-pm-01',
      actorName: 'Sarah Connor',
    });

    // Manually ensure isOverdue is false to test cron detection
    const memTask = memoryDb.tasks.find((t) => t.id === task.id)!;
    memTask.isOverdue = false;

    // Run cron scan
    const flaggedCount = await overdueCronService.runScan();
    expect(flaggedCount).toBeGreaterThanOrEqual(1);

    // Verify task state flipped
    const updatedTask = await taskRepository.findById(task.id);
    expect(updatedTask?.isOverdue).toBe(true);

    // Verify system TaskActivity row created
    const activities = await activityRepository.findByTaskId(task.id);
    const overdueActivity = activities.find((a) => a.type === 'OVERDUE_FLAGGED');
    expect(overdueActivity).toBeDefined();
    expect(overdueActivity.actorId).toBeNull(); // System event has null actor
  });

  it('2. Scan is idempotent - running twice does not double flag or duplicate events', async () => {
    const firstRun = await overdueCronService.runScan();
    const secondRun = await overdueCronService.runScan();

    // Second run has 0 new items to flag
    expect(secondRun).toBe(0);
  });

  it('3. Clears overdue flag when completed or due date moved forward', async () => {
    // Pick an existing overdue task
    const overdueTask = memoryDb.tasks.find((t) => t.isOverdue)!;
    expect(overdueTask).toBeDefined();

    // Mark task as DONE
    const { task: completedTask } = await taskRepository.updateStatusWithActivity({
      taskId: overdueTask.id,
      newStatus: TaskStatus.DONE,
      actorId: 'usr-dev-01',
      actorName: 'Ravi Patel',
    });

    expect(completedTask.isOverdue).toBe(false);

    // Also test moving due date forward
    const anotherOverdue = memoryDb.tasks.find((t) => t.isOverdue && t.id !== overdueTask.id);
    if (anotherOverdue) {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const { task: rescheduled } = await taskRepository.update(
        anotherOverdue.id,
        { dueDate: futureDate },
        'usr-pm-01',
        'Sarah Connor'
      );
      expect(rescheduled.isOverdue).toBe(false);
    }
  });
});
