export interface ITask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  deadline: string; // ISO string
  assignee: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  calendarEventId?: string; // ID события в Google Calendar
}

export interface TaskBoardState {
  tasks: ITask[];
  loading: boolean;
  error: string | null;
}
