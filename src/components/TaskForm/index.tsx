import React, { useState, ChangeEvent, FormEvent } from 'react'; // Добавили типы для событий
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { createTask } from '../../features/tasks/tasksThunks';
// Импортируем только нужные типы
import { ICreateTaskPayload, TaskStatus } from '../../types/taskTypes';

interface TaskFormProps {
  onClose: () => void; // Функция для закрытия модального окна/формы
}

// Интерфейс для состояния полей формы
interface FormDataState {
  title: string;
  description: string;
  status: TaskStatus; // Используем тип TaskStatus
  deadline: string; // Храним как строку для input[datetime-local]
  assigneeName: string; // Имя исполнителя (может быть не создателем)
  assigneeEmail: string; // Email исполнителя
}

const TaskForm: React.FC<TaskFormProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  // Получаем данные текущего пользователя для предзаполнения
  const { user } = useAppSelector((state) => state.auth);

  // Инициализируем состояние формы, предзаполняя assignee текущим пользователем
  const [formData, setFormData] = useState<FormDataState>({
    title: '',
    description: '',
    status: 'todo', // Статус по умолчанию
    deadline: '', // Пустая строка для datetime-local
    assigneeName: user?.name || '', // Имя текущего пользователя
    assigneeEmail: user?.email || '', // Email текущего пользователя
  });

  // Обработчик отправки формы
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // Типизируем событие
    e.preventDefault(); // Предотвращаем стандартную отправку формы

    // Дополнительная проверка аутентификации (хотя форма не должна показываться без нее)
    if (!user) {
      alert('Authentication error. Please log in again.');
      console.error('Attempted to submit task form without authenticated user.');
      return;
    }

    // --- Формируем payload для thunk'а createTask ---
    const taskPayload: ICreateTaskPayload = {
      title: formData.title.trim(), // Убираем лишние пробелы
      description: formData.description.trim(),
      status: formData.status,
      // Преобразуем локальное время из input в ISO строку UTC
      // Проверяем, что дата выбрана
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : '',
      assignee: {
        // Отправляем имя и email, которые ввел пользователь в поля формы
        name: formData.assigneeName.trim(),
        email: formData.assigneeEmail.trim().toLowerCase(), // Email в нижнем регистре
      },
    };

    // --- Базовая валидация перед отправкой ---
    if (!taskPayload.title) {
      alert('Please enter a task title.');
      return;
    }
    if (!taskPayload.deadline) {
      alert('Please select a deadline.');
      return;
    }
    if (!taskPayload.assignee.name || !taskPayload.assignee.email) {
      alert('Please enter Assignee Name and Email.');
      return;
    }
    // Простая проверка формата email (можно улучшить)
    if (!/^\S+@\S+\.\S+$/.test(taskPayload.assignee.email)) {
      alert('Please enter a valid Assignee Email.');
      return;
    }
    // ----------------------------------------

    console.log('Submitting task payload:', JSON.stringify(taskPayload, null, 2));

    // Диспатчим thunk createTask с подготовленным payload
    // Оборачиваем в try/catch, чтобы обработать возможную ошибку из thunk'а (хотя там есть alert)
    try {
      await dispatch(createTask(taskPayload)); // unwrap выбросит ошибку, если thunk был rejected
      onClose(); // Закрываем форму ТОЛЬКО при УСПЕШНОЙ отправке
    } catch (error: any) {
      console.error('Error dispatching createTask:', error);
      // Ошибка уже должна была быть показана в alert из thunk'а
      // Можно добавить дополнительную обработку здесь при необходимости
    }
  };

  // Обработчик изменения значений в полях формы
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, // Типизируем событие
  ) => {
    const { name, value } = e.target;

    // Обновляем соответствующее поле в состоянии formData
    setFormData((prevData) => ({
      ...prevData,
      [name]: value, // Используем имя поля для обновления нужного свойства
    }));
  };

  return (
    // Добавляем novalidate, т.к. у нас своя валидация в handleSubmit
    <form onSubmit={handleSubmit} className="task-form" noValidate>
      <h2>Создать новую задачу</h2>

      {/* Title */}
      <div className="form-group">
        <label htmlFor="task-title">Заголовок</label> {/* Используем htmlFor и id */}
        <input
          id="task-title"
          type="text"
          name="title" // Должно совпадать с ключом в FormDataState
          value={formData.title}
          onChange={handleChange}
          required // HTML5 валидация (не помешает)
        />
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="task-description">Описание</label>
        <textarea
          id="task-description"
          name="description" // Должно совпадать с ключом в FormDataState
          value={formData.description}
          onChange={handleChange}
        />
      </div>

      {/* Status */}
      <div className="form-group">
        <label htmlFor="task-status">Статус</label>
        <select
          id="task-status"
          name="status" // Должно совпадать с ключом в FormDataState
          value={formData.status}
          onChange={handleChange}>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {/* Deadline */}
      <div className="form-group">
        <label htmlFor="task-deadline">Крайний срок</label>
        <input
          id="task-deadline"
          type="datetime-local"
          name="deadline" // Должно совпадать с ключом в FormDataState
          value={formData.deadline} // Используем строку напрямую
          onChange={handleChange}
          required // HTML5 валидация
        />
        {/* Можно добавить подсказку формата, если нужно */}
      </div>

      {/* Assignee Name */}
      <div className="form-group">
        {/* Изменяем Label на "Исполнитель" */}
        <label htmlFor="task-assigneeName">Исполнитель (Имя)</label>
        <input
          id="task-assigneeName"
          type="text"
          name="assigneeName" // Должно совпадать с ключом в FormDataState
          value={formData.assigneeName}
          onChange={handleChange}
          required
        />
      </div>

      {/* Assignee Email */}
      <div className="form-group">
        <label htmlFor="task-assigneeEmail">Исполнитель (Email)</label>
        <input
          id="task-assigneeEmail"
          type="email" // Используем тип email для базовой валидации браузером
          name="assigneeEmail" // Должно совпадать с ключом в FormDataState
          value={formData.assigneeEmail}
          onChange={handleChange}
          required
        />
      </div>

      {/* Action Buttons */}
      <div className="form-actions">
        <button type="button" onClick={onClose}>
          Отменить
        </button>
        <button type="submit">Создать задачу</button>
      </div>
    </form>
  );
};

export default TaskForm;
