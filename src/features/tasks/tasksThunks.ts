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
// Импортируем типы правильно
import { ITask, ICreateTaskPayload, TaskStatus } from '../../types/taskTypes';

// --- Получение всех задач пользователя ---
export const fetchTasks = (): AppThunk => async (dispatch) => {
  dispatch(setLoading(true));
  dispatch(setError(null)); // Сбрасываем ошибку перед загрузкой
  try {
    console.log('Thunk: Fetching tasks...');
    const tasksFromServer = await tasksApi.getAll();
    console.log(`Thunk: Received ${tasksFromServer.length} tasks from server.`);
    // Убедимся, что сервер возвращает объекты с полем 'id'
    // Если сервер возвращает '_id', нужно раскомментировать и использовать маппинг:
    // const mappedTasks = tasksFromServer.map(task => ({ ...task, id: task._id || task.id }));
    // dispatch(setTasks(mappedTasks));
    dispatch(setTasks(tasksFromServer)); // Используем напрямую, если сервер возвращает 'id'
  } catch (err: any) {
    console.error('Thunk: Failed to fetch tasks:', err);
    const message = err.response?.data?.message || err.message || 'Failed to load tasks';
    dispatch(setError(message));
  } finally {
    dispatch(setLoading(false));
  }
};

// --- Создание новой задачи ---
// Используем тип ICreateTaskPayload для входных данных
export const createTask =
  (newTaskData: ICreateTaskPayload): AppThunk =>
  async (dispatch) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      console.log('Thunk: Creating task with data:', newTaskData);
      // tasksApi.create принимает ICreateTaskPayload, возвращает ITask
      const createdTaskFromServer = await tasksApi.create(newTaskData);
      console.log('Thunk: Task created on server:', createdTaskFromServer);
      // Добавляем ПОЛНУЮ задачу (с id, createdAt и т.д.) в стейт
      dispatch(taskUpdated(createdTaskFromServer)); // taskUpdated добавит если нет, или обновит если есть
    } catch (err: any) {
      console.error('Thunk: Failed to create task:', err);
      const message = err.response?.data?.message || err.message || 'Failed to create task';
      dispatch(setError(message));
      // Возможно, стоит показать ошибку пользователю через alert или notification
      // alert(`Error creating task: ${message}`);
    } finally {
      dispatch(setLoading(false));
    }
  };

// --- Обновление статуса задачи (при Drag-n-Drop) ---
// Используем TaskStatus из импортов
export const updateTaskStatus =
  (taskId: string, newStatus: TaskStatus): AppThunk =>
  async (dispatch, getState) => {
    const task = getState().tasks.tasks.find((t) => t.id === taskId);
    if (!task) {
      console.warn(`updateTaskStatus: Task with ID ${taskId} not found in state.`);
      return;
    }

    // Сохраняем предыдущий статус для отката
    const previousStatus = task.status;

    // Оптимистичное обновление статуса в UI
    dispatch(taskDropped({ taskId, newStatus }));
    console.log(`Thunk: Optimistically updated status for task ${taskId} to ${newStatus}`);

    // Опционально: Оптимистично делаем видимой при перетаскивании
    let previousHiddenStatus: boolean | undefined;
    if (task.isHidden) {
      previousHiddenStatus = task.isHidden;
      dispatch(setTaskHiddenStatus({ taskId, isHidden: false }));
      console.log(`Thunk: Optimistically set isHidden to false for task ${taskId}`);
    }

    try {
      // Готовим данные для отправки на сервер
      const updateData: Partial<ITask> = { status: newStatus };
      // Если мы оптимистично сделали видимой, отправляем это и на сервер
      if (previousHiddenStatus === true) {
        updateData.isHidden = false;
      }

      console.log(`Thunk: Sending status update for task ${taskId} to server:`, updateData);
      await tasksApi.update(taskId, updateData); // Отправляем только нужные поля
      console.log(`Thunk: Task ${taskId} status updated successfully on server.`);
    } catch (err: any) {
      console.error(`Thunk: Failed to update task status for ${taskId}:`, err);
      // Откат оптимистичного обновления статуса
      dispatch(taskDropped({ taskId, newStatus: previousStatus }));
      // Откат оптимистичного обновления видимости, если было
      if (previousHiddenStatus === true) {
        dispatch(setTaskHiddenStatus({ taskId, isHidden: true }));
      }
      const message = err.response?.data?.message || err.message || 'Failed to update task status';
      dispatch(setError(message));
      alert(`Failed to update task status: ${message}`);
    }
  };

