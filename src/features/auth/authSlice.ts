// features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// Удалили createAsyncThunk и apiClient, если fetchUserProfile больше не нужен

interface User {
  id: string; // Google User ID (sub)
  name: string;
  email: string;
  avatar: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Удалили thunk fetchUserProfile, так как проверка токена идет на сервере при каждом запросе

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Вызывается после успешной обработки Google токена на клиенте
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    // Вызывается при выходе или ошибке аутентификации
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null; // Сбрасываем ошибку при выходе
      // Очистка localStorage происходит в компоненте, вызывающем logout,
      // но можно продублировать здесь для надежности.
      localStorage.removeItem('googleToken');
      localStorage.removeItem('user');
      // Также нужно убедиться, что заголовок Authorization удаляется из apiClient
      // Интерсептор запроса должен это делать, если токена нет.
      console.log('AuthSlice: logout action dispatched, state reset.');
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false; // Обычно ошибка означает конец загрузки
    },
  },
  // Удалили extraReducers для fetchUserProfile
});

export const { loginSuccess, logout, setAuthLoading, setAuthError } = authSlice.actions;

export default authSlice.reducer;
