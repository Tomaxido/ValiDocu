import { useEcho } from '@laravel/echo-react';

export default function NotificationCenter() {
    useEcho('documents', 'DocumentsProcessed', (e: unknown) => {
        console.log(e);
    });

    return (
        <div>
            <h2>Notification Center</h2>
        </div>
    );
}