import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { updateTaskStatus } from '../../features/tasks/tasksThunks';
import { TaskColumn } from './TaskColumn';
import { useWebSocket } from '../../hooks/useWebSocket';

export const TaskBoard: React.FC = () => {
  const { tasks, loading, error } = useAppSelector((state) => state.tasks);
  const dispatch = useAppDispatch();

  // Подключаем WebSocket
  useWebSocket('ws://your-websocket-server/tasks');

  const statuses = ['todo', 'in-progress', 'done'] as const;

  const handleDrop = (taskId: string, newStatus: (typeof statuses)[number]) => {
    dispatch(updateTaskStatus(taskId, newStatus));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="task-board" style={{ display: 'flex', gap: '16px' }}>
      {statuses.map((status) => (
        <TaskColumn
          key={status}
          status={status}
          tasks={tasks.filter((task) => task.status === status)}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
};
