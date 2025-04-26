import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { taskUpdated, taskDeleted } from '../features/tasks/tasksSlice';
import { addNotification } from '../features/notifications/notificationsSlice';
import { TaskWebSocket } from '../api/websocket';
import { ITask } from '../types/taskTypes';

export const useWebSocket = (url: string) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const websocket = new TaskWebSocket(
      (task: ITask) => {
        dispatch(taskUpdated(task));
        dispatch(
          addNotification({
            id: `task-updated-${task.id}`,
            title: 'Task Updated',
            message: `Task "${task.title}" has been updated`,
            isRead: false,
            createdAt: new Date().toISOString(),
          }),
        );
      },
      (taskId: string) => {
        dispatch(taskDeleted(taskId));
        dispatch(
          addNotification({
            id: `task-deleted-${taskId}`,
            title: 'Task Deleted',
            message: `A task has been deleted`,
            isRead: false,
            createdAt: new Date().toISOString(),
          }),
        );
      },
    );

    return () => {
      websocket.close();
    };
  }, [url, dispatch]);
};
