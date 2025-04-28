import axios from 'axios';
import { ITask, ICreateTaskPayload } from '../types/taskTypes'; // Keep this if used by tasksApi methods

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor ---
// Добавляет Google ID токен к каждому запросу, если он есть
apiClient.interceptors.request.use(
  (config) => {
    const googleToken = localStorage.getItem('googleToken');
    if (googleToken) {
      // Отправляем Google ID токен как Bearer токен
      config.headers.Authorization = `Bearer ${googleToken}`;
      console.log('Interceptor: Added Google token to Authorization header.');
    } else {
      console.log('Interceptor: No Google token found in localStorage.');
      // Важно: Если токена нет, заголовок Authorization не будет установлен.
      // Сервер должен корректно обрабатывать отсутствие токена (например, возвращать 401).
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    console.error('Axios request interceptor error:', error);
    return Promise.reject(error);
  },
);

// --- Response Interceptor ---
// Можно использовать для обработки специфических ошибок, например, истекшего Google токена
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Axios response interceptor: Received 401 Unauthorized.');
      // Ошибка 401 может означать, что Google токен невалиден или истек.
      // Можно попытаться разлогинить пользователя.
      localStorage.removeItem('googleToken');
      localStorage.removeItem('user');
      // Возможно, стоит вызвать dispatch(logout()), но это сложно сделать извне React-компонентов.
      // Самый простой вариант - перезагрузить страницу или перенаправить на логин
      // window.location.href = '/login'; // или '/';
      alert('Your session has expired or is invalid. Please log in again.'); // Простое уведомление
    }
    // Возвращаем ошибку дальше, чтобы она могла быть обработана в вызывающем коде (try/catch)
    return Promise.reject(error);
  },
);

// --- API Methods ---
// Методы остаются без изменений, т.к. интерсептор добавляет аутентификацию
export const tasksApi = {
  async getAll(): Promise<ITask[]> {
    const response = await apiClient.get('/api/tasks');
    return response.data;
  },

  // Обрати внимание: Omit<ITask, '_id'> может быть неверным, если на клиенте ID - это Google 'sub'
  // Возможно, сервер ожидает другие поля для создания задачи. Адаптируй под свой TaskSchema.
  async create(taskData: ICreateTaskPayload): Promise<ITask> {
    // ID пользователя (MongoDB ID) будет добавлен сервером из проверенного токена
    const response = await apiClient.post('/api/tasks', taskData);
    return response.data;
  },

  async update(id: string, taskData: Partial<ITask>): Promise<ITask> {
    // ID здесь - это ID задачи (_id из MongoDB)
    const response = await apiClient.put(`/api/tasks/${id}`, taskData);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    // ID здесь - это ID задачи (_id из MongoDB)
    await apiClient.delete(`/api/tasks/${id}`);
  },
};
