'use client';

import { NotificationSettingsFormData, notificationSettingsSchema } from '@/lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateUserMutation } from '@/state/api';
import React from 'react';
import { useForm } from 'react-hook-form';
import Header from './Header';
import { Form } from '@/components/ui/form';
import { CustomFormField } from './CustomFormField';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

const SharedNotificationSettings = ({
  title = 'Notification Settings',
  subtitle = 'Manage your notification settings',
}: SharedNotificationSettingsProps) => {
  // const { user } = useAuthStore();
  const [updateUser] = useUpdateUserMutation();

  const user = {
    userId: 'user_2c2d3c4e5f6g7h8i9j0',
    publicMetadata: {
      settings: {
        courseNotifications: true,
        emailAlerts: true,
        smsAlerts: true,
        notificationFrequency: 'daily',
      },
    },
  };
  const currentSettings = (user?.publicMetadata as { settings?: UserSettings })?.settings || {};

  const methods = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      courseNotifications: currentSettings.courseNotifications || false,
      emailAlerts: currentSettings.emailAlerts || false,
      smsAlerts: currentSettings.smsAlerts || false,
      notificationFrequency: currentSettings.notificationFrequency || 'daily',
    },
  });

  const onSubmit = async (data: NotificationSettingsFormData) => {
    if (!user) return;

    const updatedUser = {
      userId: user.userId,
      publicMetadata: {
        ...user.publicMetadata,
        settings: {
          ...currentSettings,
          ...data,
        },
      },
    };

    try {
      await updateUser(updatedUser);
    } catch (error) {
      console.error('Failed to update user settings: ', error);
    }
  };

  if (!user) return <div>Please sign in to manage your settings.</div>;

  return (
    <div className="notification-settings">
      <Header title={title} subtitle={subtitle} />
      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="notification-settings__form">
          <div className="notification-settings__fields">
            <CustomFormField name="courseNotifications" label="Course Notifications" type="switch" />
            <CustomFormField name="emailAlerts" label="Email Alerts" type="switch" />
            <CustomFormField name="smsAlerts" label="SMS Alerts" type="switch" />

            <CustomFormField
              name="notificationFrequency"
              label="Notification Frequency"
              type="select"
              options={[
                { value: 'immediate', label: 'Immediate' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
            />
          </div>

          <Button type="submit" className="notification-settings__submit">
            Update Settings
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default SharedNotificationSettings;