// --- Удаление задачи ("Complete") ---
export const deleteTaskThunk =
  (taskId: string): AppThunk =>
  async (dispatch, getState) => {
    // Получаем задачу из стейта ДО удаления для возможности отката
    const taskToDelete = getState().tasks.tasks.find((t) => t.id === taskId);
    if (!taskToDelete) {
      console.warn(`deleteTaskThunk: Task with ID ${taskId} not found in state.`);
      return; // Задачи уже нет в стейте, ничего не делаем
    }

    // Оптимистичное удаление из UI
    dispatch(taskDeleted(taskId));
    console.log(`Thunk: Optimistically removed task ${taskId} from UI.`);

    try {
      console.log(`Thunk: Deleting task ${taskId} on server...`);
      // Сервер должен вернуть объект типа { message: string, deletedTaskId: string }
      const response = await tasksApi.delete(taskId);
      console.log(`Thunk: Task ${taskId} deleted successfully on server. Response:`, response);
      // Оптимистичное обновление уже сделано, подтверждение от сервера получено.
    } catch (err: any) {
      console.error(`Thunk: Failed to delete task ${taskId}:`, err);
      // --- Откат оптимистичного удаления ---
      // Возвращаем задачу обратно в стейт. taskUpdated её добавит.
      dispatch(taskUpdated(taskToDelete));
      console.log(`Thunk: Rolled back optimistic deletion for task ${taskId}.`);
      // ---------------------------------
      const message = err.response?.data?.message || err.message || 'Failed to delete task';
      dispatch(setError(message));
      alert(`Failed to delete task: ${message}`); // Уведомление пользователю
    }
  };

// --- Скрытие/Отображение задачи ---
export const setTaskVisibilityThunk =
  (payload: { taskId: string; isHidden: boolean }): AppThunk =>
  async (dispatch, getState) => {
    const { taskId, isHidden } = payload;
    const task = getState().tasks.tasks.find((t) => t.id === taskId);
    if (!task) {
      console.warn(`setTaskVisibilityThunk: Task with ID ${taskId} not found in state.`);
      return;
    }

    // Сохраняем предыдущее состояние для отката
    const previousHiddenStatus = task.isHidden;

    // Проверяем, нужно ли вообще что-то делать
    if (previousHiddenStatus === isHidden) {
      console.log(`Thunk: Task ${taskId} already has isHidden=${isHidden}. No update needed.`);
      return;
    }

    // Оптимистичное обновление UI
    dispatch(setTaskHiddenStatus({ taskId, isHidden }));
    console.log(`Thunk: Optimistically set isHidden to ${isHidden} for task ${taskId}.`);

    try {
      console.log(
        `Thunk: Sending visibility update for task ${taskId} to server: { isHidden: ${isHidden} }`,
      );
      // Отправляем только поле isHidden на сервер
      await tasksApi.update(taskId, { isHidden });
      console.log(`Thunk: Task ${taskId} visibility updated successfully on server.`);
      // Успешно, оптимистичное обновление становится фактическим.
    } catch (err: any) {
      console.error(`Thunk: Failed to update task ${taskId} visibility:`, err);
      // --- Откат оптимистичного обновления ---
      dispatch(setTaskHiddenStatus({ taskId, isHidden: previousHiddenStatus ?? false })); // Возвращаем старое значение
      console.log(`Thunk: Rolled back optimistic visibility update for task ${taskId}.`);
      // ---------------------------------
      const message =
        err.response?.data?.message || err.message || 'Failed to update task visibility';
      dispatch(setError(message));
      alert(`Failed to update task visibility: ${message}`);
    }
  };
