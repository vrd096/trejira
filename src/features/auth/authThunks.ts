// src/features/auth/authThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../api/tasksApi'; // Путь к твоему apiClient
// Импортируем actions из authSlice
import { authSuccess, logout, setAuthLoading, setAuthError, setRefreshing } from './authSlice';
// Импортируем типы для dispatch и state
import { AppDispatch, RootState } from '../../app/store';

// --- Тип для данных пользователя (согласованный с сервером и authSlice) ---
// Убедись, что этот интерфейс соответствует тому, что ВОЗВРАЩАЕТ СЕРВЕР
// и тому, что ОЖИДАЕТ authSlice
interface UserData {
  id: string; // Google ID (sub)
  _id?: string; // MongoDB ID (опционально)
  name: string;
  email: string;
  // avatar?: string; // Убрали, так как решили не использовать
}
// ----------------------------------------------------------------------

// Тип ответа от эндпоинта /api/auth/google/login
interface LoginResponse {
  accessToken: string;
  user: UserData; // Используем наш интерфейс UserData
}

// Тип ответа от эндпоинта /api/auth/refresh
// СЕРВЕР ТЕПЕРЬ ВОЗВРАЩАЕТ И ПОЛЬЗОВАТЕЛЯ ТОЖЕ (по Варианту А)
interface RefreshResponse {
  accessToken: string;
  user: UserData; // Используем наш интерфейс UserData
}

// --- Thunk для обмена Google Token на JWT ---
export const loginWithGoogleToken = createAsyncThunk<
  LoginResponse, // Тип успешного результата (fulfilled)
  string, // Тип входящего аргумента (googleToken)
  {
    // Типы для thunkAPI
    dispatch: AppDispatch;
    rejectValue: { message: string }; // Тип возвращаемого значения при ошибке (rejected)
  }
>(
  'auth/loginWithGoogleToken', // Имя action'а
  async (googleToken, { dispatch, rejectWithValue }) => {
    dispatch(setAuthLoading('pending')); // Устанавливаем статус загрузки
    try {
      console.log('Thunk loginWithGoogleToken: Sending Google token to /api/auth/google/login');
      // Выполняем POST запрос с Google ID токеном
      const response = await apiClient.post<LoginResponse>('/api/auth/google/login', {
        token: googleToken,
      });
      console.log('Thunk loginWithGoogleToken: Received response:', response.data);

      const { accessToken, user } = response.data;
      // Проверяем, что сервер вернул ожидаемые данные
      if (!accessToken || !user || !user.id) {
        // Проверяем и user.id
        throw new Error('Invalid response structure from login endpoint');
      }

      // --- Сохраняем пользователя в localStorage ---
      // Сохраняем до диспатча authSuccess на случай, если он понадобится сразу
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Thunk loginWithGoogleToken: User data saved to localStorage.');
      // --------------------------------------------

      // --- Диспатчим успех с токеном и пользователем ---
      dispatch(authSuccess({ accessToken, user }));
      // -----------------------------------------------

      return response.data; // Возвращаем данные для обработки в .then() или fulfilled
    } catch (error: any) {
      console.error('Thunk loginWithGoogleToken failed:', error);
      const message =
        error.response?.data?.message || error.message || 'Google login failed on server';
      dispatch(setAuthError(message)); // Устанавливаем ошибку в стейт
      dispatch(logout()); // Разлогиниваем пользователя при любой ошибке входа
      return rejectWithValue({ message }); // Возвращаем ошибку для обработки в .catch() или rejected
    }
    // finally блок не нужен, так как setAuthLoading('idle') вызывается в authSuccess/logout/setAuthError
  },
);

// --- Thunk для обновления Access Token ---
export const refreshAccessToken = createAsyncThunk<
  RefreshResponse, // Тип успешного результата
  void, // Нет входящих аргументов
  {
    // Типы для thunkAPI
    dispatch: AppDispatch;
    state: RootState;
    rejectValue: { message: string };
  }
