import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CalendarEvent, CalendarState } from '../../types/taskTypes';
import { disconnectCalendar } from './calendarThunks'; // Уберите этот импорт, если disconnectCalendar не существует

const initialState: CalendarState = {
  isIntegrated: false,
  events: [],
  loading: false,
};

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setIntegrationStatus: (state, action: PayloadAction<boolean>) => {
      state.isIntegrated = action.payload;
    },
    setCalendarEvents: (state, action: PayloadAction<CalendarEvent[]>) => {
      state.events = action.payload;
    },
    addCalendarEvent: (state, action: PayloadAction<CalendarEvent>) => {
      state.events.push(action.payload);
    },
    removeCalendarEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter((e) => e.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Перенесите extraReducers на правильный уровень
    builder.addCase(disconnectCalendar.fulfilled, (state) => {
      state.isIntegrated = false;
      state.events = [];
    });
    builder.addCase(disconnectCalendar.rejected, (state, action) => {
      console.error('Disconnect failed:', action.error);
    });
  },
});

export const {
  setIntegrationStatus,
  setCalendarEvents,
  addCalendarEvent,
  removeCalendarEvent,
  setLoading,
} = calendarSlice.actions;

export default calendarSlice.reducer;
