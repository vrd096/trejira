import { AppThunk } from '../../app/store';
import { addNotification } from './notificationsSlice';
import { notificationsApi } from '../../api/notifications';

export const sendPushNotification =
  (userId: string, title: string, message: string): AppThunk =>
  async (dispatch) => {
    try {
      await notificationsApi.sendPushNotification({
        userId,
        title,
        body: message,
      });

      dispatch(
        addNotification({
          id: Date.now().toString(),
          title,
          message,
          isRead: false,
          createdAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };
