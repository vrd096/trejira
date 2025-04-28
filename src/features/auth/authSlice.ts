// src/features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string; // Google ID (sub) - получаем от сервера
  _id?: string; // MongoDB ID (если сервер возвращает)
  name: string;
  email: string;
  // avatar?: string; // Аватар опционален
}

interface AuthState {
  user: User | null;
  accessToken: string | null; // <<< Храним Access Token здесь
  isAuthenticated: boolean; // Рассчитывается на основе accessToken и user
  loading: 'idle' | 'pending' | 'failed'; // Используем строки для статуса загрузки
  error: string | null;
  isRefreshing: boolean; // Флаг для предотвращения гонки рефреша
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: 'idle',
  error: null,
  isRefreshing: false, // Начальное состояние флага рефреша
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Успешный вход или рефреш
    authSuccess: (state, action: PayloadAction<{ accessToken: string; user?: User }>) => {
      state.accessToken = action.payload.accessToken;
      // Обновляем пользователя, если он пришел (обычно при логине)
      if (action.payload.user) {
        state.user = action.payload.user;
        // Сохраняем пользователя в localStorage для быстрого восстановления UI
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      }
      state.isAuthenticated = true;
      state.loading = 'idle';
      state.error = null;
      state.isRefreshing = false;
      console.log('AuthSlice: authSuccess - isAuthenticated: true');
    },
    // Выход из системы
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loading = 'idle';
      state.error = null;
      state.isRefreshing = false;
      // Очищаем localStorage
      localStorage.removeItem('user');
      // localStorage.removeItem('accessToken'); // Access не храним в LS
      // Refresh Token удаляется сервером из cookie
      console.log('AuthSlice: logout - isAuthenticated: false');
    },
    // Установка состояния загрузки
    setAuthLoading: (state, payload: PayloadAction<'pending' | 'idle' | 'failed'>) => {
      state.loading = payload.payload;
      if (payload.payload !== 'pending') {
        state.isRefreshing = false; // Сбрасываем флаг рефреша при завершении
      }
    },
    // Установка ошибки
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = 'failed'; // Ошибка обычно означает конец загрузки
      state.isRefreshing = false;
    },
    // Установка флага рефреша
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },
  },
  // Можно добавить extraReducers для обработки pending/rejected состояний thunks
});

export const { authSuccess, logout, setAuthLoading, setAuthError, setRefreshing } =
  authSlice.actions;
export default authSlice.reducer;
