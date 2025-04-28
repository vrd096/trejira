import { AppThunk } from '../../app/store';
import {
  setLoading,
  setError,
  setTasks,
  taskUpdated,
  taskDropped,
  taskDeleted,
  setTaskHiddenStatus,
} from './tasksSlice';
import { tasksApi } from '../../api/tasksApi';
import { ITask } from '../../types/taskTypes';

export const fetchTasks = (): AppThunk => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const tasks = await tasksApi.getAll();
    dispatch(setTasks(tasks));
  } catch (err) {
    const error = err as Error;
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

export const createTask =
  (taskData: Omit<ITask, '_id'>): AppThunk =>
  async (dispatch) => {
    try {
      dispatch(setLoading(true));
      const task = await tasksApi.create(taskData);
      dispatch(taskUpdated(task));
    } catch (err) {
      const error = err as Error;
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

export const updateTaskStatus =
  (taskId: string, newStatus: ITask['status']): AppThunk =>
  async (dispatch, getState) => {
    const task = getState().tasks.tasks.find((t: ITask) => t.id === taskId);
    if (!task) return;

    // Оптимистичное обновление
    dispatch(taskDropped({ taskId, newStatus }));

    try {
      await tasksApi.update(taskId, { ...task, status: newStatus });
    } catch (err) {
      const error = err as Error;
      dispatch(taskUpdated(task));
      dispatch(setError(error.message));
    }
  };
export const deleteTaskThunk =
  (taskId: string): AppThunk =>
  async (dispatch, getState) => {
    const task = getState().tasks.tasks.find((t) => t.id === taskId);
    if (!task) return; // Задачи нет в стейте

    // Оптимистичное удаление из UI
    dispatch(taskDeleted(taskId));

    try {
      console.log(`Thunk: Deleting task ${taskId}...`);
      await tasksApi.delete(taskId); // Сервер сам удалит из календаря
      console.log(`Thunk: Task ${taskId} deleted successfully on server.`);
      // Не нужно диспатчить taskDeleted снова, уже сделано оптимистично
    } catch (err) {
      console.error(`Thunk: Failed to delete task ${taskId}:`, err);
      // Откат оптимистичного удаления
      dispatch(taskUpdated(task)); // Восстанавливаем задачу в стейте
      dispatch(setError((err as Error).message));
      alert(`Failed to delete task: ${(err as Error).message}`); // Уведомление пользователю
    }
  };
export const setTaskVisibilityThunk =
  (payload: { taskId: string; isHidden: boolean }): AppThunk =>
  async (dispatch, getState) => {
    const { taskId, isHidden } = payload;
    const task = getState().tasks.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Сохраняем предыдущее состояние для отката
    const previousHiddenStatus = task.isHidden;

    // Оптимистичное обновление UI
    dispatch(setTaskHiddenStatus({ taskId, isHidden }));

    try {
      console.log(`Thunk: Setting task ${taskId} visibility to ${isHidden}...`);
      await tasksApi.update(taskId, { isHidden }); // Отправляем только isHidden
      console.log(`Thunk: Task ${taskId} visibility updated successfully on server.`);
      // Если успешно, ничего больше делать не нужно
    } catch (err) {
      console.error(`Thunk: Failed to update task ${taskId} visibility:`, err);
      // Откат оптимистичного обновления
      dispatch(setTaskHiddenStatus({ taskId, isHidden: previousHiddenStatus ?? false })); // Возвращаем старое значение
      dispatch(setError((err as Error).message));
      alert(`Failed to update task visibility: ${(err as Error).message}`);
    }
  };
