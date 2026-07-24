import { vi } from 'vitest';

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_test_dummy_key'; // For unittesting

vi.mock('web-push', () => {
    const sendNotification = vi.fn((subscription) => {
        console.log('MOCK PUSH:', subscription.endpoint);

        if (subscription.endpoint.includes('410')) {
            return Promise.reject({ statusCode: 410 });
        }

        if (subscription.endpoint.includes('500')) {
            return Promise.reject({ statusCode: 500 });
        }

        return Promise.resolve({});
    });

    return {
        default: {
            sendNotification
        },
        sendNotification
    };
});