// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks'; // Импорты хуков Redux
// --- Экшены, которые будем диспатчить ---
import { taskUpdated, taskDeleted } from '../features/tasks/tasksSlice';
import { addNotification } from '../features/notifications/notificationsSlice';
// ---------------------------------------
import { TaskWebSocket } from '../api/websocket'; // Класс WebSocket
import { ITask } from '../types/taskTypes'; // Тип задачи
import { RootState, AppDispatch } from '../app/store'; // Типы RootState и AppDispatch
import { refreshAccessToken } from '../features/auth/authThunks'; // Thunk для рефреша
import { store } from '../app/store'; // Прямой доступ к store (для таймаута реконнекта)

export const useWebSocket = (url: string) => {
  const dispatch: AppDispatch = useAppDispatch(); // Явно типизируем dispatch
  const { isAuthenticated, accessToken } = useAppSelector((state: RootState) => state.auth);
  const webSocketRef = useRef<TaskWebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  // --- Обработчик ошибок WebSocket ---
  const handleWebSocketError = async (error: Error) => {
    console.error('useWebSocket: Received error from WebSocket:', error.message);
    if (
      error.message.includes('Access token expired') ||
      error.message.includes('Authentication failed') ||
      error.message.includes('Invalid access token')
    ) {
      console.log('useWebSocket: Attempting token refresh due to WS auth error...');
      clearReconnectTimer();
      try {
        await dispatch(refreshAccessToken()).unwrap();
        console.log('useWebSocket: Token refreshed successfully after WS error.');
        // Переподключение произойдет в useEffect из-за смены accessToken
      } catch (refreshError) {
        console.error('useWebSocket: Failed to refresh token after WS auth error:', refreshError);
        // logout будет вызван внутри refreshAccessToken при ошибке
      }
    } else if (error.message.includes('Disconnected by server')) {
      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        console.log('useWebSocket: Attempting manual reconnect after server disconnect...');
        // Получаем актуальный токен из store перед реконнектом
        const currentToken = store.getState().auth.accessToken;
        webSocketRef.current?.updateTokenAndReconnect(currentToken);
      }, 5000);
    }
    // Можно добавить обработку других типов ошибок, если нужно
  };
  // ---------------------------------

  useEffect(() => {
    clearReconnectTimer();

    if (isAuthenticated && url && accessToken) {
      console.log('useWebSocket: Conditions met, establishing/updating WebSocket connection...');

      // --- Логика колбэков для TaskWebSocket ---
      const handleTaskUpdate = (task: ITask) => {
        console.log('WS Callback: TASK_UPDATED received', task);
        dispatch(taskUpdated(task)); // <<< ИСПОЛЬЗУЕМ taskUpdated
        dispatch(
          addNotification({
            // <<< ИСПОЛЬЗУЕМ addNotification
            id: `task-updated-${task.id}-${Date.now()}`,
            title: 'Task Updated',
            message: `Task "${task.title}" has been updated`,
            isRead: false,
            createdAt: new Date().toISOString(),
          }),
        );
      };

      const handleTaskDelete = (taskId: string) => {
        console.log('WS Callback: TASK_DELETED received', taskId);
        dispatch(taskDeleted(taskId)); // <<< ИСПОЛЬЗУЕМ taskDeleted
        dispatch(
          addNotification({
            // <<< ИСПОЛЬЗУЕМ addNotification
            id: `task-deleted-${taskId}-${Date.now()}`,
            title: 'Task Deleted',
            message: `A task with ID ${taskId} has been deleted`,
            isRead: false,
            createdAt: new Date().toISOString(),
          }),
        );
      };
      // -----------------------------------------

      if (!webSocketRef.current) {
        console.log('useWebSocket: Creating new TaskWebSocket instance.');
        webSocketRef.current = new TaskWebSocket(
          accessToken, // Передаем токен
          handleTaskUpdate, // Передаем обработчик обновления
          handleTaskDelete, // Передаем обработчик удаления
          handleWebSocketError, // Передаем обработчик ошибок
        );
      } else {
        // Если экземпляр есть, обновляем токен (это также пересоздаст соединение)
        console.log('useWebSocket: Instance exists, updating token and reconnecting...');
        webSocketRef.current.updateTokenAndReconnect(accessToken);
      }
    } else {
      // Закрываем соединение, если не аутентифицирован или нет токена/URL
      console.log('useWebSocket: Conditions not met, closing WebSocket.');
      webSocketRef.current?.close();
      // Не сбрасываем ref в null немедленно, чтобы useEffect мог корректно обновить токен при логине
    }

    // Функция очистки при размонтировании/изменении зависимостей
    return () => {
      console.log('useWebSocket Cleanup: Closing WebSocket connection...');
      clearReconnectTimer();
      // Закрываем соединение, если оно было создано
      webSocketRef.current?.close();
      // Сброс ref оставляем в другом useEffect, чтобы избежать лишних созданий
    };
    // Зависим от url, isAuthenticated и accessToken
  }, [url, isAuthenticated, accessToken, dispatch]); // dispatch добавлен как зависимость

  // Дополнительный useEffect для сброса webSocketRef при выходе пользователя
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('useWebSocket: User logged out, resetting WebSocket ref.');
      webSocketRef.current = null;
    }
  }, [isAuthenticated]);
};
