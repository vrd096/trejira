import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import tasksReducer from '../features/tasks/tasksSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    notifications: notificationsReducer,
    auth: authReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
