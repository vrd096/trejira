import { useWebSocket } from '../../hooks/useWebSocket';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { updateTaskStatus } from '../../features/tasks/tasksThunks';
import { TaskColumn } from './TaskColumn';
import { ITask, TaskStatus } from '../../types/taskTypes';
import React from 'react';
import { TaskItem } from './TaskItem';

const TaskBoard: React.FC = () => {
  const { tasks, loading, error, viewMode } = useAppSelector((state) => state.tasks);
  const dispatch = useAppDispatch();

  // Подключаем WebSocket
  useWebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3000');

  const filteredTasks = tasks.filter((task) => {
    if (viewMode === 'active') {
      return !task.isHidden; // Показываем НЕ скрытые
    } else {
      // viewMode === 'hidden'
      return task.isHidden; // Показываем СКРЫТЫЕ
    }
  });

  const statuses: ITask['status'][] = ['todo', 'in-progress', 'done'];

  const handleDrop = (taskId: string, newStatus: ITask['status']) => {
    dispatch(updateTaskStatus(taskId, newStatus));
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="task-board">
      {/* Если показываем скрытые задачи, возможно, нужна только одна колонка? */}
      {viewMode === 'hidden' ? (
        <div className="task-column w-full">
          {' '}
          {/* Одна колонка для скрытых */}
          <h2 className="task-column__title">HIDDEN TASKS</h2>
          <div className="task-column__items">
            {filteredTasks.map((task: ITask) => (
              <TaskItem key={task.id} task={task} />
            ))}
            {filteredTasks.length === 0 && (
              <p className="text-gray-500 text-sm p-4">No hidden tasks.</p>
            )}
          </div>
        </div>
      ) : (
        // Рендерим колонки для активных задач
        statuses.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            // Передаем отфильтрованные задачи для этого статуса
            tasks={filteredTasks.filter((task) => task.status === status)}
            onDrop={handleDrop}
          />
        ))
      )}
    </div>
  );
};

export default TaskBoard;
