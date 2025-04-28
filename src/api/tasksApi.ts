// src/api/tasksApi.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
// Импортируем store напрямую или через отдельный модуль
import { store } from '../app/store';
import { refreshAccessToken } from '../features/auth/authThunks'; // Импорт thunk'а рефреша
// import { logout } from '../features/auth/authSlice'; // logout вызывается внутри refreshAccessToken при ошибке

// Импорт типов, если они нужны для tasksApi методов
import { ITask, ICreateTaskPayload } from '../types/taskTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Создаем экземпляр Axios
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // ВАЖНО для отправки/получения HttpOnly cookie (refreshToken)
});

// --- Request Interceptor ---
// Добавляет Access Token к каждому запросу
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = store.getState().auth.accessToken;
    // console.log("Request Interceptor - Token:", accessToken ? "Present" : "Absent"); // Отладка
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Response Interceptor (для обработки 401 и рефреша токена) ---

// Флаг, указывающий, идет ли процесс обновления токена
let isRefreshing = false;
// Очередь для хранения запросов, которые получили 401 во время рефреша
// Каждый элемент - это функция, которая будет вызвана для повтора запроса
let failedQueue: Array<(token: string | null) => void> = [];

// Функция для обработки очереди запросов после завершения рефреша
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom(null); // Сигнализируем об ошибке (можно было бы передать и саму ошибку)
    } else {
      prom(token); // Сигнализируем об успехе (токен здесь не обязателен)
    }
  });
  failedQueue = []; // Очищаем очередь
};

apiClient.interceptors.response.use(
  (response) => {
    // Если ответ успешный, просто возвращаем его
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const requestUrl = originalRequest.url;

    // Определяем, является ли запрос запросом на аутентификацию/рефреш
    const isAuthRoute = requestUrl?.includes('/api/auth/');

    // --- Логика обработки 401 Unauthorized ---
    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      // Если уже идет рефреш, добавляем промис в очередь
      if (isRefreshing) {
        console.log(`Response Interceptor: Refresh in progress, queuing request: ${requestUrl}`);
        return new Promise((resolve, reject) => {
          // --- Логика добавления в очередь ---
          // Добавляем функцию, которая будет вызвана из processQueue
          failedQueue.push((newToken) => {
            // newToken здесь не используется, но можно передавать
            if (newToken !== null) {
              // Если рефреш прошел успешно
              console.log(`Response Interceptor: Resolving queued request: ${requestUrl}`);
              resolve(apiClient(originalRequest)); // Повторяем запрос с НОВЫМ токеном
            } else {
              // Если рефреш НЕ прошел успешно
              console.log(
                `Response Interceptor: Rejecting queued request due to refresh failure: ${requestUrl}`,
              );
              reject(error); // Отклоняем промис оригинального запроса
            }
          });
          // ---------------------------------
        });
      }

      // Помечаем запрос как повторный и начинаем процесс рефреша
      originalRequest._retry = true;
      isRefreshing = true;
      console.log(
        `Response Interceptor: Received 401 for ${requestUrl}, starting token refresh...`,
      );

      try {
        // Вызываем thunk для обновления токена
        // Он вернет { accessToken, user } при успехе или выбросит ошибку
        const refreshResult = await store.dispatch(refreshAccessToken()).unwrap();
        const newAccessToken = refreshResult.accessToken; // Получаем новый токен из результата thunk'а

        console.log(`Response Interceptor: Token refresh successful for ${requestUrl}.`);
        // Обрабатываем очередь УСПЕШНО, передавая новый токен (хотя он не используется в processQueue)
        processQueue(null, newAccessToken);

        // Повторяем оригинальный запрос (новый токен будет добавлен Request Interceptor'ом)
        console.log(`Response Interceptor: Retrying original request: ${requestUrl}`);
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        console.error(
          `Response Interceptor: Token refresh failed for ${requestUrl}:`,
          refreshError,
        );
        // Обрабатываем очередь С ОШИБКОЙ
        processQueue(refreshError, null);
        // logout будет вызван внутри thunk'а refreshAccessToken при ошибке
        // alert("Your session has expired. Please log in again."); // Можно убрать, если logout обрабатывает UI
        // Отклоняем промис оригинального запроса
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // Сбрасываем флаг в любом случае
      }
    } else if (status === 401 && isAuthRoute) {
      // Если 401 пришел с роута /api/auth/..., не пытаемся рефрешить
      console.warn(
        `Response Interceptor: Received 401 for auth route (${requestUrl}). Passing error.`,
      );
    }

    // Для всех других ошибок или повторных запросов пробрасываем ошибку дальше
    return Promise.reject(error);
  },
);
// ----------------------------------------------------------------

// --- Экспорт методов API ---
export const tasksApi = {
  async getAll(): Promise<ITask[]> {
    const response = await apiClient.get<ITask[]>('/api/tasks');
    return response.data;
  },

  async create(taskData: ICreateTaskPayload): Promise<ITask> {
    const response = await apiClient.post<ITask>('/api/tasks', taskData);
    return response.data;
  },

  async update(id: string, taskData: Partial<ITask>): Promise<ITask> {
    const response = await apiClient.put<ITask>(`/api/tasks/${id}`, taskData);
    return response.data;
  },

  // Тип ответа от сервера для delete
  async delete(id: string): Promise<{ message: string; deletedTaskId: string }> {
    const response = await apiClient.delete<{ message: string; deletedTaskId: string }>(
      `/api/tasks/${id}`,
    );
    return response.data;
  },
};
