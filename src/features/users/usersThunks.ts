// features/users/usersThunks.ts
import { AppThunk } from '../../app/store';
import { setUsers, setLoading, setError } from './usersSlice';
import axios from 'axios';

export const fetchUsers = (): AppThunk => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/users`);
    dispatch(setUsers(response.data));
  } catch (error) {
    dispatch(setError((error as Error).message));
  } finally {
    dispatch(setLoading(false));
  }
};
