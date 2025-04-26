import React, { forwardRef } from 'react';
import { useDrag } from 'react-dnd';
import { ITask } from '../../types/taskTypes';

interface TaskItemProps {
  task: ITask;
}

export const TaskItem = forwardRef<HTMLDivElement, TaskItemProps>(({ task }, ref) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={(node) => {
        drag(node); // Подключаем drag к DOM-элементу
        if (typeof ref === 'function') {
          ref(node); // Передаем ref дальше, если он используется
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      style={{
        opacity: isDragging ? 0.5 : 1,
        padding: '12px',
        margin: '8px 0',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'move',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <p>Deadline: {new Date(task.deadline).toLocaleString()}</p>
      <p>Assignee: {task.assignee.name}</p>
    </div>
  );
});
