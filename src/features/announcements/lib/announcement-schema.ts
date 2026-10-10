import { z } from 'zod';
import { MESSAGE_MAX, TITLE_MAX } from '../api/announcements-api';

const E = 'fm.announcements.errors';

export const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: `${E}.titleRequired` })
    .max(TITLE_MAX, { error: `${E}.titleTooLong` }),
  message: z
    .string()
    .trim()
    .min(1, { error: `${E}.messageRequired` })
    .max(MESSAGE_MAX, { error: `${E}.messageTooLong` }),
  isPinned: z.boolean(),
});

export type AnnouncementFormInput = z.input<typeof announcementSchema>;
export type AnnouncementFormValues = z.output<typeof announcementSchema>;

export const EMPTY_ANNOUNCEMENT: AnnouncementFormInput = {
  title: '',
  message: '',
  isPinned: false,
};
