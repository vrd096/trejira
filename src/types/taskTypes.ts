export interface IAssignee {
  id: string;
  name: string;
  email: string;
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface ITask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  deadline: string; // ISO string
  assignee: IAssignee;
  createdAt: string;
  updatedAt: string;
  calendarEventId?: string;
  isHidden?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
}

export interface CalendarState {
  isIntegrated: boolean;
  events: CalendarEvent[];
  loading: boolean;
}

export interface TaskBoardState {
  tasks: ITask[];
  loading: boolean;
  error: string | null;
  viewMode: 'active' | 'hidden';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
