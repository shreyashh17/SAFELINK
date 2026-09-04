import twilio from 'twilio';

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMSAlert(to: string, body: string): Promise<void> {
    try {
        await client.messages.create({
            from: process.env.TWILIO_FROM_NUMBER!,
            to,
            body,
        });
        console.log(`📱 SMS sent to ${to}`);
    } catch (err) {
        console.error('Twilio SMS error:', err);
    }
}

export async function sendEmergencySMS(
    userName: string,
    latitude: number,
    longitude: number,
    message: string
): Promise<void> {
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const body = `🚨 SafeLink EMERGENCY ALERT 🚨\nUser: ${userName}\nMsg: ${message}\nLocation: ${mapsLink}`;
    const emergencyNumber = process.env.ADMIN_EMERGENCY_NUMBER!;
    await sendSMSAlert(emergencyNumber, body);
}
