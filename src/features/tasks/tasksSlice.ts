import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ITask, TaskBoardState } from '../../types/taskTypes';

const initialState: TaskBoardState = {
  tasks: [],
  loading: false,
  error: null,
  viewMode: 'active',
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // Для WebSocket обновлений
    taskUpdated: (state, action: PayloadAction<ITask>) => {
      const index = state.tasks.findIndex((t) => t.id === action.payload.id);
      if (index >= 0) {
        state.tasks[index] = { ...state.tasks[index], ...action.payload };
      } else {
        state.tasks.push(action.payload);
      }
    },
    taskDeleted: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
    },
    // Для оптимистичных обновлений
    taskDragStarted: (state, action: PayloadAction<string>) => {
      // Можно добавить состояние перетаскивания
    },
    taskDropped: (state, action: PayloadAction<{ taskId: string; newStatus: ITask['status'] }>) => {
      const task = state.tasks.find((t) => t.id === action.payload.taskId);
      if (task) {
        task.status = action.payload.newStatus;
      }
    },
    setTasks: (state, action: PayloadAction<ITask[]>) => {
      state.tasks = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'active' | 'hidden'>) => {
      state.viewMode = action.payload;
    },
    // Редьюсер для оптимистичного обновления статуса isHidden
    setTaskHiddenStatus: (state, action: PayloadAction<{ taskId: string; isHidden: boolean }>) => {
      const task = state.tasks.find((t) => t.id === action.payload.taskId);
      if (task) {
        task.isHidden = action.payload.isHidden;
      }
    },
  },
});

export const {
  taskUpdated,
  taskDeleted,
  taskDragStarted,
  taskDropped,
  setTasks,
  setLoading,
  setError,
  setViewMode,
  setTaskHiddenStatus,
} = tasksSlice.actions;

export default tasksSlice.reducer;
