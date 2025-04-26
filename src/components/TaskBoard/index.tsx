import { useWebSocket } from '../../hooks/useWebSocket';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { updateTaskStatus } from '../../features/tasks/tasksThunks';
import { TaskColumn } from './TaskColumn';
import { ITask } from '../../types/taskTypes';
import React from 'react';

const TaskBoard: React.FC = () => {
  const { tasks, loading, error } = useAppSelector((state) => state.tasks);
  const dispatch = useAppDispatch();

  // Подключаем WebSocket
  useWebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3000');

  const statuses: ITask['status'][] = ['todo', 'in-progress', 'done'];

  const handleDrop = (taskId: string, newStatus: ITask['status']) => {
    dispatch(updateTaskStatus(taskId, newStatus));
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="task-board">
      {statuses.map((status) => (
        <TaskColumn
          key={status}
          status={status}
          tasks={tasks.filter((task: ITask) => task.status === status)}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
};

export default TaskBoard;