>('auth/refreshAccessToken', async (_, { dispatch, getState, rejectWithValue }) => {
  // --- Предотвращаем гонку запросов на рефреш ---
  if (getState().auth.isRefreshing) {
    console.log('Thunk refreshAccessToken: Refresh already in progress, skipping.');
    // return rejectWithValue({ message: 'Refresh already in progress' });
  }
  // ---------------------------------------------

  dispatch(setRefreshing(true)); // Устанавливаем флаг, что рефреш начался
  dispatch(setAuthLoading('pending')); // Устанавливаем общий статус загрузки

  try {
    console.log('Thunk refreshAccessToken: Attempting to refresh token via /api/auth/refresh');
    // Выполняем POST запрос (cookie отправится автоматически)
    const response = await apiClient.post<RefreshResponse>('/api/auth/refresh');
    console.log('Thunk refreshAccessToken: Received response:', response.data);

    // --- Получаем новый токен И ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ---
    const { accessToken, user } = response.data;
    // -------------------------------------------------
    if (!accessToken || !user || !user.id) {
      // Проверяем и токен, и пользователя
      throw new Error('Invalid response structure from refresh endpoint');
    }

    // --- Диспатчим authSuccess с новым токеном и пользователем ---
    dispatch(authSuccess({ accessToken, user }));
    // ----------------------------------------------------------

    // --- Обновляем localStorage['user'] ---
    localStorage.setItem('user', JSON.stringify(user));
    console.log('Thunk refreshAccessToken: User data updated in localStorage.');
    // -------------------------------------

    return response.data; // Возвращаем для fulfilled
  } catch (error: any) {
    console.error('Thunk refreshAccessToken failed:', error);
    const message = error.response?.data?.message || error.message || 'Failed to refresh session';
    dispatch(setAuthError(message)); // Устанавливаем ошибку
    // --- ВАЖНО: Разлогиниваем, если рефреш не удался ---
    // Это означает, что Refresh Token невалиден или истек
    dispatch(logout());
    // -------------------------------------------------
    return rejectWithValue({ message }); // Возвращаем ошибку
  } finally {
    dispatch(setRefreshing(false)); // Сбрасываем флаг рефреша
    dispatch(setAuthLoading('idle')); // Сбрасываем общий статус загрузки
  }
});

// --- Thunk для выхода ---
export const logoutUser = createAsyncThunk<
  void, // Ничего не возвращаем при успехе
  void, // Нет входящих аргументов
  {
    // Типы для thunkAPI
    dispatch: AppDispatch;
    rejectValue: { message: string }; // Тип ошибки (хотя мы его не используем активно)
  }
>('auth/logoutUser', async (_, { dispatch, rejectWithValue }) => {
  dispatch(setAuthLoading('pending')); // Показываем загрузку на время запроса
  try {
    console.log('Thunk logoutUser: Sending request to /api/auth/logout');
    // Выполняем запрос на сервер для инвалидации Refresh Token и очистки cookie
    await apiClient.post('/api/auth/logout');
    console.log('Thunk logoutUser: Logout successful on server.');
    // Возвращать здесь ничего не нужно
  } catch (error: any) {
    console.error('Thunk logoutUser failed on server:', error);
    // Ошибка на сервере при выходе не так критична,
    // все равно выходим на клиенте. Можно просто залогировать.
    // Можно вернуть rejectWithValue, если нужно как-то обработать эту ошибку особо.
    // return rejectWithValue({ message: error.message || 'Server logout failed' });
  } finally {
    // --- Выходим из системы на клиенте ВНЕ ЗАВИСИМОСТИ от ответа сервера ---
    dispatch(logout()); // Диспатчит сброс стейта и очистку localStorage
    dispatch(setAuthLoading('idle')); // Убираем статус загрузки
    // ----------------------------------------------------------------------
  }
});
