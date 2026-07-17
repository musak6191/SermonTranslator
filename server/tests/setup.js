import { vi } from 'vitest';

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