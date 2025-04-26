import { ITask } from '../types/taskTypes';
import { notificationsApi } from '../api/notifications';
import { AppDispatch } from '../app/store';
import { addNotification } from '../features/notifications/notificationsSlice';

export class DeadlineNotifier {
  private timeouts: Record<string, ReturnType<typeof setTimeout>> = {};
  private dispatch: AppDispatch;

  constructor(dispatch: AppDispatch, tasks: ITask[]) {
    this.dispatch = dispatch;
    this.scheduleAll(tasks);
  }

  private scheduleAll(tasks: ITask[]) {
    tasks.forEach((task) => this.scheduleNotification(task));
  }

  private scheduleNotification(task: ITask) {
    if (!task.deadline) return;

    const deadlineTime = new Date(task.deadline).getTime();
    const now = Date.now();
    const timeUntilDeadline = deadlineTime - now;

    if (timeUntilDeadline <= 0) return;

    if (this.timeouts[task.id]) {
      clearTimeout(this.timeouts[task.id]);
    }

    this.timeouts[task.id] = setTimeout(async () => {
      try {
        await notificationsApi.sendPushNotification({
          userId: task.assignee.id,
          title: `Deadline approaching: ${task.title}`,
          body: task.description || 'No description provided',
        });

        this.dispatch(
          addNotification({
            id: `deadline-${task.id}-${Date.now()}`,
            title: `Deadline for "${task.title}"`,
            message: `The deadline for this task is approaching`,
            isRead: false,
            createdAt: new Date().toISOString(),
          }),
        );
      } catch (err) {
        console.error('Failed to send notification', err);
      }
    }, timeUntilDeadline);
  }

  updateTasks(newTasks: ITask[]) {
    this.clearAll();
    this.scheduleAll(newTasks);
  }

  clearAll() {
    Object.values(this.timeouts).forEach((timeout) => clearTimeout(timeout));
    this.timeouts = {};
  }
}
