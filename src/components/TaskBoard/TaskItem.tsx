import React, { forwardRef } from 'react';
import { useDrag } from 'react-dnd';
import { ITask } from '../../types/taskTypes';
import { deleteTaskThunk, setTaskVisibilityThunk } from '../../features/tasks/tasksThunks';
import { useAppDispatch } from '../../app/hooks';

interface TaskItemProps {
  task: ITask;
}

export const TaskItem = forwardRef<HTMLDivElement, TaskItemProps>(({ task }, ref) => {
  const dispatch = useAppDispatch();
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  // Обработчик кнопки "Завершить"
  const handleCompleteClick = (e: React.MouseEvent) => {
    console.log('handleCompleteClick triggered for task:', task.id);
    e.stopPropagation(); // Остановить всплытие, чтобы не мешать drag-n-drop
    if (window.confirm(`Are you sure you want to complete (delete) task "${task.title}"?`)) {
      console.log(`Completing task: ${task.id}`);
      dispatch(deleteTaskThunk(task.id));
    }
  };

  // Обработчик кнопки "Скрыть" / "Показать"
  const handleHideToggleClick = (e: React.MouseEvent) => {
    console.log('handleHideToggleClick triggered for task:', task.id);
    e.stopPropagation();
    const newHiddenStatus = !task.isHidden;
    console.log(`${newHiddenStatus ? 'Hiding' : 'Showing'} task: ${task.id}`);
    dispatch(setTaskVisibilityThunk({ taskId: task.id, isHidden: newHiddenStatus }));
  };

  const hideButtonText = task.isHidden ? 'Show' : 'Hide';

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
      className={`task-item ${
        isDragging ? 'opacity-50' : ''
      } bg-white p-3 my-2 border border-gray-200 rounded shadow-sm cursor-move relative group`} // Добавлен group для hover эффектов кнопок
      style={
        {
          /* Убраны инлайн стили, лучше использовать классы */
        }
      }>
      <h3 className="font-semibold text-md mb-1">{task.title}</h3>
      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
      <p className="text-xs text-gray-500 mb-1">
        Deadline: {new Date(task.deadline).toLocaleString()}
      </p>
      <p className="text-xs text-gray-500">Assignee: {task.assignee.name}</p>
      {/* --- Кнопки управления --- */}
      {/* Показываем кнопки при наведении на карточку (пример) */}
      <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Кнопка Скрыть/Показать */}
        <button
          onClick={handleHideToggleClick}
          title={hideButtonText}
          className="p-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-gray-400">
          {/* Можно иконку глаза */}
          {hideButtonText}
        </button>
        {/* Кнопка Завершить (только если не скрыта?) */}
        {!task.isHidden && (
          <button
            onClick={handleCompleteClick}
            title="Complete Task"
            className="p-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded focus:outline-none focus:ring-1 focus:ring-red-400">
            {/* Можно иконку галочки или корзины */}
            Done
          </button>
        )}
      </div>
    </div>
  );
});
