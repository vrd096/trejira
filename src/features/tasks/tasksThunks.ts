import { AppThunk } from '../../app/store';
import { setLoading, setError, setTasks, taskUpdated, taskDropped } from './tasksSlice';
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
