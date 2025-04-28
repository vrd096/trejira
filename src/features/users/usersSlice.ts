// src/features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Интерфейс для данных пользователя в стейте Redux
// Убедись, что он соответствует данным, возвращаемым сервером с /api/auth/google/login и /api/users/me
// и что поле 'id' - это Google ID (sub)
interface User {
  id: string; // Google ID (sub)
  _id?: string; // MongoDB ID (опционально, если сервер возвращает)
  name: string;
  email: string;
  // avatar?: string; // Аватар решили не использовать
}

// Интерфейс для состояния среза аутентификации
interface AuthState {
  user: User | null; // Данные текущего пользователя или null
  accessToken: string | null; // JWT Access Token или null
  isAuthenticated: boolean; // Флаг аутентификации
  loading: 'idle' | 'pending'; // Статус загрузки/обработки (упрощенный)
  error: string | null; // Сообщение об ошибке
  isRefreshing: boolean; // Флаг, идет ли процесс обновления токена
}

// Начальное состояние
const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: 'idle', // Начальное состояние - не загружается
  error: null,
  isRefreshing: false,
};

const authSlice = createSlice({
  name: 'auth', // Имя среза
  initialState,
  reducers: {
    // --- Action при успешном входе ИЛИ рефреше токена ---
    // Принимает новый accessToken и опционально данные пользователя (при первом входе)
    authSuccess: (state, action: PayloadAction<{ accessToken: string; user?: User }>) => {
      console.log('AuthSlice Reducer: authSuccess called. Payload:', action.payload);
      state.accessToken = action.payload.accessToken;
      // Обновляем пользователя, только если он передан (при логине)
      if (action.payload.user) {
        state.user = action.payload.user;
        // Сохраняем пользователя в localStorage для восстановления UI при перезагрузке
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        console.log('AuthSlice Reducer: User data updated and saved to localStorage.');
      }
      state.isAuthenticated = true; // <<< Устанавливаем флаг аутентификации
      state.loading = 'idle';
      state.error = null;
      state.isRefreshing = false;
      console.log('AuthSlice Reducer: State after authSuccess:', JSON.stringify(state));
    },

    // --- Action при выходе из системы ---
    logout: (state) => {
      console.log('AuthSlice Reducer: logout called.');
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false; // <<< Сбрасываем флаг аутентификации
      state.loading = 'idle';
      state.error = null;
      state.isRefreshing = false;
      // Очищаем пользователя из localStorage
      localStorage.removeItem('user');
      // AccessToken не хранится в LS, RefreshToken удаляется сервером из cookie
      console.log('AuthSlice Reducer: State after logout:', JSON.stringify(state));
    },

    // --- Actions для управления состоянием загрузки/ошибок (вызываются из thunks) ---
    setAuthLoading: (state, action: PayloadAction<'pending' | 'idle'>) => {
      console.log('AuthSlice Reducer: setAuthLoading called. Payload:', action.payload);
      state.loading = action.payload;
      // Сбрасываем ошибку при начале загрузки
      if (action.payload === 'pending') {
        state.error = null;
      }
      // Сбрасываем флаг рефреша, если загрузка завершилась (стала 'idle')
      if (action.payload === 'idle') {
        state.isRefreshing = false;
      }
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      console.error('AuthSlice Reducer: setAuthError called. Payload:', action.payload);
      state.error = action.payload;
      state.loading = 'idle'; // Ошибка обычно означает конец загрузки
      state.isRefreshing = false; // Сбрасываем флаг рефреша при ошибке
      // Можно добавить логику сброса токена/пользователя при определенных ошибках, но лучше это делать в thunk'е
    },
    // --- Action для управления флагом процесса рефреша ---
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      console.log('AuthSlice Reducer: setRefreshing called. Payload:', action.payload);
      state.isRefreshing = action.payload;
    },
  },
  // extraReducers можно использовать для автоматической обработки состояний
  // pending/fulfilled/rejected асинхронных thunks (loginWithGoogleToken, refreshAccessToken, logoutUser),
  // но мы пока управляем loading/error вручную через setAuthLoading/setAuthError внутри thunks.
});

// Экспортируем actions
export const { authSuccess, logout, setAuthLoading, setAuthError, setRefreshing } =
  authSlice.actions;

// Экспортируем редьюсер
export default authSlice.reducer;
