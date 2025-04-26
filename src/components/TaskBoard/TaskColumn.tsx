import React, { forwardRef } from 'react';
import { useDrop } from 'react-dnd';
import { TaskItem } from './TaskItem';
import { ITask } from '../../types/taskTypes';

interface TaskColumnProps {
  status: ITask['status'];
  tasks: ITask[];
  onDrop: (taskId: string, newStatus: ITask['status']) => void;
}

export const TaskColumn = forwardRef<HTMLDivElement, TaskColumnProps>(
  ({ status, tasks, onDrop }, ref) => {
    const [{ isOver }, drop] = useDrop(() => ({
      accept: 'TASK',
      drop: (item: { id: string }) => onDrop(item.id, status),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }));

    return (
      <div
        ref={(node) => {
          drop(node); // Подключаем drop к DOM-элементу
          if (typeof ref === 'function') {
            ref(node); // Передаем ref дальше, если он используется
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        className={`task-column ${isOver ? 'task-column--over' : ''}`}>
        <h2 className="task-column__title">{status.toUpperCase()}</h2>
        <div className="task-column__items">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </div>
    );
  },
);
