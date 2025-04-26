import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const notificationsApi = {
  async sendPushNotification(notification: {
    userId: string;
    title: string;
    body: string;
  }): Promise<void> {
    await axios.post(`${API_BASE_URL}/notifications`, notification);
  },
};