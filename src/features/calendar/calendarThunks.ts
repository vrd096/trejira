import { AppThunk } from '../../app/store';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { setIntegrationStatus, setCalendarEvents, setLoading } from './calendarSlice';
import { googleCalendar } from '../../api/googleCalendar';

// Асинхронный экшен для отключения интеграции
export const disconnectCalendar = createAsyncThunk('calendar/disconnect', async () => {
  await googleCalendar.signOut();
  return true;
});

export const initGoogleCalendar = (): AppThunk => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const { token } = await googleCalendar.initClient();

    // Сохраняем токен интеграции
    localStorage.setItem('calendarToken', token);
    dispatch(setIntegrationStatus(true));
  } catch (error) {
    console.error('Google Calendar initialization failed:', error);
    dispatch(setIntegrationStatus(false));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

export const fetchCalendarEvents = (): AppThunk => async (dispatch) => {
  try {
    dispatch(setLoading(true));

    const events = await googleCalendar.getEvents();
    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      description: event.description,
    }));

    dispatch(setCalendarEvents(formattedEvents));
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    dispatch(setCalendarEvents([]));
  } finally {
    dispatch(setLoading(false));
  }
};
