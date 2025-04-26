import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { createTask } from '../../features/tasks/tasksThunks';
import { ITask } from '../../types/taskTypes';
import { v4 as uuidv4 } from 'uuid';

interface TaskFormProps {
  onClose: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [formData, setFormData] = useState<Omit<ITask, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    status: 'todo',
    deadline: '',
    assignee: {
      id: user?.id || '', // ⚡ Важно: берём ID из авторизации
      name: user?.name || '', // Можно предзаполнить имя
      email: user?.email || '', // и email, если нужно
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const taskData = {
      ...formData,
      deadline: new Date(formData.deadline).toISOString(),
      assignee: {
        id: user.id,
        name: formData.assignee.name,
        email: formData.assignee.email,
      },
    };

    await dispatch(createTask(taskData));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === 'assigneeName') {
      setFormData({
        ...formData,
        assignee: {
          ...formData.assignee,
          name: value,
        },
      });
    } else if (name === 'assigneeEmail') {
      setFormData({
        ...formData,
        assignee: {
          ...formData.assignee,
          email: value,
        },
      });
    } else if (name === 'deadline') {
      // Преобразуем значение datetime-local в ISO формат с секундами и временной зоной
      const isoDate = new Date(value).toISOString();
      setFormData({
        ...formData,
        deadline: isoDate,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <h2>Create New Task</h2>

      <div className="form-group">
        <label>Title</label>
        <input type="text" name="title" value={formData.title} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea name="description" value={formData.description} onChange={handleChange} />
      </div>

      <div className="form-group">
        <label>Status</label>
        <select name="status" value={formData.status} onChange={handleChange}>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="form-group">
        <label>Deadline</label>
        <input
          type="datetime-local"
          name="deadline"
          value={formData.deadline ? formData.deadline.split('.')[0] : ''} // Убираем секунды для совместимости
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Assignee Name</label>
        <input
          type="text"
          name="assigneeName"
          value={formData.assignee.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Assignee Email</label>
        <input
          type="email"
          name="assigneeEmail"
          value={formData.assignee.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-actions">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit">Create Task</button>
      </div>
    </form>
  );
};

export default TaskForm;
